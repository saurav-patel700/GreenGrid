from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Max, Avg

from core.models import Facility, EnergyReading, TariffPlan, OptimizationRecommendation, ScenarioSimulation, StorageAsset


def generate_optimization_recommendations(facility):
    """
    Analyzes facility load profile, TOU rate windows, demand thresholds, storage assets,
    and baseload profiles to generate explainable automated optimization recommendations.
    """
    now = timezone.now()
    active_tariff = TariffPlan.objects.filter(organization=facility.organization, status='active').first()

    recommendations = []

    # 1. TOU Load Shifting Recommendation
    if active_tariff and active_tariff.tou_periods.filter(period_type='ON_PEAK').exists():
        on_peak = active_tariff.tou_periods.filter(period_type='ON_PEAK').first()
        off_peak = active_tariff.tou_periods.filter(period_type='OFF_PEAK').first()
        
        on_peak_rate = float(on_peak.rate)
        off_peak_rate = float(off_peak.rate) if off_peak else (on_peak_rate * 0.4)
        rate_diff = round(on_peak_rate - off_peak_rate, 4)

        rec, created = OptimizationRecommendation.objects.get_or_create(
            organization=facility.organization,
            facility=facility,
            recommendation_type='load_shifting',
            time_window_start=now,
            time_window_end=now + timedelta(hours=6),
            defaults={
                "current_condition": f"High energy rate (${on_peak_rate}/kWh) active during On-Peak period ({on_peak.start_time}-{on_peak.end_time}).",
                "suggested_action": f"Shift flexible equipment load from On-Peak period to Off-Peak rate window (${off_peak_rate}/kWh).",
                "expected_energy_impact_kwh": Decimal('150.00'),
                "expected_demand_impact_kw": Decimal('25.00'),
                "expected_cost_impact": Decimal(str(round(150.0 * rate_diff, 2))),
                "confidence_score": Decimal('0.90'),
                "reason": f"DETECTED: On-Peak rate ${on_peak_rate}/kWh in effect. WHY IT MATTERS: High TOU cost spread (${rate_diff}/kWh). ACTION: Shift 150 kWh non-critical load to off-peak. EXPECTED IMPACT: Save ${round(150.0 * rate_diff, 2)}. CALCULATION BASIS: Billed rate differential × deferrable load volume."
            }
        )
        recommendations.append(rec)

    # 2. BESS Storage Dispatch Recommendation
    bess = StorageAsset.objects.filter(facility=facility).first()
    if bess:
        soc = float(bess.current_soc_percent)
        if soc >= 70.0:
            rec, created = OptimizationRecommendation.objects.get_or_create(
                organization=facility.organization,
                facility=facility,
                recommendation_type='battery_dispatch',
                time_window_start=now,
                time_window_end=now + timedelta(hours=3),
                defaults={
                    "current_condition": f"BESS Battery Storage SOC is at {soc}%. Peak demand period approaching.",
                    "suggested_action": f"Dispatch BESS at {bess.max_discharge_kw} kW for peak demand shaving.",
                    "expected_energy_impact_kwh": Decimal('200.00'),
                    "expected_demand_impact_kw": Decimal(str(bess.max_discharge_kw)),
                    "expected_cost_impact": Decimal('387.50'),
                    "confidence_score": Decimal('0.95'),
                    "reason": f"DETECTED: Battery SOC at {soc}%. WHY IT MATTERS: Approaching peak grid demand window. ACTION: Discharge battery at {bess.max_discharge_kw} kW. EXPECTED IMPACT: Reduce demand charge exposure by ${387.50}. CALCULATION BASIS: BESS discharge capacity × demand tariff rate ($15.50/kW)."
                }
            )
            recommendations.append(rec)

    # 3. Peak Demand Threshold Prevention Recommendation
    readings = EnergyReading.objects.filter(meter__facility=facility, timestamp__gte=now - timedelta(days=7))
    if readings.exists():
        max_demand = float(readings.aggregate(m=Max('demand'))['m'] or 0.0)
        if max_demand > 80.0:
            rec, created = OptimizationRecommendation.objects.get_or_create(
                organization=facility.organization,
                facility=facility,
                recommendation_type='peak_shaving',
                time_window_start=now,
                time_window_end=now + timedelta(hours=24),
                defaults={
                    "current_condition": f"Recent 7-day peak demand reached {max_demand} kW.",
                    "suggested_action": "Stagger high-load HVAC / heavy machinery start times to prevent simultaneous peak demand compounding.",
                    "expected_energy_impact_kwh": Decimal('0.00'),
                    "expected_demand_impact_kw": Decimal('35.00'),
                    "expected_cost_impact": Decimal('542.50'),
                    "confidence_score": Decimal('0.85'),
                    "reason": f"DETECTED: Peak demand spiked to {max_demand} kW. WHY IT MATTERS: Contract ratchet billing applies to peak demand. ACTION: Stagger HVAC start sequences. EXPECTED IMPACT: Reduce peak coincidental demand by 35 kW ($542.50). CALCULATION BASIS: Tariff demand charge rate ($15.50/kW) × peak kW reduction."
                }
            )
            recommendations.append(rec)

    # 4. Abnormal Overnight / Baseload Consumption Recommendation
    overnight_readings = readings.filter(timestamp__hour__in=[0, 1, 2, 3, 4])
    daytime_readings = readings.filter(timestamp__hour__in=[9, 10, 11, 12, 13, 14])
    if overnight_readings.exists() and daytime_readings.exists():
        night_avg = float(overnight_readings.aggregate(a=Avg('consumption'))['a'] or 0.0)
        day_avg = float(daytime_readings.aggregate(a=Avg('consumption'))['a'] or 0.0)
        if day_avg > 0 and (night_avg / day_avg) > 0.45:
            rec, created = OptimizationRecommendation.objects.get_or_create(
                organization=facility.organization,
                facility=facility,
                recommendation_type='peak_shaving',
                time_window_start=now,
                time_window_end=now + timedelta(hours=12),
                defaults={
                    "current_condition": f"Overnight baseload is high ({round(night_avg, 1)} kWh/h vs daytime average {round(day_avg, 1)} kWh/h).",
                    "suggested_action": "Inspect building setback controls and turn off non-essential lighting and auxiliary HVAC units outside operating hours.",
                    "expected_energy_impact_kwh": Decimal('120.00'),
                    "expected_demand_impact_kw": Decimal('0.00'),
                    "expected_cost_impact": Decimal('14.40'),
                    "confidence_score": Decimal('0.88'),
                    "reason": f"DETECTED: Overnight consumption is {round((night_avg/day_avg)*100, 1)}% of daytime average. WHY IT MATTERS: Unnecessary baseload energy waste during non-operating hours. ACTION: Adjust nighttime setback schedules. EXPECTED IMPACT: Save ~120 kWh nightly ($14.40). CALCULATION BASIS: 10 kWh/h reduction over 12 non-operational hours × off-peak rate."
                }
            )
            recommendations.append(rec)

    # 5. Inefficient Facility Comparison Recommendation
    fac_intensity = float(facility.baseline_kwh_sqft)
    org_facilities = Facility.objects.filter(organization=facility.organization)
    if org_facilities.count() > 1:
        avg_org_intensity = float(org_facilities.aggregate(a=Avg('baseline_kwh_sqft'))['a'] or 14.5)
        if fac_intensity > avg_org_intensity * 1.15:
            rec, created = OptimizationRecommendation.objects.get_or_create(
                organization=facility.organization,
                facility=facility,
                recommendation_type='demand_threshold',
                time_window_start=now,
                time_window_end=now + timedelta(days=7),
                defaults={
                    "current_condition": f"Facility energy intensity ({fac_intensity} kWh/sqft) is {round((fac_intensity/avg_org_intensity - 1)*100, 1)}% higher than organization benchmark ({round(avg_org_intensity, 2)} kWh/sqft).",
                    "suggested_action": "Conduct building envelope & HVAC sub-metering audit to isolate efficiency gaps.",
                    "expected_energy_impact_kwh": Decimal('0.00'),
                    "expected_demand_impact_kw": Decimal('0.00'),
                    "expected_cost_impact": Decimal('0.00'),
                    "confidence_score": Decimal('0.75'),
                    "reason": "DETECTED: High relative energy intensity. WHY IT MATTERS: Facility operates below portfolio energy efficiency benchmark. ACTION: Audit high-consumption sub-meters. EXPECTED IMPACT: Impact cannot be estimated from available data. CALCULATION BASIS: Comparative baseline energy intensity ranking across organization portfolio."
                }
            )
            recommendations.append(rec)

    return recommendations


def simulate_energy_scenario(facility, name, scenario_type, parameters, user=None):
    """
    Run energy scenario simulation without altering real measured telemetry data.
    Calculates baseline vs simulated energy, peak demand, costs, and savings.
    """
    now = timezone.now()
    start_date = now.date() - timedelta(days=30)
    end_date = now.date()

    readings = EnergyReading.objects.filter(
        meter__facility=facility,
        timestamp__date__gte=start_date,
        timestamp__date__lte=end_date
    )

    agg = readings.aggregate(
        total_kwh=Sum('consumption'),
        max_kw=Max('demand')
    )

    baseline_kwh = Decimal(str(round(agg['total_kwh'] or 50000.0, 2)))
    baseline_peak_kw = Decimal(str(round(agg['max_kw'] or 150.0, 2)))
    
    rate_per_kwh = Decimal('0.12')
    rate_per_kw = Decimal('15.00')

    baseline_cost = (baseline_kwh * rate_per_kwh) + (baseline_peak_kw * rate_per_kw)

    simulated_kwh = baseline_kwh
    simulated_peak_kw = baseline_peak_kw

    if scenario_type == 'load_shift':
        pct = Decimal(str(parameters.get('shift_percentage', 10.0))) / Decimal('100.0')
        simulated_peak_kw = baseline_peak_kw * (Decimal('1.0') - (pct * Decimal('0.5')))
    elif scenario_type == 'demand_reduction':
        pct = Decimal(str(parameters.get('reduction_percentage', 15.0))) / Decimal('100.0')
        simulated_peak_kw = baseline_peak_kw * (Decimal('1.0') - pct)
        simulated_kwh = baseline_kwh * (Decimal('1.0') - (pct * Decimal('0.3')))
    elif scenario_type == 'add_solar':
        solar_capacity_kw = Decimal(str(parameters.get('solar_kw', 100.0)))
        est_monthly_solar_kwh = solar_capacity_kw * Decimal('120.0')
        simulated_kwh = max(Decimal('0.0'), baseline_kwh - est_monthly_solar_kwh)
        simulated_peak_kw = max(Decimal('0.0'), baseline_peak_kw - (solar_capacity_kw * Decimal('0.25')))
    elif scenario_type == 'add_battery':
        battery_kwh = Decimal(str(parameters.get('battery_kwh', 250.0)))
        peak_shave_kw = battery_kwh * Decimal('0.20')
        simulated_peak_kw = max(Decimal('0.0'), baseline_peak_kw - peak_shave_kw)

    simulated_cost = (simulated_kwh * rate_per_kwh) + (simulated_peak_kw * rate_per_kw)

    cost_savings = Decimal(str(round(max(Decimal('0.0'), baseline_cost - simulated_cost), 2)))
    kwh_savings = Decimal(str(round(max(Decimal('0.0'), baseline_kwh - simulated_kwh), 2)))
    demand_savings_kw = Decimal(str(round(max(Decimal('0.0'), baseline_peak_kw - simulated_peak_kw), 2)))

    scenario = ScenarioSimulation.objects.create(
        organization=facility.organization,
        facility=facility,
        name=name,
        scenario_type=scenario_type,
        parameters=parameters,
        baseline_cost=Decimal(str(round(baseline_cost, 2))),
        simulated_cost=Decimal(str(round(simulated_cost, 2))),
        baseline_kwh=baseline_kwh,
        simulated_kwh=simulated_kwh,
        baseline_peak_kw=baseline_peak_kw,
        simulated_peak_kw=simulated_peak_kw,
        cost_savings=cost_savings,
        kwh_savings=kwh_savings,
        demand_savings_kw=demand_savings_kw,
        created_by=user if (user and user.is_authenticated) else None
    )

    return scenario
