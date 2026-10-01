"""
Enterprise Reporting & Scheduled Report Engine for GreenGrid
Generates comprehensive reports from real database data in CSV or printable HTML/PDF formats.
Supports energy, demand, cost, billing, renewable, carbon, device health, forecast accuracy, demand response, and optimization reports.
"""
import csv
import io
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Avg, Max, Count
from core.models import (
    Organization, Facility, Meter, EnergyReading, UtilityBill,
    RenewableAsset, Device, ForecastRecord, DemandResponseEvent,
    OptimizationRecommendation, EmissionFactor, ScheduledReport, Alert
)
from core.services.carbon import calculate_facility_emissions

def generate_report_dataset(report_type, organization, facility=None, days=30):
    """
    Aggregates database records for the requested report type.
    """
    cutoff = timezone.now() - timedelta(days=days)
    facilities = [facility] if facility else Facility.objects.filter(organization=organization)
    facility_ids = [f.id for f in facilities]

    start_date_str = cutoff.strftime('%Y-%m-%d')
    end_date_str = timezone.now().strftime('%Y-%m-%d')

    metadata = {
        'report_type': report_type,
        'organization_code': organization.code,
        'organization_name': organization.name,
        'facility_scope': facility.name if facility else 'All Facilities',
        'generated_at': timezone.now().isoformat(),
        'period_days': days,
        'start_date': start_date_str,
        'end_date': end_date_str,
    }

    rows = []

    if report_type in ['energy', 'demand', 'cost']:
        for fac in facilities:
            readings = EnergyReading.objects.filter(meter__facility=fac, timestamp__gte=cutoff)
            agg = readings.aggregate(
                total_kwh=Sum('consumption'),
                peak_kw=Max('demand'),
                avg_power_factor=Avg('power_factor'),
                reading_count=Count('id')
            )
            total_kwh = float(agg['total_kwh'] or 0.0)
            peak_kw = float(agg['peak_kw'] or 0.0)
            pf = float(agg['avg_power_factor'] or 0.95)
            estimated_cost = total_kwh * 0.12 + peak_kw * 14.50 # TOU + demand estimate

            rows.append({
                'Facility': fac.name,
                'Facility Type': fac.get_facility_type_display(),
                'Total Consumption (kWh)': round(total_kwh, 2),
                'Peak Demand (kW)': round(peak_kw, 2),
                'Avg Power Factor': round(pf, 3),
                'Estimated Cost (INR)': round(estimated_cost, 2),
                'Reading Count': agg['reading_count']
            })

    elif report_type == 'carbon':
        for fac in facilities:
            carbon_data = calculate_facility_emissions(fac.id, days=days)
            rows.append({
                'Facility': fac.name,
                'Total Consumption (kWh)': carbon_data['total_kwh'],
                'Grid Import (kWh)': carbon_data['grid_kwh'],
                'Solar PV Usage (kWh)': carbon_data['solar_kwh'],
                'Emissions Available': 'Yes' if carbon_data['emissions_available'] else 'No',
                'Net Emissions (kg CO2)': carbon_data['total_emissions_kg_co2'],
                'Net Emissions (Tonnes CO2)': carbon_data['total_emissions_tonnes_co2'],
                'Avoided Emissions (kg CO2)': carbon_data['avoided_emissions_kg_co2'],
                'Carbon Intensity (kg/kWh)': carbon_data['carbon_intensity_kg_per_kwh']
            })

    elif report_type == 'billing':
        bills = UtilityBill.objects.filter(facility__in=facilities, created_at__gte=cutoff)
        for b in bills:
            rows.append({
                'Invoice #': b.invoice_number,
                'Facility': b.facility.name,
                'Utility Provider': b.utility_provider,
                'Billing Start': b.billing_period_start.strftime('%Y-%m-%d'),
                'Billing End': b.billing_period_end.strftime('%Y-%m-%d'),
                'Billed Consumption (kWh)': float(b.billed_consumption_kwh or b.total_consumption_kwh),
                'Billed Peak Demand (kW)': float(b.billed_demand_kw or b.peak_demand_kw),
                'Billed Amount (INR)': float(b.billed_amount or b.total_cost_usd),
                'Reconciliation Status': b.get_reconciliation_status_display()
            })

    elif report_type == 'device_health':
        devices = Device.objects.filter(facility__in=facilities)
        for d in devices:
            rows.append({
                'Device Name': d.name,
                'Facility': d.facility.name,
                'Protocol': d.get_protocol_display(),
                'Host': f"{d.host}:{d.port}",
                'Serial Number': d.serial_number,
                'Status': d.get_connection_status_display(),
                'Firmware': d.firmware_version,
                'Last Seen': d.last_seen.strftime('%Y-%m-%d %H:%M') if d.last_seen else 'Never'
            })

    elif report_type == 'executive':
        for fac in facilities:
            readings = EnergyReading.objects.filter(meter__facility=fac, timestamp__gte=cutoff)
            agg = readings.aggregate(
                total_kwh=Sum('consumption'),
                peak_kw=Max('demand')
            )
            total_kwh = float(agg['total_kwh'] or 0.0)
            peak_kw = float(agg['peak_kw'] or 0.0)
            estimated_cost = total_kwh * 0.12 + peak_kw * 14.50

            solar_kwh = float(readings.filter(source='solar').aggregate(s=Sum('consumption'))['s'] or 0.0)
            carbon_data = calculate_facility_emissions(fac.id, days=days)

            anomalies_cnt = Alert.objects.filter(facility=fac, is_resolved=False).count()
            dr_cnt = DemandResponseEvent.objects.filter(facility=fac, start_time__gte=cutoff).count()
            opt_cnt = OptimizationRecommendation.objects.filter(facility=fac, created_at__gte=cutoff).count()

            rows.append({
                'Facility': fac.name,
                'Total Consumption (kWh)': round(total_kwh, 2),
                'Peak Demand (kW)': round(peak_kw, 2),
                'Total Energy Cost (INR)': round(estimated_cost, 2),
                'Renewable Generation (kWh)': round(solar_kwh, 2),
                'Scope 2 Emissions (kg CO2)': carbon_data['total_emissions_kg_co2'],
                'Active Anomalies': anomalies_cnt,
                'DR Events': dr_cnt,
                'Optimization Opportunities': opt_cnt
            })

    elif report_type == 'forecast_accuracy':
        forecasts = ForecastRecord.objects.filter(facility__in=facilities, created_at__gte=cutoff)
        for f in forecasts:
            rows.append({
                'Facility': f.facility.name,
                'Target Type': f.get_target_type_display(),
                'Horizon': f.get_horizon_display(),
                'Target Timestamp': f.target_timestamp.strftime('%Y-%m-%d %H:%M'),
                'Forecasted Value': float(f.forecast_value),
                'Lower Bound': float(f.lower_bound or 0.0),
                'Upper Bound': float(f.upper_bound or 0.0),
                'Model Version': f.model_version
            })

    else:
        # Default generic summary
        for fac in facilities:
            rows.append({
                'Facility': fac.name,
                'Status': fac.get_status_display(),
                'Square Footage': fac.square_footage,
                'City/State': f"{fac.city}, {fac.state}"
            })

    return {'metadata': metadata, 'rows': rows}

def export_report_csv(report_data):
    """
    Exports a report dataset to CSV string format.
    """
    output = io.StringIO()
    rows = report_data.get('rows', [])
    if not rows:
        return "No report data available for selected filter.\n"

    fieldnames = list(rows[0].keys())
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

    return output.getvalue()
