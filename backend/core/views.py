import uuid
import csv
import hashlib
import secrets
import datetime
from datetime import timedelta, datetime
from decimal import Decimal
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction
from django.db.models import Q, Sum, Avg, Max, Min
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken

from .models import (
    Organization, UserProfile, Facility, FacilityAccess, Meter,
    EnergyReading, UtilityBill, EnergySource, RenewableAsset, Alert,
    Invitation, PasswordResetToken, Notification, AuditLog, IntegrationCredential,
    TariffPlan, TariffRate, TariffTimePeriod, DemandChargeRule, UtilityBillDocument,
    ForecastRecord, DemandResponseEvent, Device, StorageAsset, OptimizationRecommendation, ScenarioSimulation
)
from .serializers import (
    OrganizationSerializer, UserProfileSerializer, UserManagementSerializer,
    FacilitySerializer, FacilityAccessSerializer, MeterSerializer,
    EnergyReadingSerializer, UtilityBillSerializer, EnergySourceSerializer,
    RenewableAssetSerializer, AlertSerializer, InvitationSerializer,
    NotificationSerializer, AuditLogSerializer, IntegrationCredentialSerializer,
    TariffPlanSerializer, TariffRateSerializer, TariffTimePeriodSerializer,
    DemandChargeRuleSerializer, UtilityBillDocumentSerializer,
    ForecastRecordSerializer, DemandResponseEventSerializer, DeviceSerializer,
    StorageAssetSerializer, OptimizationRecommendationSerializer, ScenarioSimulationSerializer
)
from .permissions import IsOrgAdmin, IsOrgFacilityManagerOrAdmin, IsOrgAnalystOrAbove, IsReadOnlyOrFacilityManagerAdmin
from .utils import broadcast_org_event, create_audit_log
from .services.analytics import (
    calculate_energy_summary, get_timeseries_analytics, get_demand_analytics,
    get_facility_comparison, get_source_breakdown, get_energy_intensity, get_data_quality_report
)
from .services.data_quality import evaluate_reading_quality
from .services.anomaly import detect_and_handle_anomalies
from .services.date_utils import parse_date_range
from .services.billing import calculate_bill_for_facility, compare_tariff_scenarios, quantize_money
from .services.reconciliation import reconcile_utility_bill
from .services.ocr_provider import UtilityBillOCRProvider
from .services.forecasting import ForecastEngine, evaluate_forecast_accuracy, predict_peak_demand
from .services.device_adapters import evaluate_device_health, get_adapter_for_protocol
from .services.optimization import generate_optimization_recommendations, simulate_energy_scenario

# ----------------------------------------------------------------------
# 1. AUTHENTICATION API ENDPOINTS
# ----------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def register_user(request):
    """
    POST /api/auth/register/
    Registers a new organization and admin user, returns JWT token pair & user info.
    """
    full_name = request.data.get('full_name', '').strip()
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    confirm_password = request.data.get('confirm_password', '')
    org_name = request.data.get('organization_name', '').strip()
    accept_terms = request.data.get('accept_terms', False)

    if not email or not password or not org_name:
        return Response({'error': 'Full name, email, password, and organization name are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 8:
        return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    if not accept_terms:
        return Response({'error': 'You must accept the Terms and Conditions to proceed.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
        return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Create unique organization code
            base_code = org_name.upper().replace(' ', '-')[:20]
            code = f"{base_code}-{uuid.uuid4().hex[:4].upper()}"

            org = Organization.objects.create(
                name=org_name,
                code=code
            )

            # Split name
            name_parts = full_name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            profile = UserProfile.objects.create(
                user=user,
                organization=org,
                role='admin',
                department='Executive / Operations'
            )

            # Create baseline facility for onboarding
            facility = Facility.objects.create(
                organization=org,
                name=f"{org_name} Primary Facility",
                facility_type='commercial',
                address='100 Corporate Way',
                city='Austin',
                state='TX',
                square_footage=75000,
                baseline_kwh_sqft=14.00
            )
            FacilityAccess.objects.create(user=user, facility=facility)

            # Audit log
            create_audit_log(org, user, 'organization_registered', 'Organization', org.id, {'email': email}, request)

            # Generate JWT pair
            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'Organization and user registered successfully.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserProfileSerializer(profile).data,
                'organization': OrganizationSerializer(org).data
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': f'Registration failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def login_user(request):
    """
    POST /api/auth/login/
    Validates user credentials, returns JWT pair & user profile payload.
    """
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    if not email or not password:
        return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
    if not user:
        return Response({'error': 'Invalid credentials provided.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({'error': 'This user account has been disabled. Please contact your organization administrator.'}, status=status.HTTP_403_FORBIDDEN)

    if not user.check_password(password):
        return Response({'error': 'Invalid credentials provided.'}, status=status.HTTP_401_UNAUTHORIZED)

    profile = getattr(user, 'profile', None)
    if not profile:
        org = Organization.objects.first()
        if not org:
            org = Organization.objects.create(name="Default Organization", code="DEFAULT-ORG")
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'organization': org,
                'role': 'admin' if (user.is_superuser or user.is_staff) else 'viewer',
                'department': 'General Operations'
            }
        )

    # Update last login
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])

    refresh = RefreshToken.for_user(user)

    if profile and profile.organization:
        create_audit_log(profile.organization, user, 'user_login', 'User', user.id, {}, request)

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(profile).data,
        'organization': OrganizationSerializer(profile.organization).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    POST /api/auth/logout/
    Blacklists the refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        create_audit_log(request.user.profile.organization, request.user, 'user_logout', 'User', request.user.id, {}, request)
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'message': 'Logged out.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    GET /api/auth/me/
    Returns current authenticated user details and organization payload.
    """
    profile = request.user.profile
    return Response({
        'user': UserProfileSerializer(profile).data,
        'organization': OrganizationSerializer(profile.organization).data
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    PATCH /api/auth/profile/
    Updates profile details (first_name, last_name, phone, department).
    """
    user = request.user
    profile = user.profile

    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    phone = request.data.get('phone')
    department = request.data.get('department')

    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    user.save(update_fields=['first_name', 'last_name'])

    if phone is not None:
        profile.phone = phone
    if department is not None:
        profile.department = department
    profile.save(update_fields=['phone', 'department'])

    create_audit_log(profile.organization, user, 'profile_updated', 'UserProfile', profile.id, {}, request)

    return Response(UserProfileSerializer(profile).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/auth/change-password/
    Validates current password and updates to new password.
    """
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not old_password or not new_password:
        return Response({'error': 'Current and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.check_password(old_password):
        return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()

    create_audit_log(request.user.profile.organization, request.user, 'password_changed', 'User', request.user.id, {}, request)

    return Response({'message': 'Password updated successfully.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def forgot_password(request):
    """
    POST /api/auth/forgot-password/
    Generates a password reset token and creates reset record.
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        token_obj = PasswordResetToken.objects.create(user=user)
        # Log email dispatch abstraction notice
        print(f"[Email Service Abstraction] Password reset link for {email}: http://localhost:5173/reset-password?token={token_obj.token}")
    except User.DoesNotExist:
        pass  # Security: Do not reveal if email exists

    return Response({'message': 'If an account exists for this email, password reset instructions have been generated.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def reset_password(request):
    """
    POST /api/auth/reset-password/
    Resets user password using a valid reset token.
    """
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not token or not new_password:
        return Response({'error': 'Reset token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reset_obj = PasswordResetToken.objects.get(token=token, is_used=False)
        if not reset_obj.is_valid():
            return Response({'error': 'Password reset token has expired or is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_obj.user
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        reset_obj.is_used = True
        reset_obj.save()

        create_audit_log(user.profile.organization, user, 'password_reset_completed', 'User', user.id, {}, request)

        return Response({'message': 'Password has been reset successfully. You may now sign in.'})
    except PasswordResetToken.DoesNotExist:
        return Response({'error': 'Invalid or expired password reset token.'}, status=status.HTTP_400_BAD_REQUEST)


# ----------------------------------------------------------------------
# 2. MULTI-TENANT DOMAIN VIEWSETS
# ----------------------------------------------------------------------

class MultiTenantModelViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet enforcing strict multi-tenant organization queryset isolation.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = self.request.user.profile.organization
        model_name = self.queryset.model.__name__

        if hasattr(self.queryset.model, 'organization'):
            return self.queryset.filter(organization=org)
        elif hasattr(self.queryset.model, 'facility'):
            return self.queryset.filter(facility__organization=org)
        elif hasattr(self.queryset.model, 'meter'):
            return self.queryset.filter(meter__facility__organization=org)
        return self.queryset.none()

class FacilityViewSet(MultiTenantModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [IsAuthenticated, IsOrgAnalystOrAbove]

    def perform_create(self, serializer):
        if self.request.user.profile.role not in ['admin', 'facility_manager']:
            self.permission_denied(self.request, message="Only Admins and Facility Managers can register facilities.")
        facility = serializer.save(organization=self.request.user.profile.organization)
        create_audit_log(self.request.user.profile.organization, self.request.user, 'facility_created', 'Facility', facility.id, {'name': facility.name}, self.request)

class MeterViewSet(MultiTenantModelViewSet):
    queryset = Meter.objects.all()
    serializer_class = MeterSerializer
    permission_classes = [IsAuthenticated, IsOrgAnalystOrAbove]

    def perform_create(self, serializer):
        if self.request.user.profile.role not in ['admin', 'facility_manager']:
            self.permission_denied(self.request, message="Only Admins and Facility Managers can provision meters.")
        meter = serializer.save()
        create_audit_log(self.request.user.profile.organization, self.request.user, 'meter_created', 'Meter', meter.id, {'name': meter.name}, self.request)

class EnergyReadingViewSet(MultiTenantModelViewSet):
    queryset = EnergyReading.objects.all()
    serializer_class = EnergyReadingSerializer
    permission_classes = [IsAuthenticated, IsOrgAnalystOrAbove]

class UtilityBillViewSet(MultiTenantModelViewSet):
    queryset = UtilityBill.objects.all()
    serializer_class = UtilityBillSerializer
    permission_classes = [IsAuthenticated, IsOrgAnalystOrAbove]

class RenewableAssetViewSet(MultiTenantModelViewSet):
    queryset = RenewableAsset.objects.all()
    serializer_class = RenewableAssetSerializer
    permission_classes = [IsAuthenticated, IsOrgAnalystOrAbove]

class AlertViewSet(MultiTenantModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        alert = serializer.save()
        if alert.is_resolved:
            create_audit_log(self.request.user.profile.organization, self.request.user, 'alert_resolved', 'Alert', alert.id, {'title': alert.title}, self.request)
            broadcast_org_event(
                self.request.user.profile.organization.id,
                'alert.resolved',
                AlertSerializer(alert).data
            )


# ----------------------------------------------------------------------
# 3. DASHBOARD OVERVIEW API (Multi-Tenant Scoped)
# ----------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    """
    Returns aggregated KPIs, time-series, facility breakdown, and alert feed.
    Strictly scoped to request.user.profile.organization!
    """
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')

    fac_clean = facility_id if (facility_id and str(facility_id).lower() not in ['all', 'null', 'undefined', 'none', '']) else None

    facilities_qs = Facility.objects.filter(organization=org)
    if fac_clean:
        facilities_qs = facilities_qs.filter(id=fac_clean)

    total_facilities = facilities_qs.count()
    active_meters = Meter.objects.filter(facility__in=facilities_qs, status='online').count()

    summary = calculate_energy_summary(org, facility_id, date_range, start_str, end_str)
    ts_data = get_timeseries_analytics(org, facility_id, None, date_range, start_str, end_str)
    facility_cmp = get_facility_comparison(org, date_range, start_str, end_str)
    demand_data = get_demand_analytics(org, facility_id, None, date_range, start_str, end_str)
    
    alerts_qs = Alert.objects.filter(facility__organization=org, is_resolved=False)[:5]
    alerts_data = AlertSerializer(alerts_qs, many=True).data

    return Response({
        "organization": org.name,
        "facility_filter": facility_id or "all",
        "date_range": date_range,
        "metrics_summary": {
            "total_facilities": total_facilities,
            "active_meters": active_meters,
            "grid_reliability_index": "99.94%"
        },
        "kpis": summary["kpis"],
        "charts": {
            "consumption_series": ts_data["series"],
            "facility_breakdown": facility_cmp,
            "peak_demand_profile": demand_data["profile"],
        },
        "recent_alerts": alerts_data
    })


# ----------------------------------------------------------------------
# 4. USER MANAGEMENT & INVITATIONS API (Admins Only)
# ----------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def users_list(request):
    """
    GET /api/users/
    Lists all users belonging to the current organization.
    """
    profiles = UserProfile.objects.filter(organization=request.user.profile.organization).select_related('user')
    return Response(UserManagementSerializer(profiles, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def invite_user(request):
    """
    POST /api/users/invite/
    Sends an invitation to join the organization.
    """
    email = request.data.get('email', '').strip().lower()
    role = request.data.get('role', 'facility_manager')
    facility_ids = request.data.get('facility_ids', [])

    if not email:
        return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if role not in ['admin', 'facility_manager', 'analyst', 'viewer']:
        return Response({'error': 'Invalid role specified.'}, status=status.HTTP_400_BAD_REQUEST)

    org = request.user.profile.organization

    # Check if user already exists in organization
    if UserProfile.objects.filter(organization=org, user__email=email).exists():
        return Response({'error': 'A user with this email is already a member of your organization.'}, status=status.HTTP_400_BAD_REQUEST)

    invitation = Invitation.objects.create(
        organization=org,
        email=email,
        role=role,
        invited_by=request.user
    )

    if facility_ids:
        facilities = Facility.objects.filter(organization=org, id__in=facility_ids)
        invitation.facilities.set(facilities)

    create_audit_log(org, request.user, 'user_invited', 'Invitation', invitation.id, {'email': email, 'role': role}, request)

    print(f"[Email Service Abstraction] Invitation sent to {email}: http://localhost:5173/invite/{invitation.token}")

    return Response({
        'message': f'Invitation created for {email}.',
        'invitation': InvitationSerializer(invitation).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def get_invitation_details(request, token):
    """
    GET /api/invitations/{token}/
    Returns invitation validation status.
    """
    try:
        invitation = Invitation.objects.get(token=token)
        if not invitation.is_valid():
            return Response({'error': 'This invitation has expired or has already been accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InvitationSerializer(invitation).data)
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid invitation token.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def accept_invitation(request):
    """
    POST /api/invitations/accept/
    Creates user account and associates with organization.
    """
    token = request.data.get('token')
    full_name = request.data.get('full_name', '').strip()
    password = request.data.get('password', '')

    if not token or not password:
        return Response({'error': 'Token and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invitation = Invitation.objects.get(token=token)
        if not invitation.is_valid():
            return Response({'error': 'This invitation has expired or has already been accepted.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            name_parts = full_name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            user = User.objects.create_user(
                username=invitation.email,
                email=invitation.email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            profile = UserProfile.objects.create(
                user=user,
                organization=invitation.organization,
                role=invitation.role,
                department='Operations'
            )

            # Assign facility permissions
            for fac in invitation.facilities.all():
                FacilityAccess.objects.get_or_create(user=user, facility=fac)

            invitation.is_accepted = True
            invitation.save()

            create_audit_log(invitation.organization, user, 'invitation_accepted', 'User', user.id, {'email': user.email}, request)

            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'Account created and invitation accepted successfully.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserProfileSerializer(profile).data,
                'organization': OrganizationSerializer(invitation.organization).data
            })

    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid invitation token.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def update_user_role(request, user_id):
    """
    PATCH /api/users/{user_id}/
    Updates a user's role or department.
    """
    org = request.user.profile.organization
    try:
        profile = UserProfile.objects.get(organization=org, user_id=user_id)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User not found in your organization.'}, status=status.HTTP_404_NOT_FOUND)

    new_role = request.data.get('role')
    new_dept = request.data.get('department')

    if new_role:
        if new_role not in ['admin', 'facility_manager', 'analyst', 'viewer']:
            return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent admin from removing their own admin role if sole admin
        if profile.user == request.user and new_role != 'admin':
            admin_count = UserProfile.objects.filter(organization=org, role='admin', user__is_active=True).count()
            if admin_count <= 1:
                return Response({'error': 'Cannot revoke your own admin rights as you are the sole administrator.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.role = new_role

    if new_dept is not None:
        profile.department = new_dept

    profile.save()

    create_audit_log(org, request.user, 'user_role_updated', 'UserProfile', profile.id, {'target_user': profile.user.username, 'new_role': profile.role}, request)

    return Response(UserManagementSerializer(profile).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def disable_user(request, user_id):
    """
    POST /api/users/{user_id}/disable/
    Disables a user account.
    """
    org = request.user.profile.organization
    try:
        profile = UserProfile.objects.get(organization=org, user_id=user_id)
        if profile.user == request.user:
            return Response({'error': 'You cannot disable your own administrator account.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.user.is_active = False
        profile.user.save()

        create_audit_log(org, request.user, 'user_disabled', 'User', profile.user.id, {'disabled_user': profile.user.email}, request)
        return Response({'message': f'User {profile.user.email} disabled.'})
    except UserProfile.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def enable_user(request, user_id):
    """
    POST /api/users/{user_id}/enable/
    Enables a user account.
    """
    org = request.user.profile.organization
    try:
        profile = UserProfile.objects.get(organization=org, user_id=user_id)
        profile.user.is_active = True
        profile.user.save()

        create_audit_log(org, request.user, 'user_enabled', 'User', profile.user.id, {'enabled_user': profile.user.email}, request)
        return Response({'message': f'User {profile.user.email} enabled.'})
    except UserProfile.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


# ----------------------------------------------------------------------
# 5. FACILITY ACCESS PERMISSIONS API
# ----------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def facility_access_list(request):
    org = request.user.profile.organization
    if request.method == 'GET':
        accesses = FacilityAccess.objects.filter(facility__organization=org)
        return Response(FacilityAccessSerializer(accesses, many=True).data)
    elif request.method == 'POST':
        user_id = request.data.get('user_id')
        facility_id = request.data.get('facility_id')

        try:
            target_user = User.objects.get(profile__organization=org, id=user_id)
            target_facility = Facility.objects.get(organization=org, id=facility_id)
            access, created = FacilityAccess.objects.get_or_create(user=target_user, facility=target_facility)
            create_audit_log(org, request.user, 'facility_access_granted', 'FacilityAccess', access.id, {'user': target_user.email, 'facility': target_facility.name}, request)
            return Response(FacilityAccessSerializer(access).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def facility_access_detail(request, pk):
    org = request.user.profile.organization
    try:
        access = FacilityAccess.objects.get(id=pk, facility__organization=org)
        access.delete()
        create_audit_log(org, request.user, 'facility_access_revoked', 'FacilityAccess', pk, {}, request)
        return Response({'message': 'Facility access revoked.'})
    except FacilityAccess.DoesNotExist:
        return Response({'error': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)


# ----------------------------------------------------------------------
# 6. ORGANIZATION SETTINGS API
# ----------------------------------------------------------------------

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def organization_detail(request):
    org = request.user.profile.organization
    if request.method == 'GET':
        return Response(OrganizationSerializer(org).data)
    elif request.method == 'PATCH':
        if request.user.profile.role != 'admin':
            return Response({'error': 'Only organization administrators can modify settings.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_audit_log(org, request.user, 'org_settings_updated', 'Organization', org.id, request.data, request)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ----------------------------------------------------------------------
# 7. AUDIT LOG & NOTIFICATIONS API
# ----------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def audit_logs_list(request):
    logs = AuditLog.objects.filter(organization=request.user.profile.organization)[:100]
    return Response(AuditLogSerializer(logs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    if request.method == 'GET':
        notes = Notification.objects.filter(user=request.user)[:50]
        return Response(NotificationSerializer(notes, many=True).data)
    elif request.method == 'POST':
        # Mark all read
        Notification.objects.filter(user=request.user).update(is_read=True)
        return Response({'message': 'Notifications marked read.'})


# ----------------------------------------------------------------------
# 8. PHASE 3 ENERGY ANALYTICS ENDPOINTS
# ----------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_summary_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    summary = calculate_energy_summary(org, facility_id, date_range, start_str, end_str)
    return Response(summary)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_timeseries_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    meter_id = request.query_params.get('meter_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    aggregation = request.query_params.get('aggregation')
    source = request.query_params.get('source')
    data = get_timeseries_analytics(org, facility_id, meter_id, date_range, start_str, end_str, aggregation, source)
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_demand_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    meter_id = request.query_params.get('meter_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    data = get_demand_analytics(org, facility_id, meter_id, date_range, start_str, end_str)
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_by_facility_view(request):
    org = request.user.profile.organization
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    data = get_facility_comparison(org, date_range, start_str, end_str)
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_by_meter_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    fac_clean = facility_id if (facility_id and str(facility_id).lower() not in ['all', 'null', 'undefined', 'none', '']) else None
    meters_qs = Meter.objects.filter(facility__organization=org).select_related('facility')
    if fac_clean:
        meters_qs = meters_qs.filter(facility_id=fac_clean)

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    meters_data = []

    for m in meters_qs:
        readings = EnergyReading.objects.filter(meter=m)
        latest_reading = readings.first()
        today_kwh = float(readings.filter(timestamp__gte=today_start).aggregate(s=Sum('consumption'))['s'] or 0.0)

        meters_data.append({
            "id": m.id,
            "name": m.name,
            "meter_number": m.meter_number,
            "meter_type": m.meter_type,
            "meter_type_display": m.get_meter_type_display(),
            "facility_id": m.facility.id,
            "facility_name": m.facility.name,
            "status": m.status,
            "location_description": m.location_description,
            "last_reading_at": m.last_reading_at.isoformat() if m.last_reading_at else None,
            "current_demand": float(latest_reading.demand) if latest_reading else 0.0,
            "today_consumption": round(today_kwh, 2),
            "data_quality": latest_reading.quality_status if latest_reading else 'good',
            "voltage": float(latest_reading.voltage) if (latest_reading and latest_reading.voltage) else None,
            "power_factor": float(latest_reading.power_factor) if (latest_reading and latest_reading.power_factor) else None
        })

    return Response(meters_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_by_source_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    data = get_source_breakdown(org, facility_id, date_range, start_str, end_str)
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_intensity_view(request):
    org = request.user.profile.organization
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')

    facilities = Facility.objects.filter(organization=org)
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone)

    results = []
    total_kwh = 0.0
    total_sqft = 0

    for fac in facilities:
        kwh = float(EnergyReading.objects.filter(meter__facility=fac, timestamp__gte=start_dt, timestamp__lte=end_dt).aggregate(s=Sum('consumption'))['s'] or 0.0)
        total_kwh += kwh
        if fac.square_footage and fac.square_footage > 0:
            total_sqft += fac.square_footage
            intensity = kwh / fac.square_footage
            formatted_intensity = f"{intensity:.2f}"
        else:
            intensity = None
            formatted_intensity = "Energy intensity unavailable"

        results.append({
            "facility_id": fac.id,
            "facility_name": fac.name,
            "square_footage": fac.square_footage,
            "total_consumption_kwh": round(kwh, 2),
            "intensity": round(intensity, 2) if intensity is not None else None,
            "formatted_intensity": formatted_intensity,
            "unit": f"{org.energy_unit} / sq ft"
        })

    org_avg_intensity = (total_kwh / total_sqft) if total_sqft > 0 else None

    return Response({
        "organization_average_intensity": round(org_avg_intensity, 2) if org_avg_intensity is not None else None,
        "formatted_organization_intensity": f"{org_avg_intensity:.2f}" if org_avg_intensity is not None else "Energy intensity unavailable",
        "facilities": results
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_benchmarking_view(request):
    """
    Provides multi-metric energy benchmarking (kWh/sqft, kWh/unit, kWh/operating hour, $/sqft).
    Ranks facilities internally and handles missing metric data gracefully.
    """
    org = request.user.profile.organization
    metric = request.query_params.get('metric', 'kwh_per_sqft')
    date_range = request.query_params.get('range', '30d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')

    facilities = Facility.objects.filter(organization=org)
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone)

    results = []

    for fac in facilities:
        readings = EnergyReading.objects.filter(meter__facility=fac, timestamp__gte=start_dt, timestamp__lte=end_dt)
        agg = readings.aggregate(total_kwh=Sum('consumption'), peak_kw=Max('demand'))
        total_kwh = float(agg['total_kwh'] or 0.0)
        peak_kw = float(agg['peak_kw'] or 0.0)
        estimated_cost = total_kwh * 0.12 + peak_kw * 14.50

        benchmarked_val = None
        unit_label = ""
        is_available = True

        if metric == 'kwh_per_sqft':
            if fac.square_footage and fac.square_footage > 0:
                benchmarked_val = total_kwh / fac.square_footage
                unit_label = "kWh / sq ft"
            else:
                is_available = False
        elif metric == 'kwh_per_unit':
            prod_units = float(fac.square_footage or 50000) / 10.0
            benchmarked_val = total_kwh / prod_units
            unit_label = "kWh / unit"
        elif metric == 'kwh_per_hour':
            hours = max(1.0, (end_dt - start_dt).total_seconds() / 3600.0)
            benchmarked_val = total_kwh / hours
            unit_label = "kWh / operating hr"
        elif metric == 'cost_per_sqft':
            if fac.square_footage and fac.square_footage > 0:
                benchmarked_val = estimated_cost / fac.square_footage
                unit_label = "$ / sq ft"
            else:
                is_available = False

        results.append({
            "facility_id": fac.id,
            "facility_name": fac.name,
            "facility_type": fac.get_facility_type_display(),
            "square_footage": fac.square_footage,
            "total_consumption_kwh": round(total_kwh, 2),
            "peak_demand_kw": round(peak_kw, 2),
            "estimated_cost": round(estimated_cost, 2),
            "metric_type": metric,
            "benchmark_value": round(benchmarked_val, 4) if (is_available and benchmarked_val is not None) else None,
            "unit_label": unit_label,
            "data_available": is_available,
            "formatted_value": f"{benchmarked_val:.2f} {unit_label}" if (is_available and benchmarked_val is not None) else "Metric data unavailable"
        })

    valid_results = [r for r in results if r['data_available'] and r['benchmark_value'] is not None]
    valid_results.sort(key=lambda x: x['benchmark_value'])
    for idx, r in enumerate(valid_results):
        r['rank'] = idx + 1

    return Response({
        "metric_selected": metric,
        "date_range": date_range,
        "facilities": results
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_data_quality_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    data = get_data_quality_report(org, facility_id, date_range, start_str, end_str)
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def energy_export_csv_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility_id')
    meter_id = request.query_params.get('meter_id')
    date_range = request.query_params.get('range', '7d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    source = request.query_params.get('source')

    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone)

    readings = EnergyReading.objects.filter(
        meter__facility__organization=org,
        timestamp__gte=start_dt,
        timestamp__lte=end_dt
    ).select_related('meter', 'meter__facility')

    fac_clean = facility_id if (facility_id and str(facility_id).lower() not in ['all', 'null', 'undefined', 'none', '']) else None
    mtr_clean = meter_id if (meter_id and str(meter_id).lower() not in ['all', 'null', 'undefined', 'none', '']) else None

    if fac_clean:
        readings = readings.filter(meter__facility_id=fac_clean)

    if mtr_clean:
        readings = readings.filter(meter_id=mtr_clean)

    if source:
        readings = readings.filter(source=source)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="greengrid_telemetry_{org.code}_{date_range}.csv"'

    writer = csv.writer(response)
    writer.writerow(['Timestamp', 'Organization', 'Facility', 'Meter Name', 'Meter Number', 'Consumption (kWh)', 'Demand (kW)', 'Cost Estimate', 'Unit', 'Source', 'Data Quality'])

    for r in readings[:10000]:
        writer.writerow([
            r.timestamp.isoformat(),
            org.name,
            r.meter.facility.name,
            r.meter.name,
            r.meter.meter_number,
            float(r.consumption),
            float(r.demand),
            float(r.cost_estimate),
            r.unit,
            r.source,
            r.quality_status.upper()
        ])

    return response


# ----------------------------------------------------------------------
# 9. IoT TELEMETRY INGESTION & CREDENTIALS API
# ----------------------------------------------------------------------

def authenticate_ingestion_request(request):
    api_key_hdr = request.META.get('HTTP_X_API_KEY') or request.META.get('HTTP_AUTHORIZATION')
    if api_key_hdr and ('Api-Key' in api_key_hdr or not getattr(request, 'user', None) or not request.user.is_authenticated):
        token_str = api_key_hdr.replace('Api-Key', '').replace('Bearer', '').strip()
        if ':' in token_str:
            key_id, secret = token_str.split(':', 1)
            try:
                cred = IntegrationCredential.objects.get(key_id=key_id, status='active')
                hashed = hashlib.sha256(secret.encode('utf-8')).hexdigest()
                if cred.hashed_secret == hashed:
                    cred.last_used_at = timezone.now()
                    cred.save(update_fields=['last_used_at'])
                    return cred.organization, None
            except IntegrationCredential.DoesNotExist:
                pass
        return None, Response({'error': 'Invalid or revoked M2M API Key credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.user and request.user.is_authenticated and hasattr(request.user, 'profile'):
        return request.user.profile.organization, None

    return None, Response({'error': 'Authentication required. Provide a valid JWT token or X-API-Key.'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_telemetry_reading_view(request):
    org, err = authenticate_ingestion_request(request)
    if err:
        return err

    meter_id = request.data.get('meter_id') or request.data.get('meter_number')
    if not meter_id:
        return Response({'error': 'meter_id or meter_number is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if str(meter_id).isdigit():
            meter = Meter.objects.get(id=int(meter_id), facility__organization=org)
        else:
            meter = Meter.objects.get(meter_number=str(meter_id), facility__organization=org)
    except Meter.DoesNotExist:
        return Response({'error': f'Meter "{meter_id}" not found in your organization.'}, status=status.HTTP_404_NOT_FOUND)

    if meter.status == 'offline':
        return Response({'error': f'Meter "{meter.name}" is currently marked offline.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        consumption = float(request.data.get('consumption', 0.0))
        demand = float(request.data.get('demand', 0.0))
    except (ValueError, TypeError):
        return Response({'error': 'consumption and demand must be valid numeric values.'}, status=status.HTTP_400_BAD_REQUEST)

    ts_str = request.data.get('timestamp')
    if ts_str:
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if timezone.is_naive(ts):
                ts = timezone.make_aware(ts)
        except Exception:
            return Response({'error': 'Invalid ISO-8601 timestamp format.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        ts = timezone.now()

    if EnergyReading.objects.filter(meter=meter, timestamp=ts).exists():
        return Response({'error': f'Duplicate reading already recorded for meter {meter.meter_number} at {ts.isoformat()}.'}, status=status.HTTP_409_CONFLICT)

    voltage = request.data.get('voltage')
    power_factor = request.data.get('power_factor')
    current = request.data.get('current')
    reactive_power = request.data.get('reactive_power')
    frequency = request.data.get('frequency')
    unit = request.data.get('unit', 'kWh')
    source = request.data.get('source', 'grid')

    quality_status, quality_reason = evaluate_reading_quality(
        consumption=consumption,
        demand=demand,
        voltage=voltage,
        power_factor=power_factor,
        reading_timestamp=ts
    )

    cost = consumption * 0.14

    reading = EnergyReading.objects.create(
        meter=meter,
        timestamp=ts,
        consumption=Decimal(str(consumption)),
        demand=Decimal(str(demand)),
        cost_estimate=Decimal(str(round(cost, 2))),
        unit=unit,
        source=source,
        voltage=Decimal(str(voltage)) if voltage is not None else None,
        current=Decimal(str(current)) if current is not None else None,
        power_factor=Decimal(str(power_factor)) if power_factor is not None else None,
        reactive_power=Decimal(str(reactive_power)) if reactive_power is not None else None,
        frequency=Decimal(str(frequency)) if frequency is not None else None,
        quality_status=quality_status,
        raw_payload=request.data if isinstance(request.data, dict) else {},
        is_demo_data=False
    )

    meter.last_reading_at = ts
    meter.save(update_fields=['last_reading_at'])

    detect_and_handle_anomalies(meter, ts, consumption, demand, quality_status, quality_reason, voltage, power_factor)
    broadcast_org_event(org.id, "energy.reading_created", EnergyReadingSerializer(reading).data)

    return Response({
        'message': 'Telemetry reading ingested successfully.',
        'reading': EnergyReadingSerializer(reading).data
    }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def ingestion_credentials_list_view(request):
    org = request.user.profile.organization
    if request.method == 'GET':
        creds = IntegrationCredential.objects.filter(organization=org)
        return Response(IntegrationCredentialSerializer(creds, many=True).data)
    elif request.method == 'POST':
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Credential name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        key_id = f"gg_key_{secrets.token_hex(8)}"
        secret = f"gg_sec_{secrets.token_hex(16)}"
        hashed = hashlib.sha256(secret.encode('utf-8')).hexdigest()

        cred = IntegrationCredential.objects.create(
            organization=org,
            name=name,
            key_id=key_id,
            hashed_secret=hashed,
            status='active'
        )

        create_audit_log(org, request.user, 'm2m_credential_created', 'IntegrationCredential', cred.id, {'name': name, 'key_id': key_id}, request)

        return Response({
            'message': 'API Key generated successfully. Save the raw secret now as it will not be shown again.',
            'credential': IntegrationCredentialSerializer(cred).data,
            'key_id': key_id,
            'secret': secret,
            'connection_header': f"Api-Key {key_id}:{secret}"
        }, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def ingestion_credential_detail_view(request, pk):
    org = request.user.profile.organization
    try:
        cred = IntegrationCredential.objects.get(id=pk, organization=org)
        cred.status = 'revoked'
        cred.save(update_fields=['status'])
        create_audit_log(org, request.user, 'm2m_credential_revoked', 'IntegrationCredential', pk, {'key_id': cred.key_id}, request)
        return Response({'message': f'Credential {cred.key_id} revoked.'})
    except IntegrationCredential.DoesNotExist:
        return Response({'error': 'Credential not found.'}, status=status.HTTP_404_NOT_FOUND)


# ----------------------------------------------------------------------
# 6. TARIFF MANAGEMENT API (PHASE 4)
# ----------------------------------------------------------------------

class TariffPlanViewSet(viewsets.ModelViewSet):
    serializer_class = TariffPlanSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return TariffPlan.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        tariff = serializer.save(organization=org)
        create_audit_log(org, self.request.user, 'tariff_plan_created', 'TariffPlan', tariff.id, {'name': tariff.name}, self.request)

    def perform_update(self, serializer):
        org = self.request.user.profile.organization
        tariff = serializer.save()
        create_audit_log(org, self.request.user, 'tariff_plan_updated', 'TariffPlan', tariff.id, {'name': tariff.name}, self.request)

    @action(detail=True, methods=['get', 'post'], url_path='tou-periods')
    def tou_periods(self, request, pk=None):
        tariff = self.get_object()
        if request.method == 'GET':
            periods = tariff.tou_periods.all()
            return Response(TariffTimePeriodSerializer(periods, many=True).data)
        elif request.method == 'POST':
            if request.user.profile.role not in ['admin', 'facility_manager']:
                return Response({'detail': 'You do not have permission to modify tariffs.'}, status=status.HTTP_403_FORBIDDEN)
            data = request.data.copy()
            data['tariff_plan'] = tariff.id
            serializer = TariffTimePeriodSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            period = serializer.save()
            create_audit_log(tariff.organization, request.user, 'tou_period_created', 'TariffTimePeriod', period.id, {'name': period.name}, request)
            return Response(TariffTimePeriodSerializer(period).data, status=status.HTTP_201_CREATED)


class TariffTimePeriodViewSet(viewsets.ModelViewSet):
    serializer_class = TariffTimePeriodSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return TariffTimePeriod.objects.filter(tariff_plan__organization=org)


class DemandChargeRuleViewSet(viewsets.ModelViewSet):
    serializer_class = DemandChargeRuleSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return DemandChargeRule.objects.filter(tariff_plan__organization=org)


# ----------------------------------------------------------------------
# 7. UTILITY BILLING & RECONCILIATION API (PHASE 4)
# ----------------------------------------------------------------------

class UtilityBillViewSet(viewsets.ModelViewSet):
    serializer_class = UtilityBillSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        qs = UtilityBill.objects.filter(facility__organization=org)
        
        facility_id = self.request.query_params.get('facility')
        if facility_id:
            qs = qs.filter(facility_id=facility_id)

        rec_status = self.request.query_params.get('reconciliation_status')
        if rec_status:
            qs = qs.filter(reconciliation_status=rec_status)

        return qs

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        facility = serializer.validated_data['facility']
        if facility.organization != org:
            raise serializers.ValidationError({"facility": "Facility does not belong to your organization."})
        
        bill = serializer.save(organization=org)
        
        # Auto calculate & reconcile if requested or baseline created
        reconcile_utility_bill(bill, user=self.request.user)
        create_audit_log(org, self.request.user, 'utility_bill_created', 'UtilityBill', bill.id, {'invoice_number': bill.invoice_number}, self.request)

    @action(detail=True, methods=['post'], url_path='calculate')
    def calculate_bill(self, request, pk=None):
        bill = self.get_object()
        calc_result = calculate_bill_for_facility(
            facility=bill.facility,
            start_date=bill.billing_period_start,
            end_date=bill.billing_period_end,
            tariff_plan=bill.tariff_plan
        )
        return Response(calc_result)

    @action(detail=True, methods=['post'], url_path='reconcile')
    def reconcile_bill(self, request, pk=None):
        bill = self.get_object()
        tolerance = request.data.get('tolerance_percentage', 2.0)
        result = reconcile_utility_bill(bill, tolerance_percentage=Decimal(str(tolerance)), user=request.user)
        return Response(result)

    @action(detail=True, methods=['get'], url_path='breakdown')
    def breakdown(self, request, pk=None):
        bill = self.get_object()
        calc_result = calculate_bill_for_facility(
            facility=bill.facility,
            start_date=bill.billing_period_start,
            end_date=bill.billing_period_end,
            tariff_plan=bill.tariff_plan
        )
        return Response({
            "bill_id": bill.id,
            "invoice_number": bill.invoice_number,
            "facility_name": bill.facility.name,
            "billing_period": f"{bill.billing_period_start} to {bill.billing_period_end}",
            "calculation_breakdown": calc_result
        })

    @action(detail=True, methods=['post'], url_path='upload-document')
    def upload_document(self, request, pk=None):
        bill = self.get_object()
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        org = request.user.profile.organization
        doc = UtilityBillDocument.objects.create(
            organization=org,
            facility=bill.facility,
            bill=bill,
            original_filename=uploaded_file.name,
            file=uploaded_file,
            uploaded_by=request.user,
            processing_status='PROCESSING'
        )

        # Trigger OCR engine abstraction
        ocr_engine = UtilityBillOCRProvider()
        ocr_result = ocr_engine.extract_bill_data(doc.file.path, doc.original_filename)

        doc.ocr_extracted_data = ocr_result.get('extracted_fields', {})
        doc.ocr_confidence = Decimal(str(ocr_result.get('overall_confidence', 0.50)))
        doc.processing_status = ocr_result.get('status', 'REVIEW_REQUIRED')
        doc.save()

        create_audit_log(org, request.user, 'bill_document_uploaded', 'UtilityBillDocument', doc.id, {'filename': doc.original_filename}, request)

        return Response({
            "message": "Document uploaded and OCR extraction performed.",
            "document": UtilityBillDocumentSerializer(doc).data,
            "ocr_result": ocr_result
        }, status=status.HTTP_201_CREATED)


# ----------------------------------------------------------------------
# 8. BILLING ANALYTICS & SCENARIO API (PHASE 4)
# ----------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billing_summary_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')
    date_range = request.query_params.get('range', '30d')
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    start_date, end_date, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone)

    bills = UtilityBill.objects.filter(facility__organization=org)
    if facility_id and facility_id != 'all':
        bills = bills.filter(facility_id=facility_id)
    if start_date:
        bills = bills.filter(billing_period_end__gte=start_date.date())
    if end_date:
        bills = bills.filter(billing_period_start__lte=end_date.date())


    totals = bills.aggregate(
        total_billed=Sum('billed_amount'),
        total_calculated=Sum('calculated_amount'),
        total_energy=Sum('energy_charge'),
        total_demand=Sum('demand_charge'),
        total_fixed=Sum('fixed_charge'),
        total_tax=Sum('tax_amount'),
        total_kwh=Sum('billed_consumption_kwh'),
        max_kw=Max('billed_demand_kw')
    )

    total_billed = totals['total_billed'] or Decimal('0.00')
    total_calculated = totals['total_calculated'] or Decimal('0.00')
    total_variance = quantize_money(total_billed - total_calculated)

    matched_count = bills.filter(reconciliation_status='MATCHED').count()
    variance_count = bills.filter(reconciliation_status='VARIANCE').count()
    total_bills_count = bills.count()

    return Response({
        "currency": org.currency,
        "total_billed_amount": float(total_billed),
        "total_calculated_amount": float(total_calculated),
        "total_variance_amount": float(total_variance),
        "energy_charges": float(totals['total_energy'] or Decimal('0.00')),
        "demand_charges": float(totals['total_demand'] or Decimal('0.00')),
        "fixed_charges": float(totals['total_fixed'] or Decimal('0.00')),
        "tax_amount": float(totals['total_tax'] or Decimal('0.00')),
        "total_consumption_kwh": float(totals['total_kwh'] or Decimal('0.00')),
        "peak_demand_kw": float(totals['max_kw'] or Decimal('0.00')),
        "bills_reconciled": {
            "total_bills": total_bills_count,
            "matched_count": matched_count,
            "variance_count": variance_count,
            "pending_count": total_bills_count - (matched_count + variance_count)
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_cost_timeseries_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')

    bills = UtilityBill.objects.filter(facility__organization=org).order_by('billing_period_end')
    if facility_id:
        bills = bills.filter(facility_id=facility_id)

    data = []
    for b in bills:
        data.append({
            "bill_id": b.id,
            "period_end": str(b.billing_period_end),
            "facility_name": b.facility.name,
            "billed_amount": float(b.billed_amount or b.total_cost_usd or 0),
            "calculated_amount": float(b.calculated_amount or 0),
            "energy_charge": float(b.energy_charge),
            "demand_charge": float(b.demand_charge),
            "fixed_charge": float(b.fixed_charge),
            "variance": float(b.variance_amount or 0),
        })

    return Response({"currency": org.currency, "timeseries": data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_cost_by_facility_view(request):
    org = request.user.profile.organization
    facilities = Facility.objects.filter(organization=org)
    
    result = []
    for fac in facilities:
        bills = UtilityBill.objects.filter(facility=fac)
        agg = bills.aggregate(
            total_billed=Sum('billed_amount'),
            total_kwh=Sum('billed_consumption_kwh'),
            peak_kw=Max('billed_demand_kw')
        )
        total_billed = float(agg['total_billed'] or 0)
        total_kwh = float(agg['total_kwh'] or 0)
        cost_per_kwh = round(total_billed / total_kwh, 4) if total_kwh > 0 else 0
        cost_per_sqft = round(total_billed / fac.square_footage, 2) if fac.square_footage > 0 else 0

        result.append({
            "facility_id": fac.id,
            "facility_name": fac.name,
            "square_footage": fac.square_footage,
            "total_cost": total_billed,
            "total_kwh": total_kwh,
            "peak_kw": float(agg['peak_kw'] or 0),
            "cost_per_kwh": cost_per_kwh,
            "cost_per_sqft": cost_per_sqft
        })

    return Response({"currency": org.currency, "facilities": result})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_cost_by_meter_view(request):
    org = request.user.profile.organization
    meters = Meter.objects.filter(facility__organization=org)

    result = []
    for m in meters:
        readings = EnergyReading.objects.filter(meter=m)
        agg = readings.aggregate(total_kwh=Sum('consumption'), peak_kw=Max('demand'))
        kwh = float(agg['total_kwh'] or 0)
        kw = float(agg['peak_kw'] or 0)
        estimated_cost = round(kwh * 0.12, 2) # estimated baseline

        result.append({
            "meter_id": m.id,
            "meter_name": m.name,
            "facility_name": m.facility.name,
            "total_kwh": kwh,
            "peak_kw": kw,
            "estimated_cost": estimated_cost
        })

    return Response({"currency": org.currency, "meters": result})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_tou_breakdown_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')
    
    facility = None
    if facility_id:
        facility = Facility.objects.filter(id=facility_id, organization=org).first()
    if not facility:
        facility = Facility.objects.filter(organization=org).first()

    if not facility:
        return Response({"error": "No facility found for organization."}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.now().date()
    start_date = today - timedelta(days=30)
    
    calc = calculate_bill_for_facility(facility, start_date, today)
    return Response({
        "facility_id": facility.id,
        "facility_name": facility.name,
        "start_date": str(start_date),
        "end_date": str(today),
        "tou_breakdown": calc["tou_breakdown"]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_demand_cost_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')

    facility = None
    if facility_id:
        facility = Facility.objects.filter(id=facility_id, organization=org).first()
    if not facility:
        facility = Facility.objects.filter(organization=org).first()

    if not facility:
        return Response({"error": "No facility found for organization."}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.now().date()
    start_date = today - timedelta(days=30)

    calc = calculate_bill_for_facility(facility, start_date, today)
    return Response({
        "facility_id": facility.id,
        "facility_name": facility.name,
        "start_date": str(start_date),
        "end_date": str(today),
        "demand_breakdown": calc["demand_breakdown"]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_variance_view(request):
    org = request.user.profile.organization
    bills = UtilityBill.objects.filter(facility__organization=org).exclude(reconciliation_status='MATCHED')

    serializer = UtilityBillSerializer(bills, many=True)
    return Response({"discrepant_bills": serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def tariff_scenario_analysis_view(request):
    org = request.user.profile.organization
    facility_id = request.data.get('facility')
    primary_tariff_id = request.data.get('primary_tariff')
    alternative_tariff_id = request.data.get('alternative_tariff')
    start_date_str = request.data.get('start_date')
    end_date_str = request.data.get('end_date')

    if not facility_id or not primary_tariff_id or not alternative_tariff_id:
        return Response({"error": "facility, primary_tariff, and alternative_tariff are required fields."}, status=status.HTTP_400_BAD_REQUEST)

    facility = Facility.objects.filter(id=facility_id, organization=org).first()
    if not facility:
        return Response({"error": "Facility not found."}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.now().date()
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else (today - timedelta(days=30))
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today

    try:
        comparison = compare_tariff_scenarios(
            facility=facility,
            start_date=start_date,
            end_date=end_date,
            primary_tariff_id=primary_tariff_id,
            alternative_tariff_id=alternative_tariff_id
        )
        return Response(comparison)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def billing_export_csv_view(request):
    org = request.user.profile.organization
    bills = UtilityBill.objects.filter(facility__organization=org)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="green_grid_utility_bills_{org.code}.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Invoice Number', 'Utility Provider', 'Facility', 'Period Start', 'Period End',
        'Billed Consumption (kWh)', 'Billed Peak Demand (kW)', 'Billed Amount ($)',
        'Calculated Amount ($)', 'Variance ($)', 'Variance (%)', 'Reconciliation Status'
    ])

    for b in bills:
        writer.writerow([
            b.invoice_number,
            b.utility_provider,
            b.facility.name,
            b.billing_period_start,
            b.billing_period_end,
            b.billed_consumption_kwh or b.total_consumption_kwh,
            b.billed_demand_kw or b.peak_demand_kw,
            b.billed_amount or b.total_cost_usd,
            b.calculated_amount or 0.00,
            b.variance_amount or 0.00,
            b.variance_percentage or 0.00,
            b.reconciliation_status
        ])

    return response


# ----------------------------------------------------------------------
# 9. PREDICTIVE FORECASTING API (PHASE 5)
# ----------------------------------------------------------------------

class ForecastRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ForecastRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org = self.request.user.profile.organization
        qs = ForecastRecord.objects.filter(facility__organization=org)
        facility_id = self.request.query_params.get('facility')
        if facility_id:
            qs = qs.filter(facility_id=facility_id)
        target_type = self.request.query_params.get('target_type')
        if target_type:
            qs = qs.filter(target_type=target_type)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def forecast_timeseries_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')
    horizon = request.query_params.get('horizon', '24h')
    target_type = request.query_params.get('target_type', 'consumption')

    facility = None
    if facility_id and facility_id != 'all':
        facility = Facility.objects.filter(id=facility_id, organization=org).first()
    if not facility:
        facility = Facility.objects.filter(organization=org).first()

    if not facility:
        return Response({"error": "No facility found for organization."}, status=status.HTTP_404_NOT_FOUND)

    engine = ForecastEngine()
    result = engine.generate_facility_forecast(facility=facility, horizon=horizon, target_type=target_type)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def forecast_accuracy_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')

    facility = Facility.objects.filter(id=facility_id, organization=org).first() if (facility_id and facility_id != 'all') else Facility.objects.filter(organization=org).first()
    if not facility:
        return Response({"error": "Facility not found."}, status=status.HTTP_404_NOT_FOUND)

    accuracy = evaluate_forecast_accuracy(facility=facility)
    return Response(accuracy)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict_peak_demand_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')

    facility = Facility.objects.filter(id=facility_id, organization=org).first() if (facility_id and facility_id != 'all') else Facility.objects.filter(organization=org).first()
    if not facility:
        return Response({"error": "Facility not found."}, status=status.HTTP_404_NOT_FOUND)

    pred = predict_peak_demand(facility=facility)
    return Response(pred)



# ----------------------------------------------------------------------
# 10. DEMAND RESPONSE MANAGEMENT API (PHASE 5)
# ----------------------------------------------------------------------

class DemandResponseEventViewSet(viewsets.ModelViewSet):
    serializer_class = DemandResponseEventSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        qs = DemandResponseEvent.objects.filter(facility__organization=org)
        facility_id = self.request.query_params.get('facility')
        if facility_id:
            qs = qs.filter(facility_id=facility_id)
        dr_status = self.request.query_params.get('status')
        if dr_status:
            qs = qs.filter(status=dr_status)
        return qs

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        event = serializer.save(organization=org, created_by=self.request.user)
        create_audit_log(org, self.request.user, 'dr_event_created', 'DemandResponseEvent', event.id, {'event_name': event.event_name}, self.request)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_event(self, request, pk=None):
        if request.user.profile.role not in ['admin', 'facility_manager']:
            return Response({'detail': 'You do not have permission to approve Demand Response events.'}, status=status.HTTP_403_FORBIDDEN)

        event = self.get_object()
        event.status = 'SCHEDULED'
        event.approved_by = request.user
        event.save()
        create_audit_log(event.organization, request.user, 'dr_event_approved', 'DemandResponseEvent', event.id, {'event_name': event.event_name}, request)
        return Response(DemandResponseEventSerializer(event).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_event(self, request, pk=None):
        event = self.get_object()
        event.status = 'CANCELLED'
        event.save()
        create_audit_log(event.organization, request.user, 'dr_event_cancelled', 'DemandResponseEvent', event.id, {'event_name': event.event_name}, request)
        return Response(DemandResponseEventSerializer(event).data)


# ----------------------------------------------------------------------
# 11. DEVICE REGISTRY & HEALTH API (PHASE 5)
# ----------------------------------------------------------------------

class DeviceViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        qs = Device.objects.filter(facility__organization=org)
        facility_id = self.request.query_params.get('facility')
        if facility_id:
            qs = qs.filter(facility_id=facility_id)
        protocol = self.request.query_params.get('protocol')
        if protocol:
            qs = qs.filter(protocol=protocol)
        return qs

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        device = serializer.save(organization=org)
        create_audit_log(org, self.request.user, 'device_registered', 'Device', device.id, {'name': device.name, 'serial': device.serial_number}, self.request)

    @action(detail=True, methods=['get'], url_path='health')
    def health_check(self, request, pk=None):
        device = self.get_object()
        health = evaluate_device_health(device)
        return Response(health)

    @action(detail=True, methods=['get'], url_path='telemetry')
    def telemetry(self, request, pk=None):
        device = self.get_object()
        adapter = get_adapter_for_protocol(device.protocol)
        return Response(adapter.read_telemetry(device))


class StorageAssetViewSet(viewsets.ModelViewSet):
    serializer_class = StorageAssetSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return StorageAsset.objects.filter(facility__organization=org)

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        asset = serializer.save(organization=org)
        create_audit_log(org, self.request.user, 'storage_asset_created', 'StorageAsset', asset.id, {'name': asset.name}, self.request)


# ----------------------------------------------------------------------
# 12. OPTIMIZATION & SCENARIO SIMULATION API (PHASE 5)
# ----------------------------------------------------------------------

class OptimizationRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = OptimizationRecommendationSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        qs = OptimizationRecommendation.objects.filter(facility__organization=org)
        facility_id = self.request.query_params.get('facility')
        if facility_id:
            qs = qs.filter(facility_id=facility_id)
        return qs

    @action(detail=False, methods=['get'], url_path='generate')
    def generate_recommendations(self, request):
        org = request.user.profile.organization
        facility_id = request.query_params.get('facility')

        facility = Facility.objects.filter(id=facility_id, organization=org).first() if facility_id else Facility.objects.filter(organization=org).first()
        if not facility:
            return Response({"error": "No facility found for organization."}, status=status.HTTP_404_NOT_FOUND)

        recs = generate_optimization_recommendations(facility=facility)
        return Response(OptimizationRecommendationSerializer(recs, many=True).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_recommendation(self, request, pk=None):
        rec = self.get_object()
        rec.is_approved = True
        rec.approved_by = request.user
        rec.save()
        create_audit_log(rec.organization, request.user, 'recommendation_approved', 'OptimizationRecommendation', rec.id, {'type': rec.recommendation_type}, request)
        return Response(OptimizationRecommendationSerializer(rec).data)


class ScenarioSimulationViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioSimulationSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return ScenarioSimulation.objects.filter(facility__organization=org)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = request.user.profile.organization
        facility = serializer.validated_data['facility']
        if facility.organization != org:
            raise serializers.ValidationError({"facility": "Facility does not belong to your organization."})

        scenario_type = serializer.validated_data.get('scenario_type', 'load_shift')
        name = serializer.validated_data.get('name', 'Scenario Simulation')
        parameters = serializer.validated_data.get('parameters', {})

        sim = simulate_energy_scenario(
            facility=facility,
            name=name,
            scenario_type=scenario_type,
            parameters=parameters,
            user=request.user
        )
        create_audit_log(org, request.user, 'scenario_simulated', 'ScenarioSimulation', sim.id, {'name': name}, request)
        headers = self.get_success_headers(serializer.data)
        return Response(ScenarioSimulationSerializer(sim).data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='run')
    def run_simulation(self, request, pk=None):
        sim = self.get_object()
        updated_sim = simulate_energy_scenario(
            facility=sim.facility,
            name=sim.name,
            scenario_type=sim.scenario_type,
            parameters=sim.parameters,
            user=request.user
        )
        return Response(ScenarioSimulationSerializer(updated_sim).data)


# ----------------------------------------------------------------------
# 13. PHASE 6 API VIEWS: AUTOMATION, CONTROL, ML, CARBON, REPORTS, WEBHOOKS, HEALTH
# ----------------------------------------------------------------------

from core.models import (
    AutomationConfig, DeviceSafetyPolicy, ControlCommand, MLModelVersion,
    ForecastDriftLog, OptimizationOutcomeTrack, EmissionFactor, ScheduledReport,
    WebhookEndpoint, WebhookDeliveryLog, AlertEscalationPolicy
)
from core.serializers import (
    AutomationConfigSerializer, DeviceSafetyPolicySerializer, ControlCommandSerializer,
    MLModelVersionSerializer, ForecastDriftLogSerializer, OptimizationOutcomeTrackSerializer,
    EmissionFactorSerializer, ScheduledReportSerializer, WebhookEndpointSerializer,
    WebhookDeliveryLogSerializer, AlertEscalationPolicySerializer
)
from core.services.carbon import calculate_facility_emissions, get_carbon_intensity_timeseries, get_renewable_intelligence
from core.services.ml_forecasting import train_and_evaluate_ml_model, get_forecast_explainability, check_forecast_drift
from core.services.automation import (
    get_or_create_automation_config, get_or_create_safety_policy,
    create_control_command, approve_and_execute_command, emergency_stop_all_automation
)
from core.services.closed_loop_optimization import track_and_evaluate_outcomes
from core.services.enterprise_reporting import generate_report_dataset, export_report_csv
from core.services.webhooks import dispatch_webhook_event
from core.services.system_health import check_system_health


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated, IsReadOnlyOrFacilityManagerAdmin])
def automation_config_view(request):
    org = request.user.profile.organization
    config = get_or_create_automation_config(org)
    
    if request.method == 'GET':
        return Response(AutomationConfigSerializer(config).data)
    
    if request.user.profile.role not in ['admin', 'facility_manager']:
        return Response({'detail': 'Unauthorized to modify automation configuration.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = AutomationConfigSerializer(config, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    create_audit_log(org, request.user, 'automation_config_updated', 'AutomationConfig', config.id, request.data, request)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOrgAdmin])
def emergency_stop_view(request):
    org = request.user.profile.organization
    reason = request.data.get('reason', 'Manual Emergency Stop Button Triggered')
    res = emergency_stop_all_automation(org, request.user, reason)
    return Response(res)


class DeviceSafetyPolicyViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSafetyPolicySerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return DeviceSafetyPolicy.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        policy = serializer.save(organization=org)
        create_audit_log(org, self.request.user, 'safety_policy_created', 'DeviceSafetyPolicy', policy.id, {}, self.request)


class ControlCommandViewSet(viewsets.ModelViewSet):
    serializer_class = ControlCommandSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return ControlCommand.objects.filter(organization=org)

    def create(self, request, *args, **kwargs):
        org = request.user.profile.organization
        device_id = request.data.get('device')
        command_type = request.data.get('command_type')
        requested_value = request.data.get('requested_value')

        if not device_id or not command_type or requested_value is None:
            return Response({'error': 'device, command_type, and requested_value are required.'}, status=status.HTTP_400_BAD_REQUEST)

        device = Device.objects.filter(id=device_id, organization=org).first()
        if not device:
            return Response({'error': 'Device not found.'}, status=status.HTTP_404_NOT_FOUND)

        cmd = create_control_command(org, device, command_type, requested_value, request.user)
        return Response(ControlCommandSerializer(cmd).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_command(self, request, pk=None):
        cmd = self.get_object()
        try:
            executed_cmd = approve_and_execute_command(cmd.id, request.user)
            return Response(ControlCommandSerializer(executed_cmd).data)
        except Exception as err:
            return Response({'error': str(err)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_command(self, request, pk=None):
        cmd = self.get_object()
        cmd.execution_status = 'CANCELLED'
        cmd.rejection_reason = f"Cancelled by {request.user.username}"
        cmd.save()
        create_audit_log(cmd.organization, request.user, 'control_command_cancelled', 'ControlCommand', cmd.id, {}, request)
        return Response(ControlCommandSerializer(cmd).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carbon_summary_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility') or request.query_params.get('facility_id')
    try:
        days = int(request.query_params.get('days', 30))
    except (ValueError, TypeError):
        days = 30

    res = calculate_facility_emissions(org, facility_id=facility_id, days=days)
    return Response(res)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carbon_intensity_trend_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility') or request.query_params.get('facility_id')
    try:
        days = int(request.query_params.get('days', 7))
    except (ValueError, TypeError):
        days = 7

    timeseries = get_carbon_intensity_timeseries(org, facility_id=facility_id, days=days)
    return Response({'facility_id': facility_id or 'all', 'timeseries': timeseries})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def renewable_intelligence_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility') or request.query_params.get('facility_id')
    try:
        days = int(request.query_params.get('days', 30))
    except (ValueError, TypeError):
        days = 30

    res = get_renewable_intelligence(org, facility_id=facility_id, days=days)
    return Response(res)



class EmissionFactorViewSet(viewsets.ModelViewSet):
    serializer_class = EmissionFactorSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return EmissionFactor.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        ef = serializer.save(organization=org)
        create_audit_log(org, self.request.user, 'emission_factor_created', 'EmissionFactor', ef.id, {'region': ef.region}, self.request)


class MLModelVersionViewSet(viewsets.ModelViewSet):
    serializer_class = MLModelVersionSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return MLModelVersion.objects.filter(organization=org)

    @action(detail=False, methods=['post'], url_path='train')
    def train_model(self, request):
        org = request.user.profile.organization
        facility_id = request.data.get('facility')
        algorithm = request.data.get('algorithm', 'random_forest')

        res = train_and_evaluate_ml_model(org, facility_id=facility_id, algorithm=algorithm, user=request.user)
        return Response(res)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def forecast_explainability_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility') or request.query_params.get('facility_id')
    res = get_forecast_explainability(org, facility_id=facility_id)
    return Response(res)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def forecast_drift_check_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility') or request.query_params.get('facility_id')
    res = check_forecast_drift(org, facility_id=facility_id)
    return Response(res)



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOrgAnalystOrAbove])
def closed_loop_outcomes_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility') or request.data.get('facility')

    if request.method == 'POST':
        res = track_and_evaluate_outcomes(org, facility_id=facility_id)
        return Response({'evaluated_count': len(res), 'outcomes': res})

    tracks = OptimizationOutcomeTrack.objects.filter(organization=org)
    if facility_id:
        tracks = tracks.filter(facility_id=facility_id)
    return Response(OptimizationOutcomeTrackSerializer(tracks, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_report_view(request):
    org = request.user.profile.organization
    report_type = request.query_params.get('report_type', 'energy')
    facility_id_raw = request.query_params.get('facility')
    facility_id = int(facility_id_raw) if (facility_id_raw and str(facility_id_raw).isdigit()) else None
    days = int(request.query_params.get('days', 30))
    export_format = request.query_params.get('export_format') or request.query_params.get('format', 'json')

    facility = Facility.objects.filter(id=facility_id, organization=org).first() if facility_id else None

    dataset = generate_report_dataset(report_type, org, facility=facility, days=days)

    if export_format in ['csv', 'text/csv']:
        csv_str = export_report_csv(dataset)
        response = HttpResponse(csv_str, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="greengrid_report_{report_type}_{org.code}.csv"'
        return response

    return Response(dataset)



class ScheduledReportViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledReportSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return ScheduledReport.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        sr = serializer.save(organization=org, created_by=self.request.user)
        create_audit_log(org, self.request.user, 'scheduled_report_created', 'ScheduledReport', sr.id, {'title': sr.title}, self.request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def operations_command_center_view(request):
    org = request.user.profile.organization
    facility_id = request.query_params.get('facility')
    severity = request.query_params.get('severity')
    device_status = request.query_params.get('device_status')

    facilities = Facility.objects.filter(organization=org)
    if facility_id and facility_id != 'all':
        facilities = facilities.filter(id=facility_id)

    devices = Device.objects.filter(organization=org)
    if device_status and device_status != 'all':
        devices = devices.filter(connection_status=device_status)

    total_devices = devices.count()
    online_devices = devices.filter(connection_status='online').count()

    alerts_qs = Alert.objects.filter(facility__organization=org, is_resolved=False)
    if severity and severity != 'all':
        alerts_qs = alerts_qs.filter(severity=severity)
    active_alerts_count = alerts_qs.count()

    active_recs_qs = OptimizationRecommendation.objects.filter(facility__organization=org, is_approved=False)
    active_recs_count = active_recs_qs.count()
    active_dr_count = DemandResponseEvent.objects.filter(facility__organization=org, status='ACTIVE').count()

    # Load summary
    fac_ids = [f.id for f in facilities]
    readings_24h = EnergyReading.objects.filter(meter__facility_id__in=fac_ids, timestamp__gte=timezone.now() - timedelta(hours=24))
    total_kwh = float(readings_24h.aggregate(total=Sum('consumption'))['total'] or 0.0)
    peak_kw = float(readings_24h.aggregate(max_kw=Max('demand'))['max_kw'] or 0.0)

    # Renewable generation 24h
    ren_readings = EnergyReading.objects.filter(meter__facility_id__in=fac_ids, source__in=['solar', 'wind'], timestamp__gte=timezone.now() - timedelta(hours=24))
    ren_gen_kwh = float(ren_readings.aggregate(total=Sum('consumption'))['total'] or 0.0)

    bess_units = StorageAsset.objects.filter(organization=org)
    avg_soc = float(bess_units.aggregate(avg=Avg('current_soc_percent'))['avg'] or 50.0)

    auto_config = get_or_create_automation_config(org)

    # Detailed lists for rich UI panels
    active_alerts_data = AlertSerializer(alerts_qs.select_related('facility')[:10], many=True).data
    recommended_actions_data = OptimizationRecommendationSerializer(active_recs_qs.select_related('facility')[:5], many=True).data
    device_health_data = DeviceSerializer(devices.select_related('facility')[:10], many=True).data
    facility_status_data = [{
        'id': f.id,
        'name': f.name,
        'facility_type': f.facility_type,
        'status': f.status,
        'meters_count': f.meters.count(),
        'square_footage': f.square_footage
    } for f in facilities[:10]]

    return Response({
        'system_status': 'OPERATIONAL' if auto_config.automation_enabled else 'EMERGENCY_STOP',
        'automation_enabled': auto_config.automation_enabled,
        'automation_mode': auto_config.mode,
        'fleet_health': {
            'total_devices': total_devices,
            'online_devices': online_devices,
            'offline_devices': total_devices - online_devices
        },
        'energy_summary_24h': {
            'total_kwh': round(total_kwh, 2),
            'peak_demand_kw': round(peak_kw, 2),
            'renewable_generation_kwh': round(ren_gen_kwh, 2),
            'forecast_peak_kw': round(peak_kw * 1.05, 2)
        },
        'operations_matrix': {
            'active_alerts': active_alerts_count,
            'pending_optimization_approvals': active_recs_count,
            'active_demand_response_events': active_dr_count,
            'bess_avg_soc_pct': round(avg_soc, 1)
        },
        'active_alerts_list': active_alerts_data,
        'recommended_actions_list': recommended_actions_data,
        'device_health_list': device_health_data,
        'facility_status_list': facility_status_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health_view(request):
    org = request.user.profile.organization
    health_data = check_system_health(org)
    return Response(health_data)



class WebhookEndpointViewSet(viewsets.ModelViewSet):
    serializer_class = WebhookEndpointSerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return WebhookEndpoint.objects.filter(organization=org)

    def perform_create(self, serializer):
        org = self.request.user.profile.organization
        secret = f"whsec_{secrets.token_hex(24)}"
        wh = serializer.save(organization=org, secret_key=secret)
        create_audit_log(org, self.request.user, 'webhook_endpoint_created', 'WebhookEndpoint', wh.id, {'name': wh.name}, self.request)

    @action(detail=True, methods=['get'], url_path='logs')
    def logs(self, request, pk=None):
        wh = self.get_object()
        logs = wh.delivery_logs.all()[:50]
        return Response(WebhookDeliveryLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['post'], url_path='test-ping')
    def test_ping(self, request, pk=None):
        wh = self.get_object()
        res = dispatch_webhook_event(wh.organization.id, 'ping.test', {'message': 'GreenGrid Webhook Test Ping Successful'})
        return Response({'deliveries': res})


class AlertEscalationPolicyViewSet(viewsets.ModelViewSet):
    serializer_class = AlertEscalationPolicySerializer
    permission_classes = [IsReadOnlyOrFacilityManagerAdmin]

    def get_queryset(self):
        org = self.request.user.profile.organization
        return AlertEscalationPolicy.objects.filter(organization=org)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check_api(request):
    """
    Lightweight operational health check endpoint.
    GET /api/health/
    """
    try:
        from django.db import connection
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    if db_ok:
        return Response({
            "status": "healthy",
            "service": "GreenGrid API Core",
            "version": "1.0.0",
            "database": "connected",
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            "status": "unhealthy",
            "service": "GreenGrid API Core",
            "database": "disconnected",
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search_api(request):
    """
    Global search endpoint across facilities, meters, devices, alerts, and utility bills.
    GET /api/search/?q=query
    """
    query_str = request.query_params.get('q', '').strip()
    if not query_str:
        return Response({
            "query": "",
            "results": {
                "facilities": [],
                "meters": [],
                "devices": [],
                "alerts": [],
                "utility_bills": []
            },
            "total_results": 0
        })

    from django.db.models import Q
    org = request.user.profile.organization

    # Facilities
    fac_qs = Facility.objects.filter(organization=org).filter(
        Q(name__icontains=query_str) | Q(facility_type__icontains=query_str) | Q(address__icontains=query_str)
    )[:10]
    facilities_data = [{
        "id": f.id,
        "name": f.name,
        "type": f.facility_type,
        "area_sqft": f.square_footage,
        "link": f"/app/facilities"
    } for f in fac_qs]

    # Meters
    meter_qs = Meter.objects.filter(facility__organization=org).filter(
        Q(name__icontains=query_str) | Q(meter_number__icontains=query_str) | Q(meter_type__icontains=query_str)
    )[:10]
    meters_data = [{
        "id": m.id,
        "meter_id": m.meter_number,
        "name": m.name,
        "facility_name": m.facility.name if m.facility else None,
        "link": f"/app/meters"
    } for m in meter_qs]

    # Devices
    device_qs = Device.objects.filter(organization=org).filter(
        Q(name__icontains=query_str) | Q(device_type__icontains=query_str) | Q(protocol__icontains=query_str)
    )[:10]
    devices_data = [{
        "id": d.id,
        "device_id": f"DEV-{d.id:04d}",
        "name": d.name,
        "protocol": d.protocol,
        "status": d.connection_status,
        "link": f"/app/devices"
    } for d in device_qs]

    # Alerts
    alert_qs = Alert.objects.filter(facility__organization=org).filter(
        Q(title__icontains=query_str) | Q(description__icontains=query_str) | Q(severity__icontains=query_str)
    )[:10]
    alerts_data = [{
        "id": a.id,
        "title": a.title,
        "severity": a.severity,
        "is_resolved": a.is_resolved,
        "created_at": a.timestamp.isoformat(),
        "link": f"/app/alerts"
    } for a in alert_qs]

    # Utility Bills
    bill_qs = UtilityBill.objects.filter(organization=org).filter(
        Q(invoice_number__icontains=query_str) | Q(utility_provider__icontains=query_str)
    )[:10]
    bills_data = [{
        "id": b.id,
        "invoice_number": b.invoice_number,
        "vendor_name": b.utility_provider,
        "total_amount": float(b.total_cost_usd or b.billed_amount or 0.0),
        "link": f"/app/billing"
    } for b in bill_qs]

    total_results = len(facilities_data) + len(meters_data) + len(devices_data) + len(alerts_data) + len(bills_data)

    return Response({
        "query": query_str,
        "results": {
            "facilities": facilities_data,
            "meters": meters_data,
            "devices": devices_data,
            "alerts": alerts_data,
            "utility_bills": bills_data
        },
        "total_results": total_results
    })




