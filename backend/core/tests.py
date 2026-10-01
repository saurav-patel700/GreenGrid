from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Organization, UserProfile, Facility, Meter, Alert, Invitation

class GreenGridPhase2SecurityTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Organization A Setup
        self.org_a = Organization.objects.create(name="Org Alpha", code="ORG-A")
        self.user_a_admin = User.objects.create_user(username="admin_a@alpha.test", email="admin_a@alpha.test", password="password123")
        self.profile_a_admin = UserProfile.objects.create(user=self.user_a_admin, organization=self.org_a, role="admin")

        self.user_a_viewer = User.objects.create_user(username="viewer_a@alpha.test", email="viewer_a@alpha.test", password="password123")
        self.profile_a_viewer = UserProfile.objects.create(user=self.user_a_viewer, organization=self.org_a, role="viewer")

        self.facility_a = Facility.objects.create(organization=self.org_a, name="Alpha Facility 1")

        # Organization B Setup
        self.org_b = Organization.objects.create(name="Org Beta", code="ORG-B")
        self.user_b_admin = User.objects.create_user(username="admin_b@beta.test", email="admin_b@beta.test", password="password123")
        self.profile_b_admin = UserProfile.objects.create(user=self.user_b_admin, organization=self.org_b, role="admin")

        self.facility_b = Facility.objects.create(organization=self.org_b, name="Beta Facility 1")

    def test_01_registration_flow(self):
        payload = {
            "full_name": "John Enterprise",
            "email": "john@neworg.test",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "organization_name": "New Industrial Corp",
            "accept_terms": True
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['role'], 'admin')

    def test_02_login_flow_and_me_endpoint(self):
        # Login
        res = self.client.post('/api/auth/login/', {'email': 'admin_a@alpha.test', 'password': 'password123'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        token = res.data['access']

        # Access /api/auth/me/
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['user']['email'], 'admin_a@alpha.test')

    def test_03_cross_tenant_isolation(self):
        """
        SECURITY TEST: User A (Org A) MUST NOT be able to access Org B facility data.
        """
        # Login User A
        res = self.client.post('/api/auth/login/', {'email': 'admin_a@alpha.test', 'password': 'password123'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Attempt to access Org B facility
        res_detail = self.client.get(f'/api/facilities/{self.facility_b.id}/')
        self.assertEqual(res_detail.status_code, status.HTTP_404_NOT_FOUND)

        # Attempt to list facilities: should only see Org A facilities
        res_list = self.client.get('/api/facilities/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        facility_ids = [f['id'] for f in res_list.data['results']]
        self.assertIn(self.facility_a.id, facility_ids)
        self.assertNotIn(self.facility_b.id, facility_ids)

    def test_04_role_based_access_control(self):
        """
        SECURITY TEST: Viewer role cannot create facilities or invite users.
        """
        # Login Viewer User A
        res = self.client.post('/api/auth/login/', {'email': 'viewer_a@alpha.test', 'password': 'password123'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Attempt facility creation
        res_fac = self.client.post('/api/facilities/', {'name': 'Unauthorized Building'}, format='json')
        self.assertEqual(res_fac.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt user invitation
        res_inv = self.client.post('/api/users/invite/', {'email': 'test@inv.test'}, format='json')
        self.assertEqual(res_inv.status_code, status.HTTP_403_FORBIDDEN)

    def test_05_disabled_user_cannot_login(self):
        """
        SECURITY TEST: Disabled users cannot authenticate.
        """
        self.user_a_viewer.is_active = False
        self.user_a_viewer.save()

        res = self.client.post('/api/auth/login/', {'email': 'viewer_a@alpha.test', 'password': 'password123'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_06_user_invitation_flow(self):
        """
        Tests invitation creation and token acceptance.
        """
        # Admin A invites user
        res_login = self.client.post('/api/auth/login/', {'email': 'admin_a@alpha.test', 'password': 'password123'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res_login.data['access']}")

        res_invite = self.client.post('/api/users/invite/', {'email': 'newmember@alpha.test', 'role': 'facility_manager'}, format='json')
        self.assertEqual(res_invite.status_code, status.HTTP_201_CREATED)
        token = res_invite.data['invitation']['token']

        # Unauthenticated user accepts invitation
        self.client.credentials()
        res_accept = self.client.post('/api/invitations/accept/', {
            'token': token,
            'full_name': 'New Member',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(res_accept.status_code, status.HTTP_200_OK)
        self.assertIn('access', res_accept.data)

class GreenGridPhase3EnergyEngineTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org_a = Organization.objects.create(name="Alpha Energy", code="ALPHA")
        self.user_a = User.objects.create_user(username="admin@alpha.test", email="admin@alpha.test", password="password123")
        self.profile_a = UserProfile.objects.create(user=self.user_a, organization=self.org_a, role="admin")

        self.org_b = Organization.objects.create(name="Beta Energy", code="BETA")
        self.user_b = User.objects.create_user(username="admin@beta.test", email="admin@beta.test", password="password123")
        self.profile_b = UserProfile.objects.create(user=self.user_b, organization=self.org_b, role="admin")

        self.facility_a = Facility.objects.create(organization=self.org_a, name="Alpha Main Hub", square_footage=100000)
        self.meter_a = Meter.objects.create(facility=self.facility_a, name="Alpha Meter 1", meter_number="MTR-ALPHA-01", meter_type="electricity")

        self.facility_b = Facility.objects.create(organization=self.org_b, name="Beta Plant", square_footage=50000)
        self.meter_b = Meter.objects.create(facility=self.facility_b, name="Beta Meter 1", meter_number="MTR-BETA-01", meter_type="electricity")

        # Authenticate Client A
        res = self.client.post('/api/auth/login/', {'email': 'admin@alpha.test', 'password': 'password123'}, format='json')
        self.token_a = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

    def test_07_energy_summary_and_timeseries_analytics(self):
        # Create readings for Meter A
        from django.utils import timezone
        from datetime import timedelta
        from core.models import EnergyReading

        now = timezone.now()
        EnergyReading.objects.create(meter=self.meter_a, timestamp=now - timedelta(hours=2), consumption=100.0, demand=50.0, source='grid')
        EnergyReading.objects.create(meter=self.meter_a, timestamp=now - timedelta(hours=1), consumption=150.0, demand=75.0, source='solar')

        res_sum = self.client.get('/api/energy/summary/?range=24h')
        self.assertEqual(res_sum.status_code, status.HTTP_200_OK)
        self.assertEqual(res_sum.data['kpis']['consumption']['value'], 250.0)

        res_ts = self.client.get('/api/energy/timeseries/?range=24h')
        self.assertEqual(res_ts.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res_ts.data['series']) > 0)

    def test_08_peak_demand_and_energy_intensity(self):
        from django.utils import timezone
        from core.models import EnergyReading
        now = timezone.now()
        EnergyReading.objects.create(meter=self.meter_a, timestamp=now, consumption=500.0, demand=350.0)

        res_demand = self.client.get('/api/energy/demand/?range=7d')
        self.assertEqual(res_demand.status_code, status.HTTP_200_OK)
        self.assertEqual(res_demand.data['current_peak'], 350.0)

        res_intensity = self.client.get('/api/energy/intensity/?range=7d')
        self.assertEqual(res_intensity.status_code, status.HTTP_200_OK)
        # 500 kWh / 100000 sqft = 0.005 -> formatted
        self.assertIn('facilities', res_intensity.data)

    def test_09_data_quality_engine_rules(self):
        from core.services.data_quality import evaluate_reading_quality
        # Negative value -> suspect
        q1, r1 = evaluate_reading_quality(consumption=-10.0, demand=50.0)
        self.assertEqual(q1, 'suspect')

        # Clean reading -> good
        q2, r2 = evaluate_reading_quality(consumption=100.0, demand=50.0, voltage=240.0, power_factor=0.95)
        self.assertEqual(q2, 'good')

    def test_10_anomaly_detection_and_deduplication(self):
        from django.utils import timezone
        from core.models import Alert
        from core.services.anomaly import detect_and_handle_anomalies

        now = timezone.now()
        alerts = detect_and_handle_anomalies(self.meter_a, now, consumption=1000.0, demand=1500.0, quality_status='good')
        self.assertTrue(len(alerts) > 0)
        self.assertEqual(Alert.objects.filter(meter=self.meter_a).count(), 1)

        # Deduplication check: second call within 1h does not duplicate alert
        alerts2 = detect_and_handle_anomalies(self.meter_a, now, consumption=1000.0, demand=1500.0, quality_status='good')
        self.assertEqual(len(alerts2), 0)
        self.assertEqual(Alert.objects.filter(meter=self.meter_a).count(), 1)

    def test_11_iot_telemetry_ingestion_valid_and_invalid(self):
        # Valid Ingestion
        payload = {
            "meter_id": self.meter_a.meter_number,
            "timestamp": "2026-09-29T12:00:00Z",
            "consumption": 12.5,
            "demand": 8.4,
            "unit": "kWh",
            "source": "grid",
            "voltage": 240.0,
            "power_factor": 0.96
        }
        res_ingest = self.client.post('/api/ingestion/readings/', payload, format='json')
        self.assertEqual(res_ingest.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_ingest.data['reading']['meter_name'], self.meter_a.name)

        # Invalid Meter (Belongs to Org B)
        payload_b = {
            "meter_id": self.meter_b.meter_number,
            "consumption": 10.0,
            "demand": 5.0
        }
        res_invalid = self.client.post('/api/ingestion/readings/', payload_b, format='json')
        self.assertEqual(res_invalid.status_code, status.HTTP_404_NOT_FOUND)

    def test_12_m2m_api_key_authentication_and_cross_tenant_isolation(self):
        # Create M2M Credential for Org A
        res_key = self.client.post('/api/ingestion/credentials/', {'name': 'Edge Gateway 1'}, format='json')
        self.assertEqual(res_key.status_code, status.HTTP_201_CREATED)
        hdr = res_key.data['connection_header']

        # Unauthenticated client uses X-API-Key header to ingest telemetry into Org A meter
        self.client.credentials()
        res_m2m = self.client.post(
            '/api/ingestion/readings/',
            {"meter_id": self.meter_a.meter_number, "consumption": 42.0, "demand": 21.0, "timestamp": "2026-09-29T14:00:00Z"},
            format='json',
            HTTP_X_API_KEY=hdr
        )
        self.assertEqual(res_m2m.status_code, status.HTTP_201_CREATED)

        # M2M Key from Org A attempting to ingest into Org B meter MUST BE REJECTED
        res_m2m_cross = self.client.post(
            '/api/ingestion/readings/',
            {"meter_id": self.meter_b.meter_number, "consumption": 42.0, "demand": 21.0},
            format='json',
            HTTP_X_API_KEY=hdr
        )
        self.assertEqual(res_m2m_cross.status_code, status.HTTP_404_NOT_FOUND)

    def test_13_csv_telemetry_export(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')
        res_csv = self.client.get('/api/energy/export/?range=7d')
        self.assertEqual(res_csv.status_code, status.HTTP_200_OK)
        self.assertEqual(res_csv['Content-Type'], 'text/csv')
        self.assertIn('Timestamp,Organization,Facility', res_csv.content.decode('utf-8'))


class GreenGridPhase4BillingAndCostTestCase(TestCase):
    def setUp(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import (
            Organization, UserProfile, Facility, Meter, EnergyReading,
            TariffPlan, TariffRate, TariffTimePeriod, DemandChargeRule, UtilityBill, UtilityBillDocument
        )

        self.client = APIClient()

        # Org A Setup
        self.org_a = Organization.objects.create(name="Alpha Utility Org", code="ORG-A-UTIL", currency="USD")
        self.user_a_admin = User.objects.create_user(username="admin_a@util.test", email="admin_a@util.test", password="password123")
        self.profile_a_admin = UserProfile.objects.create(user=self.user_a_admin, organization=self.org_a, role="admin")

        self.user_a_viewer = User.objects.create_user(username="viewer_a@util.test", email="viewer_a@util.test", password="password123")
        self.profile_a_viewer = UserProfile.objects.create(user=self.user_a_viewer, organization=self.org_a, role="viewer")

        self.facility_a = Facility.objects.create(organization=self.org_a, name="Alpha Plant 1", square_footage=50000)
        self.meter_a = Meter.objects.create(facility=self.facility_a, name="Alpha Main Meter", meter_number="MTR-A-99")

        # Org B Setup (Multi-tenant check)
        self.org_b = Organization.objects.create(name="Beta Utility Org", code="ORG-B-UTIL", currency="USD")
        self.user_b_admin = User.objects.create_user(username="admin_b@util.test", email="admin_b@util.test", password="password123")
        self.profile_b_admin = UserProfile.objects.create(user=self.user_b_admin, organization=self.org_b, role="admin")

        self.facility_b = Facility.objects.create(organization=self.org_b, name="Beta Plant 1", square_footage=30000)
        self.tariff_b = TariffPlan.objects.create(
            organization=self.org_b,
            name="Beta Rate GS",
            utility_name="Beta Electric",
            effective_from=datetime.date(2025, 1, 1)
        )
        self.bill_b = UtilityBill.objects.create(
            organization=self.org_b,
            facility=self.facility_b,
            utility_provider="Beta Electric",
            invoice_number="INV-B-001",
            billing_period_start=datetime.date(2026, 8, 1),
            billing_period_end=datetime.date(2026, 8, 31),
            total_consumption_kwh=Decimal('5000.00'),
            peak_demand_kw=Decimal('50.00'),
            total_cost_usd=Decimal('1000.00'),
            billed_amount=Decimal('1000.00')
        )

        # Authenticate Admin A
        res_login = self.client.post('/api/auth/login/', {'email': 'admin_a@util.test', 'password': 'password123'}, format='json')
        self.token_a = res_login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

    def test_14_tariff_creation(self):
        payload = {
            "name": "General Commercial Rate GS-2",
            "utility_name": "Pacific Power",
            "utility_account_reference": "PP-90021",
            "currency": "USD",
            "billing_cycle": "monthly",
            "effective_from": "2026-01-01",
            "fixed_monthly_charge": "150.00",
            "tax_percentage": "5.00",
            "status": "active"
        }
        res = self.client.post('/api/billing/tariffs/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], "General Commercial Rate GS-2")
        self.assertEqual(res.data['organization_name'], self.org_a.name)

    def test_15_tou_period_validation(self):
        from decimal import Decimal
        import datetime
        from core.models import TariffPlan, TariffTimePeriod

        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="TOU Plan A",
            utility_name="Utility A",
            effective_from=datetime.date(2025, 1, 1)
        )

        payload = {
            "name": "Night Off Peak",
            "period_type": "OFF_PEAK",
            "start_time": "22:00:00",
            "end_time": "06:00:00",
            "days_of_week": "0,1,2,3,4,5,6",
            "rate": "0.0800",
            "priority": 1
        }
        res = self.client.post(f'/api/billing/tariffs/{tariff.id}/tou-periods/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_16_overlapping_tou_period_rejected(self):
        from decimal import Decimal
        import datetime
        from core.models import TariffPlan, TariffTimePeriod

        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="TOU Plan Overlap Check",
            utility_name="Utility A",
            effective_from=datetime.date(2025, 1, 1)
        )
        TariffTimePeriod.objects.create(
            tariff_plan=tariff,
            name="Peak Day 1",
            period_type="ON_PEAK",
            start_time=datetime.time(12, 0),
            end_time=datetime.time(18, 0),
            days_of_week="0,1,2,3,4",
            rate=Decimal('0.2000')
        )

        # Attempt to create overlapping period on same days
        payload_overlap = {
            "name": "Conflicting Peak",
            "period_type": "SHOULDER",
            "start_time": "14:00:00",
            "end_time": "16:00:00",
            "days_of_week": "1,2",
            "rate": "0.1500"
        }
        res = self.client.post(f'/api/billing/tariffs/{tariff.id}/tou-periods/', payload_overlap, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_17_energy_charge_calculation(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import EnergyReading, TariffPlan, TariffRate
        from core.services.billing import calculate_bill_for_facility

        # Add 1000 kWh reading
        EnergyReading.objects.create(
            meter=self.meter_a,
            timestamp=timezone.now(),
            consumption=Decimal('1000.00'),
            demand=Decimal('50.00')
        )

        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="Flat Energy Rate Tariff",
            utility_name="Power Co",
            effective_from=datetime.date(2025, 1, 1),
            fixed_monthly_charge=Decimal('0.00'),
            tax_percentage=Decimal('0.00')
        )
        TariffRate.objects.create(
            tariff_plan=tariff,
            name="Base kWh Rate",
            rate_type="ENERGY",
            unit_rate=Decimal('0.1000')
        )

        start = timezone.now().date()
        calc = calculate_bill_for_facility(self.facility_a, start, start, tariff_plan=tariff)
        self.assertEqual(calc["energy_charge"], Decimal('100.00'))

    def test_18_demand_charge_calculation(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import EnergyReading, TariffPlan, DemandChargeRule
        from core.services.billing import calculate_bill_for_facility

        EnergyReading.objects.create(
            meter=self.meter_a,
            timestamp=timezone.now(),
            consumption=Decimal('100.00'),
            demand=Decimal('150.00') # Peak demand 150 kW
        )

        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="Demand Charge Tariff",
            utility_name="Power Co",
            effective_from=datetime.date(2025, 1, 1)
        )
        # $10/kW for demand exceeding 50 kW threshold -> (150 - 50) * $10 = $1000 demand charge
        DemandChargeRule.objects.create(
            tariff_plan=tariff,
            rate_per_kw=Decimal('10.00'),
            threshold_kw=Decimal('50.00')
        )

        start = timezone.now().date()
        calc = calculate_bill_for_facility(self.facility_a, start, start, tariff_plan=tariff)
        self.assertEqual(calc["demand_charge"], Decimal('1000.00'))

    def test_19_fixed_charge_calculation(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import TariffPlan
        from core.services.billing import calculate_bill_for_facility

        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="Fixed Charge Plan",
            utility_name="Power Co",
            effective_from=datetime.date(2025, 1, 1),
            fixed_monthly_charge=Decimal('75.50')
        )
        start = timezone.now().date()
        calc = calculate_bill_for_facility(self.facility_a, start, start, tariff_plan=tariff)
        self.assertEqual(calc["fixed_charge"], Decimal('75.50'))

    def test_20_tax_calculation(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import TariffPlan
        from core.services.billing import calculate_bill_for_facility

        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="Tax Plan",
            utility_name="Power Co",
            effective_from=datetime.date(2025, 1, 1),
            fixed_monthly_charge=Decimal('100.00'),
            tax_percentage=Decimal('10.00') # 10% tax on $100 = $10
        )
        start = timezone.now().date()
        calc = calculate_bill_for_facility(self.facility_a, start, start, tariff_plan=tariff)
        self.assertEqual(calc["tax"], Decimal('10.00'))

    def test_21_total_bill_calculation(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import EnergyReading, TariffPlan, TariffRate, DemandChargeRule
        from core.services.billing import calculate_bill_for_facility

        EnergyReading.objects.create(
            meter=self.meter_a,
            timestamp=timezone.now(),
            consumption=Decimal('1000.00'),
            demand=Decimal('100.00')
        )
        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="Full Bill Plan",
            utility_name="Power Co",
            effective_from=datetime.date(2025, 1, 1),
            fixed_monthly_charge=Decimal('50.00'),
            tax_percentage=Decimal('10.00')
        )
        TariffRate.objects.create(tariff_plan=tariff, name="Energy", rate_type="ENERGY", unit_rate=Decimal('0.1000')) # $100
        DemandChargeRule.objects.create(tariff_plan=tariff, rate_per_kw=Decimal('5.00'), threshold_kw=Decimal('0.00')) # 100 kW * $5 = $500
        # Subtotal: $100 + $500 + $50 = $650
        # Tax 10%: $65
        # Total: $715

        start = timezone.now().date()
        calc = calculate_bill_for_facility(self.facility_a, start, start, tariff_plan=tariff)
        self.assertEqual(calc["total"], Decimal('715.00'))

    def test_22_billing_period_calculation(self):
        import datetime
        from decimal import Decimal
        from core.models import UtilityBill

        bill = UtilityBill.objects.create(
            organization=self.org_a,
            facility=self.facility_a,
            utility_provider="Power Co",
            invoice_number="INV-CALC-01",
            billing_period_start=datetime.date(2026, 8, 1),
            billing_period_end=datetime.date(2026, 8, 31),
            total_consumption_kwh=Decimal('1000.00'),
            peak_demand_kw=Decimal('50.00'),
            total_cost_usd=Decimal('120.00'),
            billed_amount=Decimal('120.00')
        )

        res = self.client.post(f'/api/billing/bills/{bill.id}/calculate/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total", res.data)

    def test_23_bill_reconciliation_and_variance(self):
        import datetime
        from decimal import Decimal
        from core.models import UtilityBill, EnergyReading
        from django.utils import timezone

        EnergyReading.objects.create(
            meter=self.meter_a,
            timestamp=timezone.make_aware(datetime.datetime(2026, 8, 15, 12, 0)),
            consumption=Decimal('1000.00'),
            demand=Decimal('50.00')
        )

        bill = UtilityBill.objects.create(
            organization=self.org_a,
            facility=self.facility_a,
            utility_provider="Power Co",
            invoice_number="INV-REC-01",
            billing_period_start=datetime.date(2026, 8, 1),
            billing_period_end=datetime.date(2026, 8, 31),
            billed_consumption_kwh=Decimal('1000.00'),
            billed_demand_kw=Decimal('50.00'),
            billed_amount=Decimal('120.00') # Calculated total is ~ $120
        )

        res = self.client.post(f'/api/billing/bills/{bill.id}/reconcile/', {'tolerance_percentage': 2.0}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn(res.data['reconciliation_status'], ['MATCHED', 'VARIANCE'])

    def test_24_tariff_scenario_calculation(self):
        import datetime
        from decimal import Decimal
        from core.models import TariffPlan

        t1 = TariffPlan.objects.create(organization=self.org_a, name="Plan 1", utility_name="U1", effective_from=datetime.date(2025, 1, 1), fixed_monthly_charge=Decimal('100.00'))
        t2 = TariffPlan.objects.create(organization=self.org_a, name="Plan 2", utility_name="U2", effective_from=datetime.date(2025, 1, 1), fixed_monthly_charge=Decimal('200.00'))

        payload = {
            "facility": self.facility_a.id,
            "primary_tariff": t1.id,
            "alternative_tariff": t2.id,
            "start_date": "2026-08-01",
            "end_date": "2026-08-31"
        }
        res = self.client.post('/api/billing/tariff-scenario/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("modeled_cost_difference", res.data["variance"])

    def test_25_bill_export(self):
        res = self.client.get('/api/billing/export/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'text/csv')

    def test_26_billing_role_permissions(self):
        # Viewer role trying to create tariff plan MUST BE REJECTED or READ-ONLY
        res_login = self.client.post('/api/auth/login/', {'email': 'viewer_a@util.test', 'password': 'password123'}, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res_login.data['access']}")

        payload = {"name": "Unauthorized Tariff", "utility_name": "Hack Utility", "effective_from": "2026-01-01"}
        # Depending on configuration, viewers cannot create tariffs
        res = self.client.post('/api/billing/tariffs/', payload, format='json')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED])

    def test_27_cross_tenant_billing_and_tariff_isolation(self):
        # Admin A attempting to access Org B tariff or bill MUST GET 404 NOT FOUND
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

        res_tariff = self.client.get(f'/api/billing/tariffs/{self.tariff_b.id}/')
        self.assertEqual(res_tariff.status_code, status.HTTP_404_NOT_FOUND)

        res_bill = self.client.get(f'/api/billing/bills/{self.bill_b.id}/')
        self.assertEqual(res_bill.status_code, status.HTTP_404_NOT_FOUND)

    def test_28_uploaded_document_isolation(self):
        from core.models import UtilityBillDocument
        doc_b = UtilityBillDocument.objects.create(
            organization=self.org_b,
            original_filename="secret_invoice_b.pdf",
            processing_status="PROCESSED"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')
        res_bill_b_docs = self.client.get(f'/api/billing/bills/{self.bill_b.id}/')
        self.assertEqual(res_bill_b_docs.status_code, status.HTTP_404_NOT_FOUND)

    def test_29_api_validation(self):
        # Posting bill with non-existent facility
        payload = {
            "facility": 99999,
            "utility_provider": "Fake Electric",
            "invoice_number": "INV-INVALID-01",
            "billing_period_start": "2026-08-01",
            "billing_period_end": "2026-08-31",
            "total_consumption_kwh": "100.00",
            "peak_demand_kw": "10.00",
            "total_cost_usd": "50.00"
        }
        res = self.client.post('/api/billing/bills/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class GreenGridPhase5PredictiveAndOptimizationTestCase(TestCase):
    def setUp(self):
        from decimal import Decimal
        import datetime
        from django.utils import timezone
        from core.models import (
            Organization, UserProfile, Facility, Meter, EnergyReading,
            Device, StorageAsset, DemandResponseEvent, OptimizationRecommendation, ScenarioSimulation
        )

        self.client = APIClient()

        # Org A Setup
        self.org_a = Organization.objects.create(name="Alpha Smart Grid Org", code="ORG-A-SMART", currency="USD")
        self.user_a_admin = User.objects.create_user(username="admin_a@smart.test", email="admin_a@smart.test", password="password123")
        self.profile_a_admin = UserProfile.objects.create(user=self.user_a_admin, organization=self.org_a, role="admin")

        self.facility_a = Facility.objects.create(organization=self.org_a, name="Alpha Smart Hub", square_footage=75000)
        self.meter_a = Meter.objects.create(facility=self.facility_a, name="Alpha Meter 100", meter_number="MTR-SMART-100")
        self.device_a = Device.objects.create(
            organization=self.org_a,
            facility=self.facility_a,
            name="Alpha Gateway",
            serial_number="ALPHA-GW-101",
            protocol="modbus_tcp"
        )


        # Org B Setup (Multi-tenant check)
        self.org_b = Organization.objects.create(name="Beta Smart Grid Org", code="ORG-B-SMART", currency="USD")
        self.user_b_admin = User.objects.create_user(username="admin_b@smart.test", email="admin_b@smart.test", password="password123")
        self.profile_b_admin = UserProfile.objects.create(user=self.user_b_admin, organization=self.org_b, role="admin")

        self.facility_b = Facility.objects.create(organization=self.org_b, name="Beta Smart Hub", square_footage=45000)
        self.device_b = Device.objects.create(
            organization=self.org_b,
            facility=self.facility_b,
            name="Beta Gateway",
            serial_number="BETA-GW-909",
            protocol="modbus_tcp"
        )
        self.dr_b = DemandResponseEvent.objects.create(
            organization=self.org_b,
            facility=self.facility_b,
            event_name="Beta DR Peak Event",
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(hours=2),
            target_reduction_kw=Decimal('50.00')
        )

        # Authenticate Admin A
        res_login = self.client.post('/api/auth/login/', {'email': 'admin_a@smart.test', 'password': 'password123'}, format='json')
        self.token_a = res_login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

    def test_30_forecast_generation_and_insufficient_data(self):
        # 1. No telemetry -> insufficient data report
        res_empty = self.client.get(f'/api/forecast/timeseries/?facility={self.facility_a.id}&horizon=24h')
        self.assertEqual(res_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(res_empty.data['status'], 'INSUFFICIENT_DATA')

        # 2. Add 15 telemetry readings
        from django.utils import timezone
        from datetime import timedelta
        from core.models import EnergyReading

        now = timezone.now()
        for i in range(15):
            EnergyReading.objects.create(
                meter=self.meter_a,
                timestamp=now - timedelta(hours=i),
                consumption=25.0 + i,
                demand=12.0 + i
            )

        res_forecast = self.client.get(f'/api/forecast/timeseries/?facility={self.facility_a.id}&horizon=24h')
        self.assertEqual(res_forecast.status_code, status.HTTP_200_OK)
        self.assertEqual(res_forecast.data['status'], 'SUCCESS')
        self.assertEqual(len(res_forecast.data['forecast_series']), 24)

    def test_31_forecast_accuracy_evaluation(self):
        res = self.client.get(f'/api/forecast/accuracy/?facility={self.facility_a.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("status", res.data)

    def test_32_peak_demand_prediction(self):
        res = self.client.get(f'/api/forecast/peak-demand/?facility={self.facility_a.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("predicted_peak_kw", res.data)

    def test_33_demand_response_event_workflow(self):
        from django.utils import timezone
        from datetime import timedelta
        # Create DR Event
        payload = {
            "facility": self.facility_a.id,
            "event_name": "Grid Peak Shaving Event",
            "start_time": (timezone.now() + timedelta(hours=2)).isoformat(),
            "end_time": (timezone.now() + timedelta(hours=5)).isoformat(),
            "target_reduction_kw": "50.00",
            "priority": "high"
        }
        res = self.client.post('/api/demand-response/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        event_id = res.data['id']
        self.assertEqual(res.data['status'], 'DRAFT')

        # Approve DR Event
        res_approve = self.client.post(f'/api/demand-response/{event_id}/approve/')
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        self.assertEqual(res_approve.data['status'], 'SCHEDULED')

    def test_34_device_registration_and_health_check(self):
        payload = {
            "facility": self.facility_a.id,
            "name": "Gateway Substation Alpha",
            "device_type": "gateway",
            "protocol": "modbus_tcp",
            "host": "192.168.1.10",
            "port": 502,
            "serial_number": "SN-MODBUS-1001"
        }
        res = self.client.post('/api/devices/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        dev_id = res.data['id']

        # Health Check
        res_health = self.client.get(f'/api/devices/{dev_id}/health/')
        self.assertEqual(res_health.status_code, status.HTTP_200_OK)
        self.assertEqual(res_health.data['status'], 'online')

    def test_35_optimization_recommendation_generation(self):
        res = self.client.get(f'/api/optimization/recommendations/generate/?facility={self.facility_a.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_36_scenario_simulation_execution(self):
        payload = {
            "facility": self.facility_a.id,
            "name": "Add 200kW Solar Rooftop Simulation",
            "scenario_type": "add_solar",
            "parameters": {"solar_kw": 200.0}
        }
        res = self.client.post('/api/scenarios/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("cost_savings", res.data)

    def test_37_cross_tenant_phase5_isolation(self):
        # Admin A attempting to access Org B device or DR event MUST GET 404 NOT FOUND
        res_dev = self.client.get(f'/api/devices/{self.device_b.id}/')
        self.assertEqual(res_dev.status_code, status.HTTP_404_NOT_FOUND)

        res_dr = self.client.get(f'/api/demand-response/{self.dr_b.id}/')
        self.assertEqual(res_dr.status_code, status.HTTP_404_NOT_FOUND)

    # ----------------------------------------------------------------------
    # PHASE 6 TESTS: AUTOMATION, CONTROL SAFETY, ML LIFECYCLE, CARBON, REPORTS, WEBHOOKS
    # ----------------------------------------------------------------------

    def test_38_automation_safety_and_read_only_command_workflow(self):
        # Create control command
        payload = {
            "device": self.device_a.id,
            "command_type": "set_bess_soc_limit",
            "requested_value": "80.0"
        }
        res = self.client.post('/api/commands/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cmd_id = res.data['id']
        self.assertEqual(res.data['validation_status'], 'PASSED')
        self.assertEqual(res.data['approval_status'], 'PENDING')

        # Approve and execute control command
        res_approve = self.client.post(f'/api/commands/{cmd_id}/approve/')
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        self.assertEqual(res_approve.data['execution_status'], 'COMPLETED')

    def test_39_global_emergency_stop_mechanism(self):
        # Trigger global emergency stop
        res_stop = self.client.post('/api/automation/emergency-stop/', {"reason": "Test Emergency Shutdown Trigger"}, format='json')
        self.assertEqual(res_stop.status_code, status.HTTP_200_OK)
        self.assertEqual(res_stop.data['status'], 'DISABLED')

        # Attempt command creation while emergency stop is active
        payload = {
            "device": self.device_a.id,
            "command_type": "hvac_setpoint",
            "requested_value": "2.0"
        }
        res_cmd = self.client.post('/api/commands/', payload, format='json')
        self.assertEqual(res_cmd.data['validation_status'], 'REJECTED')
        self.assertIn("DISABLED", res_cmd.data['rejection_reason'])

    def test_40_ml_model_training_and_explainability(self):
        # Create 50 energy readings so ML model has sufficient training data
        from django.utils import timezone
        from datetime import timedelta
        from core.models import EnergyReading

        now = timezone.now()
        for i in range(50):
            EnergyReading.objects.create(
                meter=self.meter_a,
                timestamp=now - timedelta(hours=i),
                consumption=30.0 + i,
                demand=15.0 + i
            )

        # Train ML model for facility A
        res_train = self.client.post('/api/ml-models/train/', {"facility": self.facility_a.id, "algorithm": "gradient_boosting"}, format='json')
        self.assertEqual(res_train.status_code, status.HTTP_200_OK)
        self.assertTrue(res_train.data['success'])

        # Forecast Explainability
        res_exp = self.client.get(f'/api/forecast/explainability/?facility={self.facility_a.id}')
        self.assertEqual(res_exp.status_code, status.HTTP_200_OK)
        self.assertIn("explainability_drivers", res_exp.data)

    def test_41_forecast_drift_detection(self):
        res_drift = self.client.get(f'/api/forecast/drift-check/?facility={self.facility_a.id}')
        self.assertEqual(res_drift.status_code, status.HTTP_200_OK)
        self.assertIn("status", res_drift.data)

    def test_42_carbon_accounting_and_emission_factors(self):
        # Create Emission Factor
        ef_payload = {
            "region": "US-TX",
            "source_name": "EPA eGRID ERCOT Factor",
            "factor_kg_co2_per_kwh": "0.3850",
            "scope": "scope_2"
        }
        res_ef = self.client.post('/api/emission-factors/', ef_payload, format='json')
        self.assertEqual(res_ef.status_code, status.HTTP_201_CREATED)

        # Carbon summary
        res_summary = self.client.get(f'/api/carbon/summary/?facility={self.facility_a.id}')
        self.assertEqual(res_summary.status_code, status.HTTP_200_OK)
        self.assertTrue(res_summary.data['emissions_available'])
        self.assertIn("total_emissions_kg_co2", res_summary.data)

        # Renewable intelligence
        res_ren = self.client.get(f'/api/carbon/renewable-intelligence/?facility={self.facility_a.id}')
        self.assertEqual(res_ren.status_code, status.HTTP_200_OK)
        self.assertIn("renewable_share_pct", res_ren.data)

    def test_43_closed_loop_optimization_tracking(self):
        res_eval = self.client.post('/api/optimization/outcomes/', {"facility": self.facility_a.id}, format='json')
        self.assertEqual(res_eval.status_code, status.HTTP_200_OK)
        self.assertIn("outcomes", res_eval.data)

    def test_44_enterprise_reporting_and_csv_export(self):
        res_json = self.client.get(f'/api/reports/generate/?report_type=energy&facility={self.facility_a.id}')
        self.assertEqual(res_json.status_code, status.HTTP_200_OK)
        self.assertIn("rows", res_json.data)

        res_csv = self.client.get(f'/api/reports/generate/?report_type=energy&facility={self.facility_a.id}&export_format=csv')
        self.assertEqual(res_csv.status_code, status.HTTP_200_OK)
        self.assertEqual(res_csv['Content-Type'], 'text/csv')



    def test_45_webhook_signature_signing_and_logs(self):
        wh_payload = {
            "name": "Enterprise SIEM Integration",
            "url": "https://siem.alpha.test/webhook",
            "events_subscribed": ["critical_alert", "device_offline"]
        }
        res_wh = self.client.post('/api/webhooks/', wh_payload, format='json')
        self.assertEqual(res_wh.status_code, status.HTTP_201_CREATED)
        wh_id = res_wh.data['id']

        res_ping = self.client.post(f'/api/webhooks/{wh_id}/test-ping/')
        self.assertEqual(res_ping.status_code, status.HTTP_200_OK)

    def test_46_operational_command_center_and_system_health(self):
        res_ops = self.client.get('/api/operations/summary/')
        self.assertEqual(res_ops.status_code, status.HTTP_200_OK)
        self.assertIn("fleet_health", res_ops.data)

        res_health = self.client.get('/api/system-health/')
        self.assertEqual(res_health.status_code, status.HTTP_200_OK)
        self.assertEqual(res_health.data['database']['status'], 'healthy')

    def test_47_cross_tenant_phase6_isolation(self):
        # Admin A attempting to access Org B safety policies or webhooks MUST GET 404 NOT FOUND
        from core.models import WebhookEndpoint, DeviceSafetyPolicy
        wh_b = WebhookEndpoint.objects.create(
            organization=self.org_b,
            name="Org B Webhook",
            url="https://orgb.test/wh",
            secret_key="secret"
        )
        res_wh = self.client.get(f'/api/webhooks/{wh_b.id}/')
        self.assertEqual(res_wh.status_code, status.HTTP_404_NOT_FOUND)

    def test_48_modular_forecasting_engine(self):
        from core.services.forecasting import ForecastEngine
        from core.models import Meter, EnergyReading
        from django.utils import timezone
        from datetime import timedelta

        # Create meter & 15 readings for facility A
        meter = Meter.objects.create(facility=self.facility_a, name="Main Meter", meter_number="M-TEST-100")
        now = timezone.now()
        for i in range(15):
            EnergyReading.objects.create(
                meter=meter,
                timestamp=now - timedelta(hours=i),
                consumption=25.5,
                demand=12.0
            )

        engine = ForecastEngine()
        res_base = engine.generate_facility_forecast(self.facility_a, horizon='24h', target_type='consumption', model_key='baseline')
        self.assertEqual(res_base['status'], 'SUCCESS')
        self.assertEqual(res_base['model_version'], 'v1.0-baseline-moving-avg')

        res_seas = engine.generate_facility_forecast(self.facility_a, horizon='7d', target_type='consumption', model_key='seasonal')
        self.assertEqual(res_seas['status'], 'SUCCESS')
        self.assertEqual(res_seas['model_version'], 'v1.2-seasonal-diurnal')

        res_exp = engine.generate_facility_forecast(self.facility_a, horizon='30d', target_type='consumption', model_key='exponential')
        self.assertEqual(res_exp['status'], 'SUCCESS')
        self.assertEqual(res_exp['model_version'], 'v1.3-holt-winters-exp')

    def test_49_energy_benchmarking_api(self):
        res_bench = self.client.get('/api/energy/benchmarking/?metric=kwh_per_sqft')
        self.assertEqual(res_bench.status_code, status.HTTP_200_OK)
        self.assertIn("facilities", res_bench.data)
        self.assertEqual(res_bench.data["metric_selected"], "kwh_per_sqft")

    def test_50_extended_optimization_rules(self):
        from core.services.optimization import generate_optimization_recommendations
        from core.models import TariffPlan, TariffTimePeriod
        from django.utils import timezone
        from datetime import time

        # Setup active tariff for Org A
        tariff = TariffPlan.objects.create(
            organization=self.org_a,
            name="TOU Peak Tariff",
            utility_name="GridCo",
            effective_from=timezone.now().date(),
            status="active"
        )
        TariffTimePeriod.objects.create(
            tariff_plan=tariff,
            name="Peak Period",
            period_type="ON_PEAK",
            start_time=time(12, 0),
            end_time=time(18, 0),
            rate="0.2500"
        )

        recs = generate_optimization_recommendations(self.facility_a)
        self.assertTrue(len(recs) > 0)
        rec = recs[0]
        self.assertIn("DETECTED:", rec.reason)
        self.assertIn("WHY IT MATTERS:", rec.reason)
        self.assertIn("ACTION:", rec.reason)

    def test_51_enhanced_device_health_diagnostics(self):
        from core.models import Device
        dev = Device.objects.create(
            organization=self.org_a,
            facility=self.facility_a,
            name="Test Substation Meter",
            protocol="modbus_tcp",
            serial_number="GG-MB-999"
        )
        res_health = self.client.get(f'/api/devices/{dev.id}/health/')
        self.assertEqual(res_health.status_code, status.HTTP_200_OK)
        self.assertIn("communication_latency_ms", res_health.data)
        self.assertEqual(res_health.data["health_status"], "optimal")

    def test_52_executive_summary_report(self):
        res_exec = self.client.get(f'/api/reports/generate/?report_type=executive&facility={self.facility_a.id}')
        self.assertEqual(res_exec.status_code, status.HTTP_200_OK)
        self.assertIn("rows", res_exec.data)
        if len(res_exec.data["rows"]) > 0:
            row = res_exec.data["rows"][0]
            self.assertIn("Total Consumption (kWh)", row)
            self.assertIn("Peak Demand (kW)", row)
            self.assertIn("Scope 2 Emissions (kg CO2)", row)

    def test_53_health_check_api(self):
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "healthy")
        self.assertEqual(res.data["database"], "connected")
        self.assertIn("timestamp", res.data)

    def test_54_global_search_api(self):
        res = self.client.get(f'/api/search/?q={self.facility_a.name[:4]}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data)
        self.assertGreater(res.data["total_results"], 0)
        self.assertIn("facilities", res.data["results"])
        matching_names = [f["name"] for f in res.data["results"]["facilities"]]
        self.assertIn(self.facility_a.name, matching_names)





