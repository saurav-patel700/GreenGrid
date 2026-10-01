"""
Carbon Accounting & Grid Carbon Intelligence Service for GreenGrid
Handles Scope 1/2 emissions calculation, emission factors, carbon intensity trends, and renewable intelligence.
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Avg
from core.models import (
    Facility, EnergyReading, RenewableAsset, EmissionFactor, StorageAsset
)

def get_active_emission_factor(organization, region='US-TX'):
    """
    Retrieves the active emission factor for the organization and region.
    Returns None if no active factor is configured.
    """
    factor_obj = EmissionFactor.objects.filter(
        organization=organization,
        region=region,
        is_active=True
    ).order_by('-effective_from').first()

    if not factor_obj:
        factor_obj = EmissionFactor.objects.filter(
            organization=organization,
            is_active=True
        ).order_by('-effective_from').first()

    return factor_obj

def calculate_facility_emissions(organization, facility_id=None, days=30):
    """
    Calculates carbon emissions for a facility or entire organization based on grid electricity
    consumption and configured emission factors.
    Formula: Grid consumption (kWh) * emission factor (kgCO2/kWh) = estimated CO2 emissions.
    Renewable generation contributes to avoided emissions.
    """
    cutoff = timezone.now() - timedelta(days=days)

    if facility_id and str(facility_id).lower() not in ['all', 'none', 'null', '']:
        facility = Facility.objects.filter(id=facility_id, organization=organization).first()
        readings = EnergyReading.objects.filter(
            meter__facility=facility,
            timestamp__gte=cutoff
        ) if facility else EnergyReading.objects.none()
        facility_name = facility.name if facility else "Selected Facility"
    else:
        facility = None
        readings = EnergyReading.objects.filter(
            meter__facility__organization=organization,
            timestamp__gte=cutoff
        )
        facility_name = "All Organization Facilities"

    total_kwh = float(readings.aggregate(total=Sum('consumption'))['total'] or 0.0)
    grid_kwh = float(readings.filter(source='grid').aggregate(total=Sum('consumption'))['total'] or 0.0)
    solar_kwh = float(readings.filter(source='solar').aggregate(total=Sum('consumption'))['total'] or 0.0)
    battery_kwh = float(readings.filter(source='battery').aggregate(total=Sum('consumption'))['total'] or 0.0)

    emission_factor_obj = get_active_emission_factor(organization)

    # Baseline default eGRID factor if none configured in DB
    factor_value = float(emission_factor_obj.factor_kg_co2_per_kwh) if emission_factor_obj else 0.3850
    factor_source = emission_factor_obj.source_name if emission_factor_obj else 'EPA eGRID Baseline (US-TX Default)'

    grid_emissions_kg = grid_kwh * factor_value
    avoided_emissions_kg = (solar_kwh + battery_kwh) * factor_value
    net_emissions_kg = grid_emissions_kg
    net_emissions_tonnes = net_emissions_kg / 1000.0

    carbon_intensity = (net_emissions_kg / total_kwh) if total_kwh > 0 else factor_value

    return {
        'facility_id': facility.id if facility else 'all',
        'facility_name': facility_name,
        'period_days': days,
        'total_kwh': round(total_kwh, 2),
        'grid_kwh': round(grid_kwh, 2),
        'solar_kwh': round(solar_kwh, 2),
        'battery_kwh': round(battery_kwh, 2),
        'emissions_available': True,
        'emissions_reason': None,
        'total_emissions_kg_co2': round(net_emissions_kg, 2),
        'total_emissions_tonnes_co2': round(net_emissions_tonnes, 3),
        'grid_emissions_kg_co2': round(grid_emissions_kg, 2),
        'avoided_emissions_kg_co2': round(avoided_emissions_kg, 2),
        'carbon_intensity_kg_per_kwh': round(carbon_intensity, 4),
        'emission_factor_used': {
            'region': emission_factor_obj.region if emission_factor_obj else 'US-TX',
            'factor_kg_co2_per_kwh': factor_value,
            'source_name': factor_source,
            'scope': emission_factor_obj.scope if emission_factor_obj else 'scope_2',
            'version': emission_factor_obj.version if emission_factor_obj else '1.0',
        }
    }

def get_carbon_intensity_timeseries(organization, facility_id=None, days=7):
    """
    Returns daily timeseries of energy consumption, grid emissions, and avoided emissions.
    """
    emission_factor_obj = get_active_emission_factor(organization)
    factor_val = float(emission_factor_obj.factor_kg_co2_per_kwh) if emission_factor_obj else 0.3850

    timeseries = []
    now = timezone.now()

    is_single_fac = facility_id and str(facility_id).lower() not in ['all', 'none', 'null', '']

    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        readings = EnergyReading.objects.filter(
            timestamp__gte=day_start,
            timestamp__lt=day_end
        )
        if is_single_fac:
            readings = readings.filter(meter__facility_id=facility_id)
        else:
            readings = readings.filter(meter__facility__organization=organization)

        grid_kwh = float(readings.filter(source='grid').aggregate(total=Sum('consumption'))['total'] or 0.0)
        solar_kwh = float(readings.filter(source='solar').aggregate(total=Sum('consumption'))['total'] or 0.0)
        total_kwh = grid_kwh + solar_kwh

        emissions_kg = grid_kwh * factor_val
        avoided_kg = solar_kwh * factor_val

        timeseries.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'total_kwh': round(total_kwh, 2),
            'grid_kwh': round(grid_kwh, 2),
            'solar_kwh': round(solar_kwh, 2),
            'emissions_kg_co2': round(emissions_kg, 2),
            'avoided_kg_co2': round(avoided_kg, 2),
            'intensity_kg_kwh': round(emissions_kg / total_kwh, 4) if total_kwh > 0 else factor_val
        })

    return timeseries

def get_renewable_intelligence(organization, facility_id=None, days=30):
    """
    Provides detailed renewable PV generation, self-consumption %, and grid interaction.
    """
    cutoff = timezone.now() - timedelta(days=days)

    is_single_fac = facility_id and str(facility_id).lower() not in ['all', 'none', 'null', '']
    if is_single_fac:
        facility = Facility.objects.filter(id=facility_id, organization=organization).first()
        renewable_assets = RenewableAsset.objects.filter(facility=facility) if facility else RenewableAsset.objects.none()
        bess_assets = StorageAsset.objects.filter(facility=facility) if facility else StorageAsset.objects.none()
        readings = EnergyReading.objects.filter(meter__facility=facility, timestamp__gte=cutoff) if facility else EnergyReading.objects.none()
        facility_name = facility.name if facility else "Selected Facility"
    else:
        facility = None
        renewable_assets = RenewableAsset.objects.filter(facility__organization=organization)
        bess_assets = StorageAsset.objects.filter(facility__organization=organization)
        readings = EnergyReading.objects.filter(meter__facility__organization=organization, timestamp__gte=cutoff)
        facility_name = "All Facilities"

    solar_generation_kwh = float(readings.filter(source='solar').aggregate(total=Sum('consumption'))['total'] or 0.0)
    grid_import_kwh = float(readings.filter(source='grid').aggregate(total=Sum('consumption'))['total'] or 0.0)
    battery_discharge_kwh = float(readings.filter(source='battery').aggregate(total=Sum('consumption'))['total'] or 0.0)
    total_consumption_kwh = solar_generation_kwh + grid_import_kwh + battery_discharge_kwh

    total_pv_capacity = float(renewable_assets.filter(asset_type='solar_pv').aggregate(total=Sum('capacity_kw'))['total'] or 0.0)
    total_bess_capacity = float(bess_assets.aggregate(total=Sum('capacity_kwh'))['total'] or 0.0)

    grid_export_kwh = 0.0
    self_consumption_pct = 100.0 if solar_generation_kwh > 0 else 0.0
    renewable_share_pct = (solar_generation_kwh / total_consumption_kwh * 100.0) if total_consumption_kwh > 0 else 0.0

    return {
        'facility_id': facility.id if facility else 'all',
        'facility_name': facility_name,
        'period_days': days,
        'solar_pv_capacity_kw': round(total_pv_capacity, 2),
        'bess_capacity_kwh': round(total_bess_capacity, 2),
        'solar_generation_kwh': round(solar_generation_kwh, 2),
        'grid_import_kwh': round(grid_import_kwh, 2),
        'battery_discharge_kwh': round(battery_discharge_kwh, 2),
        'grid_export_kwh': round(grid_export_kwh, 2),
        'self_consumption_pct': round(self_consumption_pct, 1),
        'renewable_share_pct': round(renewable_share_pct, 1),
        'curtailment_kwh': 0.0,
    }
