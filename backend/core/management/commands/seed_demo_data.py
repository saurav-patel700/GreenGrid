import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from core.models import (
    Organization, UserProfile, Facility, Meter,
    EnergyReading, UtilityBill, TariffPlan, TariffRate, TariffTimePeriod, DemandChargeRule,
    RenewableAsset, StorageAsset, EnergySource, EmissionFactor, Alert,
    ForecastRecord, DemandResponseEvent, Device, DeviceSafetyPolicy, ControlCommand,
    OptimizationRecommendation, MLModelVersion, ScenarioSimulation
)
from core.services.data_quality import evaluate_reading_quality
from core.services.automation import get_or_create_automation_config

class Command(BaseCommand):
    help = 'Seeds database with 30 days of realistic, coherent EMIS telemetry and operational demo data for GreenGrid'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='Number of historical days of telemetry to generate (default: 30)')

    def handle(self, *args, **options):
        days = options['days']
        self.stdout.write(self.style.SUCCESS(f'Seeding GreenGrid database with {days} days of realistic EMIS telemetry and operational data...'))

        # 1. Organization
        org, _ = Organization.objects.get_or_create(
            code='APEX-ENERGY-ORG',
            defaults={
                'name': 'Apex Global Enterprise',
                'description': 'Multi-facility commercial & industrial corporate entity',
                'timezone': 'America/Chicago',
                'currency': 'INR',
                'energy_unit': 'kWh',
                'power_unit': 'kW'
            }
        )

        # 2. Demo User Profile
        user, user_created = User.objects.get_or_create(
            username='demomanager',
            defaults={
                'email': 'manager@apexenterprise.demo',
                'first_name': 'Alex',
                'last_name': 'Vance',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if user_created:
            user.set_password('demo1234')
            user.save()

        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'organization': org,
                'role': 'admin',
                'department': 'Global Sustainability & Energy Operations',
                'phone': '+91 98765 43210'
            }
        )

        target_orgs = list(Organization.objects.all())
        if org not in target_orgs:
            target_orgs.append(org)

        # 3. Seed Emission Factors
        for target_org in target_orgs:
            EmissionFactor.objects.get_or_create(
                organization=target_org,
                region='US-TX',
                defaults={
                    'source_name': 'EPA eGRID ERCOT Regional Grid Factor',
                    'factor_kg_co2_per_kwh': Decimal('0.3850'),
                    'scope': 'scope_2',
                    'unit': 'kgCO2/kWh',
                    'is_active': True,
                    'reference_source': 'EPA eGRID 2024 Release'
                }
            )

        # 4. Facilities
        facilities_data_templates = [
            {'name': 'Innovation Tech Center', 'type': 'commercial', 'address': '100 Energy Way', 'city': 'Austin', 'state': 'TX', 'sqft': 120000, 'baseline': 14.20},
            {'name': 'Eastside Manufacturing Hub', 'type': 'manufacturing', 'address': '450 Industrial Pkwy', 'city': 'Round Rock', 'state': 'TX', 'sqft': 250000, 'baseline': 24.50},
            {'name': 'North Campus Operations', 'type': 'campus', 'address': '800 University Blvd', 'city': 'Georgetown', 'state': 'TX', 'sqft': 180000, 'baseline': 12.80},
            {'name': 'South Distribution Depot', 'type': 'retail', 'address': '1200 Logistics Dr', 'city': 'San Marcos', 'state': 'TX', 'sqft': 95000, 'baseline': 9.80}
        ]

        meters = []

        for target_org in target_orgs:
            org_facs = list(Facility.objects.filter(organization=target_org))
            if not org_facs:
                for item in facilities_data_templates:
                    fac_name = f"{item['name']}" if target_org == org else f"{target_org.name} - {item['name']}"
                    fac = Facility.objects.create(
                        organization=target_org,
                        name=fac_name,
                        facility_type=item['type'],
                        address=item['address'],
                        city=item['city'],
                        state=item['state'],
                        square_footage=item['sqft'],
                        baseline_kwh_sqft=item['baseline'],
                        status='active'
                    )
                    org_facs.append(fac)

            # 5. Renewable Assets & Meters per Facility
            for fac in org_facs:
                # Renewable Solar PV & BESS Storage Assets
                RenewableAsset.objects.get_or_create(
                    facility=fac,
                    name=f'{fac.name} Rooftop Solar PV',
                    defaults={
                        'asset_type': 'solar_pv',
                        'capacity_kw': Decimal('350.00'),
                        'current_output_kw': Decimal('280.00'),
                        'status': 'active'
                    }
                )

                StorageAsset.objects.get_or_create(
                    facility=fac,
                    name=f'{fac.name} BESS Storage System',
                    defaults={
                        'organization': fac.organization,
                        'capacity_kwh': Decimal('500.00'),
                        'max_charge_kw': Decimal('100.00'),
                        'max_discharge_kw': Decimal('100.00'),
                        'current_soc_percent': Decimal('68.50'),
                        'operating_status': 'discharging'
                    }
                )

                # Meters
                m_main, _ = Meter.objects.get_or_create(
                    facility=fac,
                    meter_number=f'MTR-{fac.id}-MAIN-01',
                    defaults={
                        'name': f'{fac.name} Main Utility Feed',
                        'meter_type': 'electricity',
                        'status': 'online',
                        'location_description': 'Main Switchgear Room 101'
                    }
                )
                meters.append(m_main)

                m_hvac, _ = Meter.objects.get_or_create(
                    facility=fac,
                    meter_number=f'MTR-{fac.id}-SUB-HVAC',
                    defaults={
                        'name': f'{fac.name} HVAC & Chiller Loop',
                        'meter_type': 'submeter',
                        'status': 'online',
                        'location_description': 'Roof Level Mechanical Yard'
                    }
                )
                meters.append(m_hvac)

                m_solar, _ = Meter.objects.get_or_create(
                    facility=fac,
                    meter_number=f'MTR-{fac.id}-SOLAR-01',
                    defaults={
                        'name': f'{fac.name} Solar PV Inverter Feed',
                        'meter_type': 'solar_inverter',
                        'status': 'online',
                        'location_description': 'Rooftop Inverter Cabinet'
                    }
                )
                meters.append(m_solar)

        # 6. Seed Tariffs
        for target_org in target_orgs:
            tariff, _ = TariffPlan.objects.get_or_create(
                organization=target_org,
                name='Austin Commercial TOU Tariff',
                defaults={
                    'utility_name': 'Austin Energy & Power',
                    'billing_cycle': 'monthly',
                    'effective_from': '2026-01-01',
                    'status': 'active',
                    'fixed_monthly_charge': Decimal('250.00'),
                    'tax_percentage': Decimal('8.25')
                }
            )

            TariffRate.objects.get_or_create(
                tariff_plan=tariff,
                name='Baseline Energy Rate',
                defaults={
                    'rate_type': 'ENERGY',
                    'unit_rate': Decimal('0.1150'),
                    'unit': 'kWh'
                }
            )

            TariffTimePeriod.objects.get_or_create(
                tariff_plan=tariff,
                name='On-Peak Summer Window (12 PM - 7 PM)',
                defaults={
                    'period_type': 'ON_PEAK',
                    'start_time': '12:00:00',
                    'end_time': '19:00:00',
                    'rate': Decimal('0.1850'),
                    'priority': 2
                }
            )

            TariffTimePeriod.objects.get_or_create(
                tariff_plan=tariff,
                name='Off-Peak Window (Night)',
                defaults={
                    'period_type': 'OFF_PEAK',
                    'start_time': '00:00:00',
                    'end_time': '08:00:00',
                    'rate': Decimal('0.0650'),
                    'priority': 1
                }
            )

            DemandChargeRule.objects.get_or_create(
                tariff_plan=tariff,
                defaults={
                    'rate_per_kw': Decimal('14.50'),
                    'threshold_kw': Decimal('100.00'),
                    'billing_period': 'monthly'
                }
            )

        # 7. Seed 30 Days Telemetry
        now = timezone.now()
        total_hours = days * 24
        readings_to_create = []

        self.stdout.write(f'Generating telemetry for {len(meters)} meters across {len(target_orgs)} orgs ({total_hours} hourly points per meter)...')

        for m in meters:
            existing_ts = set(EnergyReading.objects.filter(meter=m).values_list('timestamp', flat=True))

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

                if m.facility.facility_type == 'manufacturing':
                    load_mult *= 1.6

                if m.meter_type == 'solar_inverter':
                    if 6 <= hour_of_day <= 19:
                        sun_factor = max(0.0, 1.0 - ((hour_of_day - 13) / 6.5) ** 2)
                        solar_kw = (280.0 + random.uniform(-20.0, 30.0)) * sun_factor
                    else:
                        solar_kw = 0.0

                    cons = solar_kw * 1.0
                    demand = solar_kw
                    cost = 0.0
                    source_choice = 'solar'
                    voltage = 240.0 + random.uniform(-2.0, 2.0) if solar_kw > 0 else 0.0
                    pf = 0.98 if solar_kw > 0 else 0.0
                elif m.meter_type == 'submeter':
                    base_kw = (60.0 + random.uniform(-10.0, 15.0)) * load_mult
                    cons = base_kw * 1.0
                    demand = base_kw * random.uniform(1.05, 1.20)
                    cost = cons * 0.12
                    source_choice = 'grid'
                    voltage = 240.0 + random.uniform(-3.0, 3.0)
                    pf = round(random.uniform(0.91, 0.97), 3)
                else:
                    base_kw = (140.0 + random.uniform(-20.0, 30.0)) * load_mult
                    cons = base_kw * 1.0
                    demand = base_kw * random.uniform(1.10, 1.30)
                    cost = cons * 0.14
                    source_choice = 'grid'
                    voltage = 240.0 + random.uniform(-4.0, 4.0)
                    pf = round(random.uniform(0.93, 0.99), 3)

                is_anomaly = random.random() < 0.008
                if is_anomaly:
                    demand *= 2.1
                    voltage = 96.0

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
                    raw_payload={"generated_by": "seed_demo_data", "hour": hour_of_day},
                    is_demo_data=True
                ))

        if readings_to_create:
            EnergyReading.objects.bulk_create(readings_to_create, batch_size=1000)
            self.stdout.write(self.style.SUCCESS(f'Created {len(readings_to_create)} energy readings.'))

            for m in meters:
                latest_reading = EnergyReading.objects.filter(meter=m).order_by('-timestamp').first()
                if latest_reading:
                    m.last_reading_at = latest_reading.timestamp
                    m.save(update_fields=['last_reading_at'])

        # 8. Seed Utility Bills
        all_facilities = list(Facility.objects.all())
        for fac in all_facilities:
            UtilityBill.objects.get_or_create(
                facility=fac,
                invoice_number=f'INV-2026-08-{fac.id}',
                defaults={
                    'organization': fac.organization,
                    'utility_provider': 'Austin Energy & Power',
                    'billing_period_start': '2026-08-01',
                    'billing_period_end': '2026-08-31',
                    'total_consumption_kwh': random.randint(45000, 120000),
                    'peak_demand_kw': random.randint(350, 1450),
                    'total_cost_usd': Decimal(str(round(random.uniform(5200, 16800), 2))),
                    'billed_amount': Decimal(str(round(random.uniform(5200, 16800), 2))),
                    'status': 'paid',
                    'reconciliation_status': 'MATCHED'
                }
            )

        # 9. Seed Alerts
        if all_facilities:
            Alert.objects.get_or_create(
                title='Peak Demand Threshold Warning',
                facility=all_facilities[0],
                defaults={
                    'meter': meters[0] if meters else None,
                    'severity': 'warning',
                    'description': f'{all_facilities[0].name} approached 98.6% of maximum contract demand limit (1,480 kW / 1,500 kW).',
                    'is_resolved': False
                }
            )

            Alert.objects.get_or_create(
                title='Submeter Telemetry Sync Interrupted',
                facility=all_facilities[0],
                defaults={
                    'meter': meters[1] if len(meters) > 1 else None,
                    'severity': 'critical',
                    'description': 'HVAC Submeter lost telemetry sync for over 45 minutes.',
                    'is_resolved': False
                }
            )

        # 10. Seed Demand Response Events
        if len(all_facilities) >= 2:
            DemandResponseEvent.objects.get_or_create(
                event_name='ERCOT Summer Peak Load Shifting Event',
                facility=all_facilities[1],
                defaults={
                    'organization': org,
                    'start_time': now + timedelta(days=1, hours=14),
                    'end_time': now + timedelta(days=1, hours=18),
                    'target_reduction_kw': Decimal('350.00'),
                    'baseline_kw': Decimal('1450.00'),
                    'status': 'SCHEDULED',
                    'priority': 'high',
                    'trigger_source': 'ERCOT Grid High-Cost Signal'
                }
            )

            DemandResponseEvent.objects.get_or_create(
                event_name='Emergency HVAC Load Shedding',
                facility=all_facilities[0],
                defaults={
                    'organization': org,
                    'start_time': now - timedelta(days=2, hours=12),
                    'end_time': now - timedelta(days=2, hours=16),
                    'target_reduction_kw': Decimal('200.00'),
                    'actual_reduction_kw': Decimal('215.50'),
                    'baseline_kw': Decimal('1100.00'),
                    'status': 'COMPLETED',
                    'priority': 'medium',
                    'trigger_source': 'High Peak Demand Alert'
                }
            )

        # 11. Seed Devices & Safety Policies
        for fac in all_facilities:
            dev1, _ = Device.objects.get_or_create(
                serial_number=f'SN-DEV-{fac.id}-01',
                defaults={
                    'name': f'{fac.name} Main Gateway Adapter',
                    'organization': fac.organization,
                    'facility': fac,
                    'device_type': 'gateway',
                    'protocol': 'modbus_tcp',
                    'host': '192.168.1.100',
                    'port': 502,
                    'connection_status': 'online',
                    'last_seen': now
                }
            )

            dev2, _ = Device.objects.get_or_create(
                serial_number=f'SN-DEV-{fac.id}-02',
                defaults={
                    'name': f'{fac.name} Solar PV Inverter Gateway',
                    'organization': fac.organization,
                    'facility': fac,
                    'device_type': 'inverter',
                    'protocol': 'modbus_tcp',
                    'host': '192.168.1.105',
                    'port': 502,
                    'connection_status': 'online',
                    'last_seen': now
                }
            )

            DeviceSafetyPolicy.objects.get_or_create(
                device=dev1,
                defaults={
                    'organization': fac.organization,
                    'facility': fac,
                    'max_charge_power_kw': Decimal('250.00'),
                    'max_discharge_power_kw': Decimal('250.00')
                }
            )

        # 12. Seed Optimization Recommendations
        if all_facilities:
            OptimizationRecommendation.objects.get_or_create(
                facility=all_facilities[0],
                recommendation_type='battery_dispatch',
                defaults={
                    'organization': org,
                    'time_window_start': now,
                    'time_window_end': now + timedelta(hours=4),
                    'current_condition': 'High on-peak grid demand detected during 12:00 PM - 7:00 PM peak window.',
                    'suggested_action': 'Discharge BESS-1 battery storage to shave 250 kW peak load.',
                    'expected_cost_impact': Decimal('420.50'),
                    'reason': 'On-peak grid tariff rate is $0.1850/kWh. BESS discharge will reduce peak demand charge by $420.50.',
                    'is_approved': False
                }
            )

        # 13. Seed Automation Config & ML Model Version with Random Forest Regressor
        get_or_create_automation_config(org)

        for target_org in target_orgs:
            MLModelVersion.objects.get_or_create(
                organization=target_org,
                version_tag='v2.0-rf-random_forest',
                defaults={
                    'model_name': 'DemandPredictor-RandomForest',
                    'algorithm': 'random_forest',
                    'training_period_start': now - timedelta(days=60),
                    'training_period_end': now - timedelta(days=1),
                    'dataset_sample_count': 1440,
                    'features_used': ["hour_of_day", "day_of_week", "is_weekend", "lag_1h_demand", "rolling_avg_demand"],
                    'mae': Decimal('4.8500'),
                    'rmse': Decimal('7.2000'),
                    'mape': Decimal('3.15'),
                    'r2_score': Decimal('0.9240'),
                    'hyperparameters': {
                        'n_estimators': 50,
                        'max_depth': 5,
                        'feature_importance': {
                            'hour_of_day': 0.45,
                            'day_of_week': 0.20,
                            'lag_1h_demand': 0.20,
                            'is_weekend': 0.10,
                            'rolling_avg_demand': 0.05
                        }
                    },
                    'is_active': True,
                    'is_default': True,
                    'status': 'DEPLOYED'
                }
            )

        # 14. Forecast Records for Next 24 Hours
        for fac in all_facilities:
            for h in range(1, 25):
                target_ts = (now + timedelta(hours=h)).replace(minute=0, second=0, microsecond=0)
                hour_of_day = target_ts.hour
                base_pred = Decimal(str(round(120.0 + (50.0 if 8 <= hour_of_day <= 18 else 10.0) + random.uniform(-5, 5), 2)))
                ForecastRecord.objects.get_or_create(
                    facility=fac,
                    target_timestamp=target_ts,
                    horizon='24h',
                    target_type='consumption',
                    defaults={
                        'organization': fac.organization,
                        'forecast_value': base_pred,
                        'lower_bound': base_pred * Decimal('0.92'),
                        'upper_bound': base_pred * Decimal('1.08'),
                        'model_version': 'v2.0-rf-random_forest'
                    }
                )

        # 15. Seed Scenario Simulation
        if all_facilities:
            ScenarioSimulation.objects.get_or_create(
                facility=all_facilities[0],
                name='15% Peak TOU Load Shift Simulation',
                defaults={
                    'organization': org,
                    'scenario_type': 'load_shift',
                    'parameters': {'shift_percentage': 15.0},
                    'baseline_cost': Decimal('14800.00'),
                    'simulated_cost': Decimal('13250.00'),
                    'baseline_kwh': Decimal('102000.00'),
                    'simulated_kwh': Decimal('102000.00'),
                    'baseline_peak_kw': Decimal('1420.00'),
                    'simulated_peak_kw': Decimal('1207.00'),
                    'cost_savings': Decimal('1550.00'),
                    'kwh_savings': Decimal('0.00'),
                    'demand_savings_kw': Decimal('213.00')
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f'GreenGrid EMIS Demo Data successfully seeded!\n'
            f'• Facilities: {len(all_facilities)}\n'
            f'• Meters: {len(meters)}\n'
            f'• Telemetry Date Range: 30 days ({days*24} hours per meter)\n'
            f'• Operational Data: Emission Factors, Tariffs, Bills, Alerts, DR Events, Devices, Safety Policies, ML Random Forest Models & Forecasts'
        ))
