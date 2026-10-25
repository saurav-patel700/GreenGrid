from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Organization, UserProfile, Facility, FacilityAccess, Meter,
    EnergyReading, UtilityBill, EnergySource, RenewableAsset, Alert,
    Invitation, PasswordResetToken, Notification, AuditLog, IntegrationCredential,
    TariffPlan, TariffRate, TariffTimePeriod, DemandChargeRule, UtilityBillDocument,
    ForecastRecord, DemandResponseEvent, Device, StorageAsset, OptimizationRecommendation, ScenarioSimulation,
    AutomationConfig, DeviceSafetyPolicy, ControlCommand, MLModelVersion, ForecastDriftLog,
    OptimizationOutcomeTrack, EmissionFactor, ScheduledReport, WebhookEndpoint, WebhookDeliveryLog, AlertEscalationPolicy
)


class OrganizationSerializer(serializers.ModelSerializer):
    facilities_count = serializers.IntegerField(source='facilities.count', read_only=True)
    members_count = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'code', 'description', 'timezone',
            'currency', 'energy_unit', 'power_unit', 'facilities_count',
            'members_count', 'created_at', 'updated_at'
        ]

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'department', 'organization', 'picture', 'google_sub']

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username

class FacilityAccessSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = FacilityAccess
        fields = ['id', 'user', 'username', 'facility', 'facility_name', 'created_at']

class UserManagementSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    full_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source='user.is_active')
    last_login = serializers.DateTimeField(source='user.last_login', read_only=True)
    assigned_facilities = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'user_id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'department', 'phone', 'is_active', 'last_login', 'assigned_facilities']

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username

    def get_assigned_facilities(self, obj):
        accesses = FacilityAccess.objects.filter(user=obj.user)
        return [{'id': fa.facility.id, 'name': fa.facility.name} for fa in accesses]

class FacilitySerializer(serializers.ModelSerializer):
    meters_count = serializers.IntegerField(source='meters.count', read_only=True)
    active_alerts_count = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = '__all__'
        read_only_fields = ['organization']

    def get_active_alerts_count(self, obj):
        return obj.alerts.filter(is_resolved=False).count()

class MeterSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = Meter
        fields = '__all__'

class EnergyReadingSerializer(serializers.ModelSerializer):
    meter_name = serializers.CharField(source='meter.name', read_only=True)
    facility_name = serializers.CharField(source='meter.facility.name', read_only=True)

    class Meta:
        model = EnergyReading
        fields = '__all__'

class TariffRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffRate
        fields = '__all__'


class TariffTimePeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffTimePeriod
        fields = '__all__'

    def validate(self, data):
        start = data.get('start_time')
        end = data.get('end_time')
        tariff_plan = data.get('tariff_plan') or (self.instance.tariff_plan if self.instance else None)
        days = data.get('days_of_week', '0,1,2,3,4,5,6')

        if start and end and start == end:
            raise serializers.ValidationError({"end_time": "Time period start_time and end_time cannot be identical."})

        # Check overlapping period validation for same tariff plan
        if tariff_plan and start and end:
            existing_periods = TariffTimePeriod.objects.filter(tariff_plan=tariff_plan)
            if self.instance:
                existing_periods = existing_periods.exclude(id=self.instance.id)

            new_days = set(d.strip() for d in days.split(',') if d.strip())
            for p in existing_periods:
                p_days = set(d.strip() for d in p.days_of_week.split(',') if d.strip())
                if not new_days.intersection(p_days):
                    continue # No overlapping days of week

                # Time overlap check
                # Standard non-crossing comparison
                if start < end and p.start_time < p.end_time:
                    if max(start, p.start_time) < min(end, p.end_time):
                        raise serializers.ValidationError({
                            "non_field_errors": [f"Time period overlaps with existing period '{p.name}' ({p.start_time.strftime('%H:%M')}-{p.end_time.strftime('%H:%M')})."]
                        })

        return data


class DemandChargeRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandChargeRule
        fields = '__all__'


class TariffPlanSerializer(serializers.ModelSerializer):
    rates = TariffRateSerializer(many=True, read_only=True)
    tou_periods = TariffTimePeriodSerializer(many=True, read_only=True)
    demand_rules = DemandChargeRuleSerializer(many=True, read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = TariffPlan
        fields = [
            'id', 'organization', 'organization_name', 'name', 'utility_name',
            'utility_account_reference', 'currency', 'billing_cycle',
            'effective_from', 'effective_to', 'status', 'fixed_monthly_charge',
            'tax_percentage', 'is_demo_data', 'rates', 'tou_periods',
            'demand_rules', 'created_at', 'updated_at'
        ]
        read_only_fields = ['organization', 'created_at', 'updated_at']


class UtilityBillDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True, default='')

    class Meta:
        model = UtilityBillDocument
        fields = '__all__'
        read_only_fields = ['organization', 'uploaded_by', 'uploaded_at', 'ocr_extracted_data', 'ocr_confidence', 'processing_status']


class UtilityBillSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    tariff_plan_name = serializers.CharField(source='tariff_plan.name', read_only=True, default='')
    documents = UtilityBillDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = UtilityBill
        fields = '__all__'
        read_only_fields = ['organization', 'created_at', 'updated_at']

class EnergySourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergySource
        fields = '__all__'

class RenewableAssetSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = RenewableAsset
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True, default='')
    meter_name = serializers.CharField(source='meter.name', read_only=True, default='')

    class Meta:
        model = Alert
        fields = '__all__'

class InvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.CharField(source='invited_by.username', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Invitation
        fields = ['id', 'email', 'role', 'token', 'invited_by_name', 'organization_name', 'is_accepted', 'expires_at', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user_name', 'action', 'resource_type', 'resource_id', 'metadata', 'ip_address', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.username if obj.user else 'System'

class IntegrationCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationCredential
        fields = ['id', 'name', 'key_id', 'status', 'created_at', 'last_used_at', 'expires_at']
        read_only_fields = ['key_id', 'status', 'created_at', 'last_used_at']


# ----------------------------------------------------------------------
# PHASE 5 SERIALIZERS: FORECASTING, DR, DEVICES, STORAGE, OPTIMIZATION & SCENARIOS
# ----------------------------------------------------------------------

class ForecastRecordSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = ForecastRecord
        fields = '__all__'
        read_only_fields = ['organization', 'created_at']


class DemandResponseEventSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default='')
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True, default='')

    class Meta:
        model = DemandResponseEvent
        fields = '__all__'
        read_only_fields = ['organization', 'created_by', 'approved_by', 'created_at', 'updated_at']


class DeviceSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = Device
        fields = '__all__'
        read_only_fields = ['organization', 'created_at', 'updated_at']


class StorageAssetSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = StorageAsset
        fields = '__all__'
        read_only_fields = ['organization', 'created_at', 'updated_at']


class OptimizationRecommendationSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True, default='')

    class Meta:
        model = OptimizationRecommendation
        fields = '__all__'
        read_only_fields = ['organization', 'approved_by', 'created_at']


class ScenarioSimulationSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = ScenarioSimulation
        fields = '__all__'
        read_only_fields = ['organization', 'created_by', 'created_at']


# ----------------------------------------------------------------------
# PHASE 6 SERIALIZERS: AUTOMATION, COMMANDS, ML LIFECYCLE, CARBON, REPORTS, WEBHOOKS
# ----------------------------------------------------------------------

class AutomationConfigSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True, default='')

    class Meta:
        model = AutomationConfig
        fields = '__all__'
        read_only_fields = ['organization', 'updated_at']


class DeviceSafetyPolicySerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True, default='')
    device_name = serializers.CharField(source='device.name', read_only=True, default='')

    class Meta:
        model = DeviceSafetyPolicy
        fields = '__all__'
        read_only_fields = ['organization', 'created_at', 'updated_at']


class ControlCommandSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_serial = serializers.CharField(source='device.serial_number', read_only=True)
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True, default='')

    class Meta:
        model = ControlCommand
        fields = '__all__'
        read_only_fields = [
            'organization', 'requested_by', 'approved_by', 'validation_status',
            'approval_status', 'execution_status', 'rejection_reason', 'result_payload',
            'requested_at', 'executed_at', 'completed_at'
        ]


class MLModelVersionSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='model_owner.username', read_only=True, default='')

    class Meta:
        model = MLModelVersion
        fields = '__all__'
        read_only_fields = ['organization', 'created_at']


class ForecastDriftLogSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = ForecastDriftLog
        fields = '__all__'
        read_only_fields = ['organization', 'evaluated_at']


class OptimizationOutcomeTrackSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = OptimizationOutcomeTrack
        fields = '__all__'
        read_only_fields = ['organization', 'timestamp']


class EmissionFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionFactor
        fields = '__all__'
        read_only_fields = ['organization', 'created_at']


class ScheduledReportSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility_scope.name', read_only=True, default='All Facilities')
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default='')

    class Meta:
        model = ScheduledReport
        fields = '__all__'
        read_only_fields = ['organization', 'created_by', 'last_run_at', 'created_at']


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ['id', 'name', 'url', 'events_subscribed', 'is_active', 'failure_count', 'created_at', 'updated_at']
        read_only_fields = ['failure_count', 'created_at', 'updated_at']


class WebhookDeliveryLogSerializer(serializers.ModelSerializer):
    endpoint_name = serializers.CharField(source='webhook_endpoint.name', read_only=True)

    class Meta:
        model = WebhookDeliveryLog
        fields = '__all__'
        read_only_fields = ['timestamp']


class AlertEscalationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertEscalationPolicy
        fields = '__all__'
        read_only_fields = ['organization']


