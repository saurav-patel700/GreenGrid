import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Organization, Facility, Meter, EnergyReading
from core.services.data_quality import evaluate_reading_quality

class Command(BaseCommand):
    help = 'Generates 30 days of coherent, realistic telemetry for GreenGrid meters'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='Number of days of historical telemetry to generate')

    def handle(self, *args, **options):
        days = options['days']
        self.stdout.write(self.style.SUCCESS(f'Generating {days} days of coherent telemetry...'))

        orgs = Organization.objects.all()
        if not orgs.exists():
            self.stdout.write(self.style.ERROR('No organizations found. Run seed_demo_data first.'))
            return

        now = timezone.now()
        total_created = 0

        for org in orgs:
            facilities = list(Facility.objects.filter(organization=org))
            for fac in facilities:
                meters = list(Meter.objects.filter(facility=fac))
                if not meters:
                    m1 = Meter.objects.create(
                        facility=fac,
                        name=f"{fac.name} Main Grid Meter",
                        meter_number=f"MTR-{fac.id}-MAIN-01",
                        meter_type="electricity",
                        status="online"
                    )
                    m2 = Meter.objects.create(
                        facility=fac,
                        name=f"{fac.name} Solar Inverter Meter",
                        meter_number=f"MTR-{fac.id}-SOLAR-01",
                        meter_type="solar_inverter",
                        status="online"
                    )
                    meters = [m1, m2]

                readings_to_create = []
                for m in meters:
                    # Fetch existing timestamps for this meter to prevent duplicates
                    existing_ts = set(EnergyReading.objects.filter(meter=m).values_list('timestamp', flat=True))

                    total_hours = days * 24
                    for h in range(total_hours, 0, -1):
                        ts = (now - timedelta(hours=h)).replace(minute=0, second=0, microsecond=0)
                        if ts in existing_ts:
                            continue

                        hour_of_day = ts.hour
                        is_weekend = ts.weekday() >= 5

                        if 8 <= hour_of_day <= 18:
                            load_mult = 1.8 if not is_weekend else 0.9
                        elif 6 <= hour_of_day < 8 or 18 < hour_of_day <= 22:
                            load_mult = 1.2 if not is_weekend else 0.7
                        else:
                            load_mult = 0.5

                        if fac.facility_type == 'manufacturing':
                            load_mult *= 1.6

                        if m.meter_type == 'solar_inverter':
                            if 6 <= hour_of_day <= 19:
                                sun_factor = max(0.0, 1.0 - ((hour_of_day - 13) / 6.0) ** 2)
                                solar_kw = (150.0 + random.uniform(-10.0, 20.0)) * sun_factor
                            else:
                                solar_kw = 0.0

                            cons = solar_kw * 1.0
                            demand = solar_kw
                            cost = 0.0
                            source_choice = 'solar'
                            voltage = 240.0 + random.uniform(-2.0, 2.0) if solar_kw > 0 else 0.0
                            pf = 0.98 if solar_kw > 0 else 0.0
                        else:
                            base_kw = (120.0 + random.uniform(-15.0, 25.0)) * load_mult
                            cons = base_kw * 1.0
                            demand = base_kw * random.uniform(1.05, 1.25)
                            cost = cons * 0.14
                            source_choice = 'grid'
                            voltage = 240.0 + random.uniform(-4.0, 4.0)
                            pf = round(random.uniform(0.92, 0.99), 3)

                        is_anomaly = random.random() < 0.01
                        if is_anomaly:
                            demand *= 2.2
                            voltage = 98.0

                        quality_status, _ = evaluate_reading_quality(
                            consumption=cons,
                            demand=demand,
                            voltage=voltage,
                            power_factor=pf,
                            reading_timestamp=ts
                        )

                        curr = round(Decimal(str(demand / (voltage or 240.0) * 1000.0 / 1.732 / 0.95)), 2) if (voltage and demand) else None

                        readings_to_create.append(EnergyReading(
                            meter=m,
                            timestamp=ts,
                            consumption=round(Decimal(str(cons)), 2),
                            demand=round(Decimal(str(demand)), 2),
                            cost_estimate=round(Decimal(str(cost)), 2),
                            unit='kWh',
                            source=source_choice,
                            voltage=round(Decimal(str(voltage)), 2) if voltage else None,
                            current=curr,
                            power_factor=round(Decimal(str(pf)), 3) if pf else None,
                            quality_status=quality_status,
                            raw_payload={"generated_by": "generate_demo_telemetry", "hour": hour_of_day},
                            is_demo_data=True
                        ))

                if readings_to_create:
                    EnergyReading.objects.bulk_create(readings_to_create, batch_size=500)
                    total_created += len(readings_to_create)
                    m_latest = readings_to_create[-1]
                    Meter.objects.filter(id=m_latest.meter_id).update(last_reading_at=m_latest.timestamp)

        self.stdout.write(self.style.SUCCESS(f"Successfully generated {total_created} telemetry records."))
