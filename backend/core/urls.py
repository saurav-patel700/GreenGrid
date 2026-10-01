from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    register_user, login_user, logout_user, get_current_user,
    update_profile, change_password, forgot_password, reset_password,
    users_list, invite_user, get_invitation_details, accept_invitation,
    update_user_role, disable_user, enable_user,
    facility_access_list, facility_access_detail,
    organization_detail, audit_logs_list, notifications_list,
    dashboard_overview, FacilityViewSet, MeterViewSet, EnergyReadingViewSet,
    UtilityBillViewSet, RenewableAssetViewSet, AlertViewSet,
    energy_summary_view, energy_timeseries_view, energy_demand_view,
    energy_by_facility_view, energy_by_meter_view, energy_by_source_view,
    energy_intensity_view, energy_benchmarking_view, energy_data_quality_view, energy_export_csv_view,
    ingest_telemetry_reading_view, ingestion_credentials_list_view, ingestion_credential_detail_view,
    TariffPlanViewSet, TariffTimePeriodViewSet, DemandChargeRuleViewSet,
    billing_summary_view, billing_cost_timeseries_view, billing_cost_by_facility_view,
    billing_cost_by_meter_view, billing_tou_breakdown_view, billing_demand_cost_view,
    billing_variance_view, tariff_scenario_analysis_view, billing_export_csv_view,
    ForecastRecordViewSet, forecast_timeseries_view, forecast_accuracy_view, predict_peak_demand_view,
    DemandResponseEventViewSet, DeviceViewSet, StorageAssetViewSet,
    OptimizationRecommendationViewSet, ScenarioSimulationViewSet,
    automation_config_view, emergency_stop_view, DeviceSafetyPolicyViewSet, ControlCommandViewSet,
    carbon_summary_view, carbon_intensity_trend_view, renewable_intelligence_view, EmissionFactorViewSet,
    MLModelVersionViewSet, forecast_explainability_view, forecast_drift_check_view, closed_loop_outcomes_view,
    generate_report_view, ScheduledReportViewSet, operations_command_center_view, system_health_view,
    WebhookEndpointViewSet, AlertEscalationPolicyViewSet, health_check_api, global_search_api
)

router = DefaultRouter()
router.register(r'facilities', FacilityViewSet, basename='facility')
router.register(r'meters', MeterViewSet, basename='meter')
router.register(r'energy-readings', EnergyReadingViewSet, basename='energy-reading')
router.register(r'utility-bills', UtilityBillViewSet, basename='utility-bill')
router.register(r'billing/bills', UtilityBillViewSet, basename='billing-bill')
router.register(r'billing/tariffs', TariffPlanViewSet, basename='billing-tariff')
router.register(r'billing/tou-periods', TariffTimePeriodViewSet, basename='billing-tou-period')
router.register(r'billing/demand-rules', DemandChargeRuleViewSet, basename='billing-demand-rule')
router.register(r'forecast/records', ForecastRecordViewSet, basename='forecast-record')
router.register(r'demand-response', DemandResponseEventViewSet, basename='demand-response')
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'storage-assets', StorageAssetViewSet, basename='storage-asset')
router.register(r'optimization/recommendations', OptimizationRecommendationViewSet, basename='optimization-recommendation')
router.register(r'scenarios', ScenarioSimulationViewSet, basename='scenario-simulation')
router.register(r'renewable-assets', RenewableAssetViewSet, basename='renewable-asset')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'safety-policies', DeviceSafetyPolicyViewSet, basename='safety-policy')
router.register(r'commands', ControlCommandViewSet, basename='control-command')
router.register(r'emission-factors', EmissionFactorViewSet, basename='emission-factor')
router.register(r'ml-models', MLModelVersionViewSet, basename='ml-model')
router.register(r'scheduled-reports', ScheduledReportViewSet, basename='scheduled-report')
router.register(r'webhooks', WebhookEndpointViewSet, basename='webhook-endpoint')
router.register(r'escalation-policies', AlertEscalationPolicyViewSet, basename='escalation-policy')

urlpatterns = [
    # Auth Endpoints
    path('auth/register/', register_user, name='auth-register'),
    path('auth/login/', login_user, name='auth-login'),
    path('auth/logout/', logout_user, name='auth-logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', get_current_user, name='auth-me'),
    path('auth/profile/', update_profile, name='auth-profile'),
    path('auth/change-password/', change_password, name='auth-change-password'),
    path('auth/forgot-password/', forgot_password, name='auth-forgot-password'),
    path('auth/reset-password/', reset_password, name='auth-reset-password'),

    # User Management & Invitations
    path('users/', users_list, name='users-list'),
    path('users/invite/', invite_user, name='users-invite'),
    path('users/<int:user_id>/', update_user_role, name='users-update-role'),
    path('users/<int:user_id>/disable/', disable_user, name='users-disable'),
    path('users/<int:user_id>/enable/', enable_user, name='users-enable'),
    path('invitations/accept/', accept_invitation, name='invitation-accept'),
    path('invitations/<str:token>/', get_invitation_details, name='invitation-details'),

    # Facility Access Delegation
    path('facility-access/', facility_access_list, name='facility-access-list'),
    path('facility-access/<int:pk>/', facility_access_detail, name='facility-access-detail'),

    # Organization Settings & Audit
    path('organization/', organization_detail, name='organization-detail'),
    path('audit-logs/', audit_logs_list, name='audit-logs-list'),
    path('notifications/', notifications_list, name='notifications-list'),

    # Energy Analytics API Endpoints
    path('energy/summary/', energy_summary_view, name='energy-summary'),
    path('energy/timeseries/', energy_timeseries_view, name='energy-timeseries'),
    path('energy/demand/', energy_demand_view, name='energy-demand'),
    path('energy/by-facility/', energy_by_facility_view, name='energy-by-facility'),
    path('energy/by-meter/', energy_by_meter_view, name='energy-by-meter'),
    path('energy/by-source/', energy_by_source_view, name='energy-by-source'),
    path('energy/intensity/', energy_intensity_view, name='energy-intensity'),
    path('energy/benchmarking/', energy_benchmarking_view, name='energy-benchmarking'),
    path('energy/data-quality/', energy_data_quality_view, name='energy-data-quality'),
    path('energy/export/', energy_export_csv_view, name='energy-export-csv'),

    # Phase 4 Billing Analytics API Endpoints
    path('billing/summary/', billing_summary_view, name='billing-summary'),
    path('billing/cost-timeseries/', billing_cost_timeseries_view, name='billing-cost-timeseries'),
    path('billing/cost-by-facility/', billing_cost_by_facility_view, name='billing-cost-by-facility'),
    path('billing/cost-by-meter/', billing_cost_by_meter_view, name='billing-cost-by-meter'),
    path('billing/tou-breakdown/', billing_tou_breakdown_view, name='billing-tou-breakdown'),
    path('billing/demand-cost/', billing_demand_cost_view, name='billing-demand-cost'),
    path('billing/variance/', billing_variance_view, name='billing-variance'),
    path('billing/tariff-scenario/', tariff_scenario_analysis_view, name='tariff-scenario-analysis'),
    path('billing/export/', billing_export_csv_view, name='billing-export-csv'),

    # Phase 5 Predictive Analytics & Optimization API Endpoints
    path('forecast/timeseries/', forecast_timeseries_view, name='forecast-timeseries'),
    path('forecast/accuracy/', forecast_accuracy_view, name='forecast-accuracy'),
    path('forecast/peak-demand/', predict_peak_demand_view, name='forecast-peak-demand'),

    # Phase 6 Advanced Automation, ML, Carbon, Reports & Health Endpoints
    path('automation/config/', automation_config_view, name='automation-config'),
    path('automation/emergency-stop/', emergency_stop_view, name='automation-emergency-stop'),
    path('carbon/summary/', carbon_summary_view, name='carbon-summary'),
    path('carbon/intensity-trend/', carbon_intensity_trend_view, name='carbon-intensity-trend'),
    path('carbon/renewable-intelligence/', renewable_intelligence_view, name='renewable-intelligence'),
    path('forecast/explainability/', forecast_explainability_view, name='forecast-explainability'),
    path('forecast/drift-check/', forecast_drift_check_view, name='forecast-drift-check'),
    path('optimization/outcomes/', closed_loop_outcomes_view, name='closed-loop-outcomes'),
    path('reports/generate/', generate_report_view, name='reports-generate'),
    path('operations/summary/', operations_command_center_view, name='operations-summary'),
    path('system-health/', system_health_view, name='system-health'),

    # IoT Ingestion & Credentials Endpoints
    path('ingestion/readings/', ingest_telemetry_reading_view, name='ingest-telemetry-reading'),
    path('ingestion/credentials/', ingestion_credentials_list_view, name='ingestion-credentials-list'),
    path('ingestion/credentials/<int:pk>/', ingestion_credential_detail_view, name='ingestion-credential-detail'),

    # Phase 7 Operations, Health & Global Search
    path('health/', health_check_api, name='health-check'),
    path('search/', global_search_api, name='global-search'),

    # Dashboard & Domain ViewSets
    path('dashboard/', dashboard_overview, name='dashboard-overview'),
    path('', include(router.urls)),
]


