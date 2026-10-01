from decimal import Decimal
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Organization, Facility, TariffPlan, TariffRate, TariffTimePeriod, DemandChargeRule, UtilityBill

class Command(BaseCommand):
    help = 'Generate realistic demo tariff plans, TOU rates, demand rules, and utility bills marked with is_demo_data=True.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== GENERATING DEMO BILLING DATA ==="))

        org = Organization.objects.first()
        if not org:
            self.stderr.write(self.style.ERROR("No Organization found. Please register or run seed_demo_data first."))
            return

        facility = Facility.objects.filter(organization=org).first()
        if not facility:
            facility = Facility.objects.create(
                organization=org,
                name=f"{org.name} Main Campus",
                facility_type='commercial',
                square_footage=85000,
                city='Austin',
                state='TX'
            )

        # 1. Create Demo Tariff Plan
        tariff, created = TariffPlan.objects.get_or_create(
            organization=org,
            name="Commercial TOU & Demand Tariff - Rate GS-3",
            defaults={
                "utility_name": "Austin Energy Power & Light",
                "utility_account_reference": "AE-88942-019",
                "currency": org.currency or "INR",
                "billing_cycle": "monthly",
                "effective_from": datetime.date(2025, 1, 1),
                "status": "active",
                "fixed_monthly_charge": Decimal('250.00'),
                "tax_percentage": Decimal('8.25'),
                "is_demo_data": True
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Tariff Plan: {tariff.name}"))

            # Create Rates
            TariffRate.objects.create(
                tariff_plan=tariff,
                name="Standard Baseline Energy Rate",
                rate_type="ENERGY",
                unit_rate=Decimal('0.1200'),
                unit="kWh"
            )

            # Create TOU Periods
            # Off-Peak: 22:00 - 06:00 @ $0.08/kWh
            TariffTimePeriod.objects.create(
                tariff_plan=tariff,
                name="Off-Peak Night Rate",
                period_type="OFF_PEAK",
                start_time=datetime.time(22, 0),
                end_time=datetime.time(6, 0),
                days_of_week="0,1,2,3,4,5,6",
                rate=Decimal('0.0800'),
                priority=1
            )
            # Shoulder: 06:00 - 12:00 & 18:00 - 22:00 @ $0.13/kWh
            TariffTimePeriod.objects.create(
                tariff_plan=tariff,
                name="Shoulder Standard Rate",
                period_type="SHOULDER",
                start_time=datetime.time(6, 0),
                end_time=datetime.time(12, 0),
                days_of_week="0,1,2,3,4",
                rate=Decimal('0.1300'),
                priority=2
            )
            # On-Peak: 12:00 - 18:00 @ $0.22/kWh
            TariffTimePeriod.objects.create(
                tariff_plan=tariff,
                name="On-Peak Afternoon Rate",
                period_type="ON_PEAK",
                start_time=datetime.time(12, 0),
                end_time=datetime.time(18, 0),
                days_of_week="0,1,2,3,4",
                rate=Decimal('0.2200'),
                priority=3
            )

            # Create Demand Charge Rule
            DemandChargeRule.objects.create(
                tariff_plan=tariff,
                rate_per_kw=Decimal('15.50'),
                threshold_kw=Decimal('50.00'),
                billing_period="monthly",
                minimum_demand_kw=Decimal('0.00'),
                ratchet_percentage=Decimal('0.00')
            )

        # 2. Create Demo Utility Bills (Monthly historical bills)
        today = timezone.now().date()
        bill_samples = [
            {
                "inv": "INV-2026-08",
                "start": datetime.date(2026, 8, 1),
                "end": datetime.date(2026, 8, 31),
                "billed_kwh": Decimal('124500.00'),
                "billed_kw": Decimal('380.50'),
                "billed_amt": Decimal('21850.00'),
                "calc_kwh": Decimal('124200.00'),
                "calc_kw": Decimal('380.50'),
                "calc_amt": Decimal('21680.00'),
                "status": "MATCHED",
                "variance_amt": Decimal('170.00'),
                "variance_pct": Decimal('0.78')
            },
            {
                "inv": "INV-2026-07",
                "start": datetime.date(2026, 7, 1),
                "end": datetime.date(2026, 7, 31),
                "billed_kwh": Decimal('138900.00'),
                "billed_kw": Decimal('420.00'),
                "billed_amt": Decimal('26400.00'),
                "calc_kwh": Decimal('131000.00'),
                "calc_kw": Decimal('390.00'),
                "calc_amt": Decimal('24150.00'),
                "status": "VARIANCE",
                "variance_amt": Decimal('2250.00'),
                "variance_pct": Decimal('8.52')
            },
            {
                "inv": "INV-2026-06",
                "start": datetime.date(2026, 6, 1),
                "end": datetime.date(2026, 6, 30),
                "billed_kwh": Decimal('112000.00'),
                "billed_kw": Decimal('340.00'),
                "billed_amt": Decimal('18900.00'),
                "calc_kwh": Decimal('111800.00'),
                "calc_kw": Decimal('340.00'),
                "calc_amt": Decimal('18850.00'),
                "status": "MATCHED",
                "variance_amt": Decimal('50.00'),
                "variance_pct": Decimal('0.26')
            }
        ]

        for sample in bill_samples:
            bill, created_bill = UtilityBill.objects.get_or_create(
                facility=facility,
                invoice_number=sample["inv"],
                defaults={
                    "organization": org,
                    "tariff_plan": tariff,
                    "utility_provider": tariff.utility_name,
                    "account_reference": tariff.utility_account_reference,
                    "billing_period_start": sample["start"],
                    "billing_period_end": sample["end"],
                    "invoice_date": sample["end"],
                    "due_date": sample["end"] + datetime.timedelta(days=20),
                    "total_consumption_kwh": sample["billed_kwh"],
                    "peak_demand_kw": sample["billed_kw"],
                    "total_cost_usd": sample["billed_amt"],
                    "billed_consumption_kwh": sample["billed_kwh"],
                    "billed_demand_kw": sample["billed_kw"],
                    "billed_amount": sample["billed_amt"],
                    "calculated_consumption_kwh": sample["calc_kwh"],
                    "calculated_demand_kw": sample["calc_kw"],
                    "calculated_amount": sample["calc_amt"],
                    "energy_charge": sample["calc_amt"] * Decimal('0.60'),
                    "demand_charge": sample["calc_amt"] * Decimal('0.30'),
                    "fixed_charge": Decimal('250.00'),
                    "tax_amount": sample["calc_amt"] * Decimal('0.0825'),
                    "variance_amount": sample["variance_amt"],
                    "variance_percentage": sample["variance_pct"],
                    "reconciliation_status": sample["status"],
                    "status": "paid",
                    "source": "MANUAL",
                    "is_demo_data": True
                }
            )
            if created_bill:
                self.stdout.write(self.style.SUCCESS(f"Created Utility Bill: {bill.invoice_number} ({bill.reconciliation_status})"))

        # 3. Create Demo Devices (Phase 5)
        from core.models import Device, StorageAsset, DemandResponseEvent, OptimizationRecommendation
        from core.services.forecasting import ForecastEngine

        dev1, created_dev1 = Device.objects.get_or_create(
            organization=org,
            serial_number="MODBUS-TCP-GW-8801",
            defaults={
                "facility": facility,
                "name": "Main Substation Modbus Gateway",
                "device_type": "gateway",
                "protocol": "modbus_tcp",
                "host": "192.168.1.100",
                "port": 502,
                "connection_status": "online",
                "last_seen": timezone.now(),
                "manufacturer": "Schneider Electric",
                "model_number": "EGX300 Gateway"
            }
        )
        if created_dev1:
            self.stdout.write(self.style.SUCCESS(f"Created Demo Device: {dev1.name}"))

        dev2, created_dev2 = Device.objects.get_or_create(
            organization=org,
            serial_number="BACNET-IP-BMS-4011",
            defaults={
                "facility": facility,
                "name": "HVAC Chiller Plant BACnet Controller",
                "device_type": "sensor",
                "protocol": "bacnet_ip",
                "host": "192.168.1.150",
                "port": 47808,
                "connection_status": "online",
                "last_seen": timezone.now(),
                "manufacturer": "Johnson Controls",
                "model_number": "Metasys NAE"
            }
        )
        if created_dev2:
            self.stdout.write(self.style.SUCCESS(f"Created Demo Device: {dev2.name}"))

        # 4. Create Demo BESS Storage Asset
        bess, created_bess = StorageAsset.objects.get_or_create(
            facility=facility,
            name="Main Campus 500kWh BESS Battery Storage",
            defaults={
                "organization": org,
                "device": dev1,
                "capacity_kwh": Decimal('500.00'),
                "max_charge_kw": Decimal('125.00'),
                "max_discharge_kw": Decimal('125.00'),
                "current_soc_percent": Decimal('78.50'),
                "min_soc_percent": Decimal('10.00'),
                "max_soc_percent": Decimal('95.00'),
                "operating_status": "standby"
            }
        )
        if created_bess:
            self.stdout.write(self.style.SUCCESS(f"Created Demo BESS Asset: {bess.name}"))

        # 5. Create Demo Demand Response Event
        dr, created_dr = DemandResponseEvent.objects.get_or_create(
            facility=facility,
            event_name="Summer Critical Peak Demand Response",
            defaults={
                "organization": org,
                "start_time": timezone.now() + datetime.timedelta(hours=4),
                "end_time": timezone.now() + datetime.timedelta(hours=8),
                "target_reduction_kw": Decimal('75.00'),
                "baseline_kw": Decimal('380.00'),
                "status": "SCHEDULED",
                "priority": "high",
                "trigger_source": "Automated Peak Demand Warning"
            }
        )
        if created_dr:
            self.stdout.write(self.style.SUCCESS(f"Created Demo DR Event: {dr.event_name}"))

        # 6. Generate Baseline Forecast Records
        engine = ForecastEngine()
        engine.generate_facility_forecast(facility, horizon='24h', target_type='consumption')
        self.stdout.write(self.style.SUCCESS("Generated 24-Hour Energy Forecast records."))

        self.stdout.write(self.style.SUCCESS("Demo Phase 5 data generation completed."))
