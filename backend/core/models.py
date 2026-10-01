import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Organization(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    
    # Organization units & localization settings
    timezone = models.CharField(max_length=50, default='America/Chicago')
    currency = models.CharField(max_length=10, default='INR')
    energy_unit = models.CharField(max_length=10, default='kWh')
    power_unit = models.CharField(max_length=10, default='kW')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} [{self.code}]"

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Organization Admin'),
        ('facility_manager', 'Facility Manager'),
        ('analyst', 'Energy Analyst'),
        ('viewer', 'Read-Only Viewer'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='facility_manager')
    phone = models.CharField(max_length=50, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='Operations')

    def __str__(self):
        return f"{self.user.username} ({self.role} @ {self.organization.code})"

class Facility(models.Model):
    FACILITY_TYPES = [
        ('commercial', 'Commercial Building'),
        ('manufacturing', 'Manufacturing Facility'),
        ('campus', 'University / Enterprise Campus'),
        ('retail', 'Retail & Multi-Site'),
        ('renewable_site', 'Renewable Energy Site'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('maintenance', 'Maintenance'),
        ('offline', 'Offline'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='facilities')
    name = models.CharField(max_length=255)
    facility_type = models.CharField(max_length=50, choices=FACILITY_TYPES, default='commercial')
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default='Austin')
    state = models.CharField(max_length=50, default='TX')
    square_footage = models.PositiveIntegerField(default=50000)
    baseline_kwh_sqft = models.DecimalField(max_digits=8, decimal_places=2, default=14.50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.city}, {self.state})"

class FacilityAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='facility_permissions')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='assigned_users')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'facility')

    def __str__(self):
        return f"{self.user.username} -> {self.facility.name}"

class Meter(models.Model):
    METER_TYPES = [
        ('electricity', 'Main Electricity Meter'),
        ('submeter', 'Sub-meter'),
        ('solar_inverter', 'Solar Inverter'),
        ('battery_storage', 'Battery Storage System'),
        ('natural_gas', 'Natural Gas Meter'),
        ('water', 'Water Meter'),
    ]
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('warning', 'Warning'),
        ('offline', 'Offline'),
    ]
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='meters')
    name = models.CharField(max_length=255)
    meter_number = models.CharField(max_length=100, unique=True)
    meter_type = models.CharField(max_length=50, choices=METER_TYPES, default='electricity')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='online')
    location_description = models.CharField(max_length=255, blank=True, default='')
    last_reading_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} [{self.meter_number}]"

class EnergyReading(models.Model):
    SOURCE_CHOICES = [
        ('grid', 'Utility Grid'),
        ('solar', 'Solar PV'),
        ('battery', 'Battery Discharge'),
        ('generator', 'Backup Generator'),
        ('natural_gas', 'Natural Gas'),
    ]
    QUALITY_CHOICES = [
        ('good', 'Good'),
        ('delayed', 'Delayed'),
        ('missing', 'Missing'),
        ('suspect', 'Suspect'),
    ]
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, related_name='readings')
    timestamp = models.DateTimeField(db_index=True)
    consumption = models.DecimalField(max_digits=12, decimal_places=2, help_text='Consumption value (e.g. kWh)')
    demand = models.DecimalField(max_digits=10, decimal_places=2, help_text='Peak Demand (kW)')
    cost_estimate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    unit = models.CharField(max_length=20, default='kWh')
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='grid')
    
    # Telemetry fields
    reactive_power = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    voltage = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    current = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    power_factor = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    frequency = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    quality_status = models.CharField(max_length=20, choices=QUALITY_CHOICES, default='good', db_index=True)
    raw_payload = models.JSONField(default=dict, blank=True)

    is_demo_data = models.BooleanField(default=True, help_text='Flag marking demo data for easy reset')

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['meter', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['quality_status']),
        ]

    def __str__(self):
        return f"{self.meter.name} @ {self.timestamp}: {self.consumption} {self.unit}"

class IntegrationCredential(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('revoked', 'Revoked'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='credentials')
    name = models.CharField(max_length=255)
    key_id = models.CharField(max_length=64, unique=True, db_index=True)
    hashed_secret = models.CharField(max_length=128)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Credential {self.name} [{self.key_id}] - {self.organization.code}"

class TariffPlan(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('draft', 'Draft'),
    ]
    CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('bi_monthly', 'Bi-Monthly'),
        ('quarterly', 'Quarterly'),
        ('custom', 'Custom'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='tariffs')
    name = models.CharField(max_length=255)
    utility_name = models.CharField(max_length=255)
    utility_account_reference = models.CharField(max_length=100, blank=True, default='')
    currency = models.CharField(max_length=10, default='INR')
    billing_cycle = models.CharField(max_length=30, choices=CYCLE_CHOICES, default='monthly')
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    fixed_monthly_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_demo_data = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.utility_name}) - {self.organization.code}"


class TariffRate(models.Model):
    RATE_TYPE_CHOICES = [
        ('ENERGY', 'Energy Charge (per kWh)'),
        ('DEMAND', 'Demand Charge (per kW)'),
        ('FIXED', 'Fixed Charge'),
        ('TAX', 'Tax / Regulatory Surcharge'),
        ('OTHER', 'Other Adjustment'),
    ]
    tariff_plan = models.ForeignKey(TariffPlan, on_delete=models.CASCADE, related_name='rates')
    name = models.CharField(max_length=100)
    rate_type = models.CharField(max_length=30, choices=RATE_TYPE_CHOICES, default='ENERGY')
    unit_rate = models.DecimalField(max_digits=12, decimal_places=4)
    unit = models.CharField(max_length=20, default='kWh')
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.rate_type}): ${self.unit_rate}/{self.unit}"


class TariffTimePeriod(models.Model):
    PERIOD_TYPE_CHOICES = [
        ('OFF_PEAK', 'Off-Peak Period'),
        ('SHOULDER', 'Shoulder Period'),
        ('ON_PEAK', 'On-Peak Period'),
    ]
    tariff_plan = models.ForeignKey(TariffPlan, on_delete=models.CASCADE, related_name='tou_periods')
    name = models.CharField(max_length=100)
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPE_CHOICES, default='OFF_PEAK')
    start_time = models.TimeField()
    end_time = models.TimeField()
    days_of_week = models.CharField(max_length=50, default='0,1,2,3,4,5,6', help_text='Comma-separated weekday numbers 0-6 (0=Mon, 6=Sun)')
    rate = models.DecimalField(max_digits=12, decimal_places=4)
    priority = models.IntegerField(default=1)
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['priority', 'start_time']

    def __str__(self):
        return f"{self.name} ({self.period_type}): {self.start_time}-{self.end_time} @ ${self.rate}/kWh"


class DemandChargeRule(models.Model):
    tariff_plan = models.ForeignKey(TariffPlan, on_delete=models.CASCADE, related_name='demand_rules')
    rate_per_kw = models.DecimalField(max_digits=10, decimal_places=2)
    threshold_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    billing_period = models.CharField(max_length=20, default='monthly')
    minimum_demand_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ratchet_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Demand Rule: ${self.rate_per_kw}/kW above {self.threshold_kw} kW"


class UtilityBill(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending Approval'),
        ('flagged', 'Discrepancy Flagged'),
    ]
    RECONCILIATION_CHOICES = [
        ('PENDING', 'Pending Reconciliation'),
        ('MATCHED', 'Matched within Tolerance'),
        ('VARIANCE', 'Discrepancy Detected'),
        ('REVIEW_REQUIRED', 'Review Required'),
        ('APPROVED', 'Approved'),
    ]
    SOURCE_CHOICES = [
        ('MANUAL', 'Manual Entry'),
        ('OCR', 'Document OCR Extraction'),
        ('INGESTED', 'API / EDI Ingestion'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='utility_bills', null=True, blank=True)
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='utility_bills')
    tariff_plan = models.ForeignKey(TariffPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='utility_bills')
    utility_provider = models.CharField(max_length=255)
    account_reference = models.CharField(max_length=100, blank=True, default='')
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()

    # Billed metrics (from utility invoice)
    total_consumption_kwh = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    peak_demand_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_cost_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    billed_consumption_kwh = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    billed_demand_kw = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    billed_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Server-calculated values from telemetry & tariff
    calculated_consumption_kwh = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    calculated_demand_kw = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    calculated_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    energy_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    demand_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    fixed_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Reconciliation & variance metrics
    variance_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    variance_percentage = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='INR')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='paid')
    reconciliation_status = models.CharField(max_length=30, choices=RECONCILIATION_CHOICES, default='PENDING')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='MANUAL')
    notes = models.TextField(blank=True, default='')

    is_demo_data = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-billing_period_end']

    def __str__(self):
        return f"Bill {self.invoice_number} - {self.facility.name} (${self.total_cost_usd or self.billed_amount or 0})"


class UtilityBillDocument(models.Model):
    PROCESSING_CHOICES = [
        ('UPLOADED', 'Uploaded'),
        ('PROCESSING', 'Processing OCR'),
        ('PROCESSED', 'Processed'),
        ('REVIEW_REQUIRED', 'Review Required'),
        ('FAILED', 'Extraction Failed'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='bill_documents')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='bill_documents', null=True, blank=True)
    bill = models.ForeignKey(UtilityBill, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='bill_documents/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processing_status = models.CharField(max_length=30, choices=PROCESSING_CHOICES, default='UPLOADED')
    ocr_extracted_data = models.JSONField(default=dict, blank=True)
    ocr_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Document {self.original_filename} [{self.processing_status}]"

class EnergySource(models.Model):
    CATEGORY_CHOICES = [
        ('renewable', 'Renewable Energy'),
        ('grid', 'Grid Power'),
        ('fossil', 'Fossil Fuel Backup'),
    ]
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='grid')
    co2_factor_kg_per_kwh = models.DecimalField(max_digits=6, decimal_places=4, default=0.3850)

    def __str__(self):
        return self.name

class RenewableAsset(models.Model):
    ASSET_TYPES = [
        ('solar_pv', 'Rooftop / Ground Solar PV'),
        ('battery_storage', 'BESS Battery Energy Storage'),
        ('wind_turbine', 'Wind Generation'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active / Generating'),
        ('standby', 'Standby'),
        ('offline', 'Maintenance / Offline'),
    ]
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='renewable_assets')
    name = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=50, choices=ASSET_TYPES, default='solar_pv')
    capacity_kw = models.DecimalField(max_digits=10, decimal_places=2)
    current_output_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    battery_soc_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    def __str__(self):
        return f"{self.name} ({self.get_asset_type_display()}) - {self.capacity_kw} kW"

class Alert(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical Alert'),
        ('warning', 'Warning'),
        ('info', 'Informational'),
    ]
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='warning')
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_resolved = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"

def default_expiration():
    return timezone.now() + timedelta(days=7)

class Invitation(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=30, choices=UserProfile.ROLE_CHOICES, default='facility_manager')
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    facilities = models.ManyToManyField(Facility, blank=True)
    is_accepted = models.BooleanField(default=False)
    expires_at = models.DateTimeField(default=default_expiration)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return not self.is_accepted and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invite for {self.email} -> {self.organization.name} [{self.role}]"

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField(default=default_expiration)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f"Password Reset Token for {self.user.email}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='notifications')
    alert = models.ForeignKey(Alert, on_delete=models.SET_NULL, null=True, blank=True)
    notification_type = models.CharField(max_length=20, default='warning')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} for {self.user.username}"

class AuditLog(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.action} by {self.user.username if self.user else 'System'}"


# ----------------------------------------------------------------------
# PHASE 5 MODELS: FORECASTING, DR, DEVICES, STORAGE, OPTIMIZATION & SCENARIOS
# ----------------------------------------------------------------------

class ForecastRecord(models.Model):
    TARGET_TYPES = [
        ('consumption', 'Energy Consumption (kWh)'),
        ('demand', 'Peak Demand (kW)'),
        ('solar', 'Renewable Solar Generation (kWh)'),
    ]
    HORIZON_CHOICES = [
        ('24h', '24-Hour Ahead'),
        ('7d', '7-Day Ahead'),
        ('30d', '30-Day Ahead'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='forecasts')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='forecasts')
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, related_name='forecasts', null=True, blank=True)
    target_type = models.CharField(max_length=30, choices=TARGET_TYPES, default='consumption')
    forecast_timestamp = models.DateTimeField(default=timezone.now)
    target_timestamp = models.DateTimeField(db_index=True)
    forecast_value = models.DecimalField(max_digits=12, decimal_places=2)
    lower_bound = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    upper_bound = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    model_version = models.CharField(max_length=50, default='v1.0-baseline-moving-avg')
    horizon = models.CharField(max_length=10, choices=HORIZON_CHOICES, default='24h')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['target_timestamp']
        indexes = [
            models.Index(fields=['facility', 'target_type', 'target_timestamp']),
        ]

    def __str__(self):
        return f"Forecast [{self.facility.name}] @ {self.target_timestamp}: {self.forecast_value} ({self.target_type})"


class DemandResponseEvent(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft Recommendation'),
        ('SCHEDULED', 'Scheduled'),
        ('ACTIVE', 'Active Event'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('FAILED', 'Execution Failed'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High / Critical Peak'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='dr_events')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='dr_events')
    event_name = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    target_reduction_kw = models.DecimalField(max_digits=10, decimal_places=2)
    baseline_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    actual_reduction_kw = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    trigger_source = models.CharField(max_length=100, default='Automated Peak Prediction')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_dr_events')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_dr_events')
    execution_timestamp = models.DateTimeField(null=True, blank=True)
    completion_timestamp = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"DR Event [{self.event_name}] - {self.facility.name} ({self.status})"


class Device(models.Model):
    DEVICE_TYPES = [
        ('meter', 'Smart Electricity Meter'),
        ('submeter', 'Sub-metering Panel'),
        ('inverter', 'Solar PV Inverter'),
        ('battery_bess', 'BESS Battery Storage Unit'),
        ('gateway', 'IoT Edge Gateway'),
        ('sensor', 'Environmental Sensor'),
    ]
    PROTOCOL_CHOICES = [
        ('modbus_tcp', 'Modbus TCP'),
        ('modbus_rtu', 'Modbus RTU'),
        ('bacnet_ip', 'BACnet/IP'),
        ('mqtt', 'MQTT Telemetry'),
        ('simulator', 'Simulator Adapter'),
    ]
    STATUS_CHOICES = [
        ('online', 'Online / Normal'),
        ('warning', 'Warning / Communication Glitch'),
        ('offline', 'Offline / Comm Failure'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='devices')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='devices')
    name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=30, choices=DEVICE_TYPES, default='meter')
    protocol = models.CharField(max_length=30, choices=PROTOCOL_CHOICES, default='modbus_tcp')
    host = models.CharField(max_length=255, blank=True, default='')
    port = models.IntegerField(default=502)
    connection_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='online')
    last_seen = models.DateTimeField(null=True, blank=True)
    firmware_version = models.CharField(max_length=50, blank=True, default='v1.0')
    manufacturer = models.CharField(max_length=100, blank=True, default='GreenGrid Hardware')
    model_number = models.CharField(max_length=100, blank=True, default='GG-EDG-2000')
    serial_number = models.CharField(max_length=100, unique=True)
    is_enabled = models.BooleanField(default=True)
    config_metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Device {self.name} [{self.serial_number}] ({self.protocol})"


class StorageAsset(models.Model):
    OPERATING_CHOICES = [
        ('charging', 'Charging'),
        ('discharging', 'Discharging'),
        ('standby', 'Standby'),
        ('maintenance', 'Maintenance / Offline'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='storage_assets')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='storage_assets')
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True, related_name='storage_assets')
    name = models.CharField(max_length=255)
    capacity_kwh = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    max_charge_kw = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    max_discharge_kw = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    current_soc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)
    min_soc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    max_soc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=95.00)
    efficiency_percent = models.DecimalField(max_digits=5, decimal_places=2, default=92.00)
    operating_status = models.CharField(max_length=20, choices=OPERATING_CHOICES, default='standby')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"BESS {self.name} ({self.capacity_kwh} kWh) - SOC {self.current_soc_percent}%"


class OptimizationRecommendation(models.Model):
    TYPE_CHOICES = [
        ('peak_shaving', 'Peak Demand Shaving'),
        ('load_shifting', 'TOU Load Shifting'),
        ('battery_dispatch', 'BESS Battery Storage Dispatch'),
        ('solar_self_consumption', 'Maximize Renewable Self-Consumption'),
        ('demand_threshold', 'Demand Threshold Alert Prevention'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='recommendations')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='recommendations')
    recommendation_type = models.CharField(max_length=40, choices=TYPE_CHOICES, default='peak_shaving')
    time_window_start = models.DateTimeField()
    time_window_end = models.DateTimeField()
    current_condition = models.TextField()
    suggested_action = models.TextField()
    expected_energy_impact_kwh = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    expected_demand_impact_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    expected_cost_impact = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.85)
    reason = models.TextField()
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Recommendation [{self.get_recommendation_type_display()}] - {self.facility.name}"


class ScenarioSimulation(models.Model):
    TYPE_CHOICES = [
        ('load_shift', 'Shift Peak Load Percentage'),
        ('demand_reduction', 'Facility Demand Reduction'),
        ('add_solar', 'Add Solar Capacity (kW)'),
        ('add_battery', 'Add Battery BESS Storage (kWh)'),
        ('tariff_change', 'Compare Alternative Tariff'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='scenarios')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='scenarios')
    name = models.CharField(max_length=255)
    scenario_type = models.CharField(max_length=40, choices=TYPE_CHOICES, default='load_shift')
    parameters = models.JSONField(default=dict, blank=True)

    baseline_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    simulated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    baseline_kwh = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    simulated_kwh = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    baseline_peak_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    simulated_peak_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    cost_savings = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    kwh_savings = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    demand_savings_kw = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Simulation [{self.name}] - {self.facility.name} (Savings: ${self.cost_savings})"


# ----------------------------------------------------------------------
# PHASE 6 MODELS: AUTOMATION, COMMANDS, ML LIFECYCLE, CARBON, REPORTS, WEBHOOKS
# ----------------------------------------------------------------------

class AutomationConfig(models.Model):
    MODE_CHOICES = [
        ('manual', 'Manual Execution Only'),
        ('approval_required', 'Approval Required (Default)'),
        ('automated', 'Automated Execution'),
    ]
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='automation_config')
    automation_enabled = models.BooleanField(default=True, help_text='Global emergency stop toggle for automated control commands')
    mode = models.CharField(max_length=30, choices=MODE_CHOICES, default='approval_required')
    max_daily_automated_commands = models.IntegerField(default=50)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Automation Config [{self.organization.code}] - Enabled: {self.automation_enabled} ({self.mode})"


class DeviceSafetyPolicy(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='safety_policies')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='safety_policies', null=True, blank=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='safety_policies', null=True, blank=True)
    min_battery_soc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    max_battery_soc_percent = models.DecimalField(max_digits=5, decimal_places=2, default=95.00)
    max_charge_power_kw = models.DecimalField(max_digits=10, decimal_places=2, default=250.00)
    max_discharge_power_kw = models.DecimalField(max_digits=10, decimal_places=2, default=250.00)
    max_hvac_setpoint_change_deg = models.DecimalField(max_digits=4, decimal_places=1, default=3.0)
    max_command_duration_minutes = models.IntegerField(default=120)
    operating_hours_start = models.TimeField(null=True, blank=True)
    operating_hours_end = models.TimeField(null=True, blank=True)
    emergency_shutdown_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        scope = self.device.name if self.device else (self.facility.name if self.facility else self.organization.name)
        return f"Safety Policy for {scope}"


class ControlCommand(models.Model):
    COMMAND_TYPES = [
        ('set_bess_soc_limit', 'Set BESS SOC Threshold'),
        ('bess_charge', 'BESS Charge Directive'),
        ('bess_discharge', 'BESS Discharge Directive'),
        ('hvac_setpoint', 'HVAC Temperature Setpoint'),
        ('curtail_solar', 'Solar Generation Curtailment'),
        ('emergency_stop', 'Emergency Safety Shutdown'),
        ('reset_gateway', 'Reset Protocol Gateway'),
    ]
    VALIDATION_CHOICES = [
        ('PASSED', 'Validation Passed'),
        ('REJECTED', 'Validation Failed'),
        ('PENDING_VALIDATION', 'Pending Validation'),
    ]
    APPROVAL_CHOICES = [
        ('NOT_REQUIRED', 'No Approval Required'),
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    EXECUTION_CHOICES = [
        ('REQUESTED', 'Requested'),
        ('VALIDATING', 'Validating'),
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('EXECUTING', 'Executing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='control_commands')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='control_commands')
    command_type = models.CharField(max_length=40, choices=COMMAND_TYPES)
    requested_value = models.CharField(max_length=255)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_commands')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_commands')
    validation_status = models.CharField(max_length=30, choices=VALIDATION_CHOICES, default='PENDING_VALIDATION')
    approval_status = models.CharField(max_length=30, choices=APPROVAL_CHOICES, default='PENDING')
    execution_status = models.CharField(max_length=30, choices=EXECUTION_CHOICES, default='REQUESTED')
    rejection_reason = models.TextField(blank=True, default='')
    result_payload = models.JSONField(default=dict, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"Command [{self.get_command_type_display()}] -> {self.device.name} ({self.execution_status})"


class MLModelVersion(models.Model):
    ALGORITHM_CHOICES = [
        ('baseline_moving_avg', 'Statistical Moving-Average Baseline'),
        ('linear_regression', 'Linear / Ridge Regression'),
        ('gradient_boosting', 'Gradient Boosting Regressor'),
        ('random_forest', 'Random Forest Regressor'),
    ]
    STATUS_CHOICES = [
        ('TRAINED', 'Trained'),
        ('VALIDATED', 'Validated'),
        ('DEPLOYED', 'Deployed / Active'),
        ('DEPRECATED', 'Deprecated'),
        ('FAILED', 'Training Failed'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='ml_models')
    model_name = models.CharField(max_length=100, default='Energy Demand Predictor')
    algorithm = models.CharField(max_length=40, choices=ALGORITHM_CHOICES, default='gradient_boosting')
    version_tag = models.CharField(max_length=50)
    training_period_start = models.DateTimeField()
    training_period_end = models.DateTimeField()
    dataset_sample_count = models.IntegerField(default=0)
    features_used = models.JSONField(default=list)
    mae = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    rmse = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    mape = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    r2_score = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    hyperparameters = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRAINED')
    model_owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ML Model {self.model_name} [{self.version_tag}] ({self.algorithm}) - MAE: {self.mae or 'N/A'}"


class ForecastDriftLog(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='forecast_drift_logs')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='forecast_drift_logs')
    model_version = models.ForeignKey(MLModelVersion, on_delete=models.SET_NULL, null=True, blank=True)
    mae_threshold = models.DecimalField(max_digits=10, decimal_places=2)
    actual_mae = models.DecimalField(max_digits=10, decimal_places=2)
    drift_detected = models.BooleanField(default=False)
    alert_generated = models.BooleanField(default=False)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-evaluated_at']

    def __str__(self):
        return f"Drift Evaluation [{self.facility.name}] - MAE: {self.actual_mae} (Drift: {self.drift_detected})"


class OptimizationOutcomeTrack(models.Model):
    STATUS_CHOICES = [
        ('MONITORING', 'Outcome Monitoring Active'),
        ('COMPLETED', 'Evaluation Completed'),
        ('DISCREPANCY', 'Outcome Discrepancy Flagged'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='optimization_outcomes')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='optimization_outcomes')
    recommendation = models.ForeignKey(OptimizationRecommendation, on_delete=models.SET_NULL, null=True, blank=True)
    action_taken = models.CharField(max_length=255)
    expected_kwh_impact = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    actual_kwh_impact = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_cost_impact = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    actual_cost_impact = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    variance_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='MONITORING')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Outcome Track [{self.facility.name}] - Expected ${self.expected_cost_impact} vs Actual ${self.actual_cost_impact or 0}"


class EmissionFactor(models.Model):
    SCOPE_CHOICES = [
        ('scope_1', 'Scope 1 - Direct Onsite Emissions'),
        ('scope_2', 'Scope 2 - Indirect Electricity Grid Emissions'),
        ('scope_3', 'Scope 3 - Supply Chain & Other Indirect'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='emission_factors')
    region = models.CharField(max_length=100, default='US-TX')
    source_name = models.CharField(max_length=255, default='eGRID Regional Grid Factor')
    factor_kg_co2_per_kwh = models.DecimalField(max_digits=8, decimal_places=4, default=0.3850)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='scope_2')
    unit = models.CharField(max_length=20, default='kgCO2/kWh')
    effective_from = models.DateField(auto_now_add=True)

    expiration_date = models.DateField(null=True, blank=True)
    reference_source = models.CharField(max_length=255, blank=True, default='EPA eGRID / IEA')
    version = models.CharField(max_length=20, default='1.0')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        return f"Emission Factor [{self.region}] {self.factor_kg_co2_per_kwh} {self.unit} ({self.organization.code})"


class ScheduledReport(models.Model):
    REPORT_TYPES = [
        ('energy', 'Energy Consumption & Load Report'),
        ('demand', 'Peak Demand & Threshold Analysis'),
        ('cost', 'Utility Cost & TOU Charge Breakdown'),
        ('billing', 'Bill Reconciliation & Discrepancy Summary'),
        ('renewable', 'Renewable PV & Self-Consumption Intelligence'),
        ('carbon', 'Carbon Footprint & Emissions Accounting'),
        ('device_health', 'IoT Device Health & Diagnostic Log'),
        ('forecast_accuracy', 'Forecast Accuracy & ML Model Drift'),
        ('demand_response', 'Demand Response Performance Report'),
        ('optimization', 'Closed-Loop Optimization Impact'),
    ]
    FREQUENCY_CHOICES = [
        ('daily', 'Daily Digest'),
        ('weekly', 'Weekly Operational Report'),
        ('monthly', 'Monthly Executive Summary'),
    ]
    FORMAT_CHOICES = [
        ('csv', 'CSV Data Export'),
        ('pdf', 'Printable PDF / HTML Document'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='scheduled_reports')
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=40, choices=REPORT_TYPES, default='energy')
    facility_scope = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='scheduled_reports', null=True, blank=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='weekly')
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='csv')
    recipients = models.JSONField(default=list, help_text='List of recipient email addresses')
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Scheduled Report [{self.title}] ({self.frequency}) - {self.organization.code}"


class WebhookEndpoint(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='webhooks')
    name = models.CharField(max_length=255)
    url = models.URLField()
    secret_key = models.CharField(max_length=128)
    events_subscribed = models.JSONField(default=list, help_text='List of event keys, e.g. ["critical_alert", "device_offline"]')
    is_active = models.BooleanField(default=True)
    failure_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Webhook [{self.name}] -> {self.url} ({self.organization.code})"


class WebhookDeliveryLog(models.Model):
    webhook_endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='delivery_logs')
    event_type = models.CharField(max_length=100)
    event_id = models.CharField(max_length=64)
    payload = models.JSONField(default=dict)
    status_code = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default='')
    signature = models.CharField(max_length=128, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Delivery {self.event_type} to {self.webhook_endpoint.name} - Success: {self.success}"


class AlertEscalationPolicy(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical Alert'),
        ('warning', 'Warning'),
        ('info', 'Informational'),
    ]
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='escalation_policies')
    name = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='critical')
    escalation_timeout_minutes = models.IntegerField(default=30)
    notify_roles = models.JSONField(default=list, help_text='List of role strings to notify upon escalation')
    auto_escalate = models.BooleanField(default=True)

    def __str__(self):
        return f"Escalation Policy [{self.name}] - {self.severity} after {self.escalation_timeout_minutes}m"

