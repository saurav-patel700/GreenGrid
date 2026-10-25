"""
EMIS Energy Analytics Calculation Engine for GreenGrid.
Provides server-side aggregations for summaries, load profiles, demand, source breakdowns,
facility comparisons, energy intensity, and data quality.
"""

from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, Avg, Max, Min, Count, Q, F
from django.db.models.functions import TruncHour, TruncDay, TruncMinute
from django.utils import timezone

from core.models import Facility, Meter, EnergyReading, RenewableAsset, Alert
from core.services.date_utils import parse_date_range, determine_aggregation

def _get_org_anchor(org):
    now = timezone.now()
    try:
        latest = EnergyReading.objects.filter(meter__facility__organization=org).order_by('-timestamp').only('timestamp').first()
        if latest and latest.timestamp and (now - latest.timestamp) > timedelta(days=2):
            return latest.timestamp
    except Exception:
        pass
    return now

def _clean_id_filter(val):
    if not val:
        return None
    s = str(val).strip().lower()
    if s in ['all', 'null', 'undefined', 'none', '']:
        return None
    return val

def calculate_energy_summary(org, facility_id=None, date_range="7d", start_str=None, end_str=None):
    """
    Computes summary KPIs with previous period comparison.
    """
    start_dt, end_dt, comp_start_dt, comp_end_dt, comp_label = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))

    facilities = Facility.objects.filter(organization=org)
    fac_id_clean = _clean_id_filter(facility_id)
    if fac_id_clean:
        facilities = facilities.filter(id=fac_id_clean)

    readings_curr = EnergyReading.objects.filter(
        meter__facility__in=facilities,
        timestamp__gte=start_dt,
        timestamp__lte=end_dt
    )

    readings_prev = EnergyReading.objects.filter(
        meter__facility__in=facilities,
        timestamp__gte=comp_start_dt,
        timestamp__lt=start_dt
    )

    # Current period metrics
    agg_curr = readings_curr.aggregate(
        total_kwh=Sum('consumption'),
        avg_kw=Avg('demand'),
        max_kw=Max('demand'),
        min_kw=Min('demand'),
        total_cost=Sum('cost_estimate')
    )

    # Previous period metrics
    agg_prev = readings_prev.aggregate(
        total_kwh=Sum('consumption'),
        avg_kw=Avg('demand'),
        max_kw=Max('demand'),
        total_cost=Sum('cost_estimate')
    )

    curr_kwh = float(agg_curr['total_kwh'] or 0.0)
    prev_kwh = float(agg_prev['total_kwh'] or 0.0)
    curr_cost = float(agg_curr['total_cost'] or 0.0)
    prev_cost = float(agg_prev['total_cost'] or 0.0)
    curr_peak = float(agg_curr['max_kw'] or 0.0)
    prev_peak = float(agg_prev['max_kw'] or 0.0)
    curr_avg = float(agg_curr['avg_kw'] or 0.0)
    curr_min = float(agg_curr['min_kw'] or 0.0)

    # Calculate percentage changes
    kwh_change = ((curr_kwh - prev_kwh) / prev_kwh * 100.0) if prev_kwh > 0 else 0.0
    cost_change = ((curr_cost - prev_cost) / prev_cost * 100.0) if prev_cost > 0 else 0.0
    peak_change = ((curr_peak - prev_peak) / prev_peak * 100.0) if prev_peak > 0 else 0.0

    # Solar generation
    solar_kwh = float(readings_curr.filter(source='solar').aggregate(s=Sum('consumption'))['s'] or 0.0)

    # Energy intensity
    total_sqft = sum(f.square_footage for f in facilities if f.square_footage)
    intensity_value = (curr_kwh / total_sqft) if total_sqft > 0 else None

    return {
        "organization": org.name,
        "facility_filter": facility_id or "all",
        "date_range": date_range,
        "comparison_period": comp_label,
        "kpis": {
            "consumption": {
                "value": round(curr_kwh, 2),
                "formatted_value": f"{curr_kwh:,.1f}",
                "unit": org.energy_unit,
                "change_percent": round(kwh_change, 1),
                "trend": "down" if kwh_change < 0 else "up",
                "comparison_period": comp_label,
                "label": "Total Energy Consumption"
            },
            "cost": {
                "value": round(curr_cost, 2),
                "formatted_value": f"{curr_cost:,.2f}",
                "unit": org.currency,
                "change_percent": round(cost_change, 1),
                "trend": "down" if cost_change < 0 else "up",
                "comparison_period": comp_label,
                "label": "Energy Cost"
            },
            "peak_demand": {
                "value": round(curr_peak, 2),
                "formatted_value": f"{curr_peak:,.1f}",
                "unit": org.power_unit,
                "change_percent": round(peak_change, 1),
                "trend": "up" if peak_change > 0 else "down",
                "comparison_period": comp_label,
                "label": "Peak Demand"
            },
            "average_demand": {
                "value": round(curr_avg, 2),
                "formatted_value": f"{curr_avg:,.1f}",
                "unit": org.power_unit,
                "label": "Average Demand"
            },
            "min_demand": {
                "value": round(curr_min, 2),
                "formatted_value": f"{curr_min:,.1f}",
                "unit": org.power_unit,
                "label": "Minimum Base Load"
            },
            "renewable_generation": {
                "value": round(solar_kwh, 2),
                "formatted_value": f"{solar_kwh:,.1f}",
                "unit": org.energy_unit,
                "label": "Renewable Generation"
            },
            "energy_intensity": {
                "value": round(intensity_value, 2) if intensity_value is not None else None,
                "formatted_value": f"{intensity_value:.2f}" if intensity_value is not None else "Energy intensity unavailable",
                "unit": f"{org.energy_unit} / sq ft",
                "label": "Energy Intensity"
            }
        }
    }

def get_timeseries_analytics(org, facility_id=None, meter_id=None, date_range="7d", start_str=None, end_str=None, aggregation=None, source=None):
    """
    Returns time series load profile and telemetry trends.
    """
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))
    agg_level = determine_aggregation(start_dt, end_dt, aggregation)

    facilities = Facility.objects.filter(organization=org)
    fac_id_clean = _clean_id_filter(facility_id)
    if fac_id_clean:
        facilities = facilities.filter(id=fac_id_clean)

    readings = EnergyReading.objects.filter(
        meter__facility__in=facilities,
        timestamp__gte=start_dt,
        timestamp__lte=end_dt
    ).select_related('meter', 'meter__facility')

    mtr_id_clean = _clean_id_filter(meter_id)
    if mtr_id_clean:
        readings = readings.filter(meter_id=mtr_id_clean)

    if source:
        readings = readings.filter(source=source)

    # Truncate according to aggregation level
    if agg_level in ['1d', 'daily']:
        trunc_func = TruncDay('timestamp')
    elif agg_level in ['1h', 'hourly']:
        trunc_func = TruncHour('timestamp')
    else:
        trunc_func = TruncMinute('timestamp')

    grouped = readings.annotate(time_bucket=trunc_func).values('time_bucket').annotate(
        total_kwh=Sum('consumption'),
        avg_demand=Avg('demand'),
        max_demand=Max('demand'),
        avg_voltage=Avg('voltage'),
        avg_pf=Avg('power_factor'),
        total_cost=Sum('cost_estimate'),
        grid_kwh=Sum('consumption', filter=Q(source='grid')),
        solar_kwh=Sum('consumption', filter=Q(source='solar')),
        battery_kwh=Sum('consumption', filter=Q(source='battery'))
    ).order_by('time_bucket')

    series = []
    for item in grouped:
        t_bucket = item['time_bucket']
        t_str = t_bucket.strftime('%Y-%m-%d %H:%M') if t_bucket else ''
        if not t_bucket:
            time_lbl = ''
        elif agg_level in ['1d', 'daily']:
            time_lbl = t_bucket.strftime('%b %d')
        elif (end_dt - start_dt).total_seconds() > 86400:
            time_lbl = t_bucket.strftime('%b %d %H:%M')
        else:
            time_lbl = t_bucket.strftime('%H:%M')

        series.append({
            "timestamp": t_str,
            "time": time_lbl,
            "date": t_bucket.strftime('%b %d') if t_bucket else '',
            "total": float(item['total_kwh'] or 0.0),
            "demand": float(item['avg_demand'] or 0.0),
            "peak_demand": float(item['max_demand'] or 0.0),
            "grid": float(item['grid_kwh'] or 0.0),
            "solar": float(item['solar_kwh'] or 0.0),
            "battery": float(item['battery_kwh'] or 0.0),
            "voltage": float(item['avg_voltage']) if item['avg_voltage'] is not None else None,
            "power_factor": float(item['avg_pf']) if item['avg_pf'] is not None else None,
            "cost": float(item['total_cost'] or 0.0)
        })

    return {
        "aggregation": agg_level,
        "date_range": date_range,
        "series": series
    }

def get_demand_analytics(org, facility_id=None, meter_id=None, date_range="7d", start_str=None, end_str=None):
    """
    Computes peak demand, historical peak, peak timestamp, average demand, and demand profile.
    """
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))

    facilities = Facility.objects.filter(organization=org)
    fac_id_clean = _clean_id_filter(facility_id)
    if fac_id_clean:
        facilities = facilities.filter(id=fac_id_clean)

    readings = EnergyReading.objects.filter(
        meter__facility__in=facilities,
        timestamp__gte=start_dt,
        timestamp__lte=end_dt
    )

    mtr_id_clean = _clean_id_filter(meter_id)
    if mtr_id_clean:
        readings = readings.filter(meter_id=mtr_id_clean)

    peak_reading = readings.order_by('-demand').first()
    agg = readings.aggregate(avg_kw=Avg('demand'), peak_kw=Max('demand'))

    # Historical peak across all time
    all_time_peak = EnergyReading.objects.filter(meter__facility__in=facilities).aggregate(max_kw=Max('demand'))['max_kw']

    threshold_limit = 1200.0  # Configured demand threshold limit (kW)

    # Daily peak demand profile
    daily_peaks = readings.annotate(day=TruncDay('timestamp')).values('day').annotate(
        actual_peak=Max('demand'),
        avg_demand=Avg('demand')
    ).order_by('day')

    profile = []
    for d in daily_peaks:
        profile.append({
            "date": d['day'].strftime('%a %b %d') if d['day'] else '',
            "time": d['day'].strftime('%b %d') if d['day'] else '',
            "actual_peak": float(d['actual_peak'] or 0.0),
            "average_demand": float(d['avg_demand'] or 0.0),
            "limit": threshold_limit
        })

    return {
        "current_peak": float(agg['peak_kw'] or 0.0),
        "average_demand": float(agg['avg_kw'] or 0.0),
        "historical_peak": float(all_time_peak or 0.0),
        "peak_timestamp": peak_reading.timestamp.isoformat() if peak_reading else None,
        "demand_threshold_limit": threshold_limit,
        "profile": profile
    }

def get_facility_comparison(org, date_range="7d", start_str=None, end_str=None):
    """
    Returns comparative measurements across all organization facilities.
    """
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))

    facilities = Facility.objects.filter(organization=org)
    comparison = []

    for fac in facilities:
        readings = EnergyReading.objects.filter(
            meter__facility=fac,
            timestamp__gte=start_dt,
            timestamp__lte=end_dt
        )
        agg = readings.aggregate(
            kwh=Sum('consumption'),
            peak=Max('demand'),
            cost=Sum('cost_estimate'),
            solar=Sum('consumption', filter=Q(source='solar'))
        )

        kwh_val = float(agg['kwh'] or 0.0)
        cost_val = float(agg['cost'] or 0.0)
        peak_val = float(agg['peak'] or 0.0)
        solar_val = float(agg['solar'] or 0.0)

        intensity = (kwh_val / fac.square_footage) if fac.square_footage else None

        comparison.append({
            "facility_id": fac.id,
            "facility_name": fac.name,
            "facility_type": fac.get_facility_type_display(),
            "city": fac.city,
            "state": fac.state,
            "square_footage": fac.square_footage,
            "total_consumption_kwh": round(kwh_val, 2),
            "total_cost": round(cost_val, 2),
            "peak_demand_kw": round(peak_val, 2),
            "renewable_generation_kwh": round(solar_val, 2),
            "energy_intensity": round(intensity, 2) if intensity is not None else None,
            "status": fac.get_status_display()
        })

    return comparison

def get_source_breakdown(org, facility_id=None, date_range="7d", start_str=None, end_str=None):
    """
    Computes absolute kWh and percentage breakdown by energy source.
    """
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))

    facilities = Facility.objects.filter(organization=org)
    fac_id_clean = _clean_id_filter(facility_id)
    if fac_id_clean:
        facilities = facilities.filter(id=fac_id_clean)

    readings = EnergyReading.objects.filter(
        meter__facility__in=facilities,
        timestamp__gte=start_dt,
        timestamp__lte=end_dt
    )

    total_kwh = float(readings.aggregate(s=Sum('consumption'))['s'] or 0.0)

    by_source = readings.values('source').annotate(kwh=Sum('consumption')).order_by('-kwh')

    breakdown = []
    for item in by_source:
        kwh = float(item['kwh'] or 0.0)
        pct = (kwh / total_kwh * 100.0) if total_kwh > 0 else 0.0
        breakdown.append({
            "source": item['source'],
            "source_display": dict(EnergyReading.SOURCE_CHOICES).get(item['source'], item['source']),
            "kwh": round(kwh, 2),
            "percentage": round(pct, 1)
        })

    return {
        "total_kwh": round(total_kwh, 2),
        "sources": breakdown
    }

def get_energy_intensity(org, date_range="7d", start_str=None, end_str=None):
    """
    Calculates building energy intensity (kWh / sq ft or kWh / sq m) per facility and organization average.
    If building square footage is missing, displays 'Energy intensity unavailable'.
    """
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))
    facilities = Facility.objects.filter(organization=org)

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

    return {
        "organization_average_intensity": round(org_avg_intensity, 2) if org_avg_intensity is not None else None,
        "formatted_organization_intensity": f"{org_avg_intensity:.2f}" if org_avg_intensity is not None else "Energy intensity unavailable",
        "facilities": results
    }

def get_data_quality_report(org, facility_id=None, date_range="7d", start_str=None, end_str=None):
    """
    Returns data quality statistics, quality score %, and suspect readings log.
    """
    start_dt, end_dt, _, _, _ = parse_date_range(date_range, start_str, end_str, org.timezone, _get_org_anchor(org))

    facilities = Facility.objects.filter(organization=org)
    fac_id_clean = _clean_id_filter(facility_id)
    if fac_id_clean:
        facilities = facilities.filter(id=fac_id_clean)

    readings = EnergyReading.objects.filter(
        meter__facility__in=facilities,
        timestamp__gte=start_dt,
        timestamp__lte=end_dt
    )

    total_count = readings.count()
    good_count = readings.filter(quality_status='good').count()
    delayed_count = readings.filter(quality_status='delayed').count()
    missing_count = readings.filter(quality_status='missing').count()
    suspect_count = readings.filter(quality_status='suspect').count()

    quality_score = (good_count / total_count * 100.0) if total_count > 0 else 100.0

    suspect_readings = []
    for r in readings.filter(quality_status__in=['suspect', 'delayed', 'missing']).select_related('meter', 'meter__facility')[:20]:
        suspect_readings.append({
            "id": r.id,
            "meter_id": r.meter.id,
            "meter_name": r.meter.name,
            "facility_name": r.meter.facility.name,
            "timestamp": r.timestamp.isoformat(),
            "consumption": float(r.consumption),
            "demand": float(r.demand),
            "quality_status": r.quality_status,
            "raw_payload": r.raw_payload
        })

    return {
        "total_readings": total_count,
        "good_readings": good_count,
        "delayed_readings": delayed_count,
        "missing_readings": missing_count,
        "suspect_readings_count": suspect_count,
        "quality_score_percent": round(quality_score, 1),
        "recent_issues": suspect_readings
    }
