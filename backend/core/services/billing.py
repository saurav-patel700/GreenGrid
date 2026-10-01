from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, time
from django.db.models import Sum, Max, Avg, Count
from django.utils import timezone

from core.models import EnergyReading, TariffPlan, TariffRate, TariffTimePeriod, DemandChargeRule, Meter


def quantize_money(amount):
    """Utility to round monetary amounts to 2 decimal places using Decimal."""
    if amount is None:
        return Decimal('0.00')
    return Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_bill_for_facility(facility, start_date, end_date, tariff_plan=None, meter_id=None):
    """
    Calculate an itemized electricity bill for a facility or specific meter over a billing period.
    Uses precise Decimal calculations server-side.
    
    Returns structured dict:
    {
        "consumption_kwh": Decimal,
        "peak_demand_kw": Decimal,
        "energy_charge": Decimal,
        "demand_charge": Decimal,
        "fixed_charge": Decimal,
        "tax": Decimal,
        "adjustments": Decimal,
        "total": Decimal,
        "currency": str,
        "tou_breakdown": {
            "OFF_PEAK": {"kwh": Decimal, "rate": Decimal, "cost": Decimal},
            "SHOULDER": {"kwh": Decimal, "rate": Decimal, "cost": Decimal},
            "ON_PEAK": {"kwh": Decimal, "rate": Decimal, "cost": Decimal}
        },
        "demand_breakdown": {
            "peak_kw": Decimal,
            "threshold_kw": Decimal,
            "billable_kw": Decimal,
            "rate_per_kw": Decimal,
            "cost": Decimal
        }
    }
    """
    # 1. Resolve meters for facility
    meters = Meter.objects.filter(facility=facility)
    if meter_id:
        meters = meters.filter(id=meter_id)
        
    readings = EnergyReading.objects.filter(
        meter__in=meters,
        timestamp__date__gte=start_date,
        timestamp__date__lte=end_date
    )
    
    # Aggregated base metrics
    totals = readings.aggregate(
        total_kwh=Sum('consumption'),
        max_demand=Max('demand')
    )
    
    total_kwh = Decimal(str(totals['total_kwh'] or '0.00'))
    peak_demand_kw = Decimal(str(totals['max_demand'] or '0.00'))
    
    # 2. Resolve Tariff Plan
    if not tariff_plan:
        tariff_plan = TariffPlan.objects.filter(
            organization=facility.organization,
            status='active'
        ).order_by('-created_at').first()
        
    currency = tariff_plan.currency if tariff_plan else facility.organization.currency
    fixed_charge = Decimal(str(tariff_plan.fixed_monthly_charge)) if tariff_plan else Decimal('0.00')
    tax_percentage = Decimal(str(tariff_plan.tax_percentage)) if tariff_plan else Decimal('0.00')
    
    # Default fallback rates if no tariff plan or component exists
    default_rate = Decimal('0.1200') # default $0.12 / kWh fallback
    
    tou_breakdown = {
        "OFF_PEAK": {"kwh": Decimal('0.00'), "rate": Decimal('0.0800'), "cost": Decimal('0.00')},
        "SHOULDER": {"kwh": Decimal('0.00'), "rate": Decimal('0.1200'), "cost": Decimal('0.00')},
        "ON_PEAK": {"kwh": Decimal('0.00'), "rate": Decimal('0.1800'), "cost": Decimal('0.00')}
    }
    
    energy_charge = Decimal('0.00')
    
    if tariff_plan:
        # Check standard ENERGY TariffRate if configured
        standard_energy_rate = tariff_plan.rates.filter(rate_type='ENERGY').first()
        if standard_energy_rate:
            default_rate = Decimal(str(standard_energy_rate.unit_rate))
            
        tou_periods = list(tariff_plan.tou_periods.all())
        if tou_periods:
            # Populating active TOU rates into breakdown
            for period in tou_periods:
                if period.period_type in tou_breakdown:
                    tou_breakdown[period.period_type]["rate"] = Decimal(str(period.rate))
                    
            # Process readings for TOU categorization
            # Avoid memory issues by processing values cleanly
            for r in readings.only('timestamp', 'consumption'):
                dt = r.timestamp
                reading_time = dt.time()
                weekday = str(dt.weekday()) # 0=Mon, 6=Sun
                r_kwh = Decimal(str(r.consumption))
                
                matched_period = None
                for tp in tou_periods:
                    days_list = [d.strip() for d in tp.days_of_week.split(',') if d.strip()]
                    if days_list and weekday not in days_list:
                        continue
                        
                    # Handle midnight-crossing time periods (e.g. 22:00 to 06:00)
                    if tp.start_time <= tp.end_time:
                        in_time = (tp.start_time <= reading_time <= tp.end_time)
                    else:
                        in_time = (reading_time >= tp.start_time or reading_time <= tp.end_time)
                        
                    if in_time:
                        matched_period = tp
                        break
                        
                if matched_period and matched_period.period_type in tou_breakdown:
                    p_type = matched_period.period_type
                    tou_breakdown[p_type]["kwh"] += r_kwh
                else:
                    # Fallback to OFF_PEAK
                    tou_breakdown["OFF_PEAK"]["kwh"] += r_kwh
                    
            for p_type, data in tou_breakdown.items():
                data["cost"] = quantize_money(data["kwh"] * data["rate"])
                data["kwh"] = Decimal(str(data["kwh"])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                energy_charge += data["cost"]
        else:
            # Simple flat rate calculation
            energy_charge = quantize_money(total_kwh * default_rate)
            tou_breakdown["OFF_PEAK"]["kwh"] = Decimal(str(total_kwh)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tou_breakdown["OFF_PEAK"]["rate"] = default_rate
            tou_breakdown["OFF_PEAK"]["cost"] = energy_charge
    else:
        # Fallback flat rate calculation
        energy_charge = quantize_money(total_kwh * default_rate)
        tou_breakdown["OFF_PEAK"]["kwh"] = Decimal(str(total_kwh)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        tou_breakdown["OFF_PEAK"]["rate"] = default_rate
        tou_breakdown["OFF_PEAK"]["cost"] = energy_charge

    # 3. Demand Charge Calculation
    demand_charge = Decimal('0.00')
    demand_breakdown = {
        "peak_kw": peak_demand_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        "threshold_kw": Decimal('0.00'),
        "billable_kw": Decimal('0.00'),
        "rate_per_kw": Decimal('0.00'),
        "cost": Decimal('0.00')
    }
    
    if tariff_plan:
        demand_rule = tariff_plan.demand_rules.first()
        if demand_rule:
            rate_per_kw = Decimal(str(demand_rule.rate_per_kw))
            threshold_kw = Decimal(str(demand_rule.threshold_kw))
            minimum_demand_kw = Decimal(str(demand_rule.minimum_demand_kw))
            
            billable_kw = max(peak_demand_kw - threshold_kw, minimum_demand_kw, Decimal('0.00'))
            demand_cost = quantize_money(billable_kw * rate_per_kw)
            
            demand_charge = demand_cost
            demand_breakdown = {
                "peak_kw": peak_demand_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                "threshold_kw": threshold_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                "billable_kw": billable_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                "rate_per_kw": rate_per_kw,
                "cost": demand_cost
            }
        else:
            # Check DEMAND TariffRate if configured
            demand_rate_obj = tariff_plan.rates.filter(rate_type='DEMAND').first()
            if demand_rate_obj:
                rate_per_kw = Decimal(str(demand_rate_obj.unit_rate))
                demand_cost = quantize_money(peak_demand_kw * rate_per_kw)
                demand_charge = demand_cost
                demand_breakdown = {
                    "peak_kw": peak_demand_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                    "threshold_kw": Decimal('0.00'),
                    "billable_kw": peak_demand_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                    "rate_per_kw": rate_per_kw,
                    "cost": demand_cost
                }
                
    # 4. Tax Calculation
    subtotal = energy_charge + demand_charge + fixed_charge
    tax_amount = quantize_money(subtotal * (tax_percentage / Decimal('100.0')))
    adjustments = Decimal('0.00')
    total_bill = subtotal + tax_amount + adjustments
    
    return {
        "consumption_kwh": total_kwh.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        "peak_demand_kw": peak_demand_kw.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
        "energy_charge": quantize_money(energy_charge),
        "demand_charge": quantize_money(demand_charge),
        "fixed_charge": quantize_money(fixed_charge),
        "tax": quantize_money(tax_amount),
        "adjustments": quantize_money(adjustments),
        "total": quantize_money(total_bill),
        "currency": currency,
        "tariff_name": tariff_plan.name if tariff_plan else "Default Standard Rate",
        "tou_breakdown": tou_breakdown,
        "demand_breakdown": demand_breakdown
    }


def compare_tariff_scenarios(facility, start_date, end_date, primary_tariff_id, alternative_tariff_id):
    """
    Compare modeled cost for a facility between two tariffs over a date range.
    Returns neutral factual comparison data without biased hype.
    """
    try:
        primary_tariff = TariffPlan.objects.get(id=primary_tariff_id)
        alt_tariff = TariffPlan.objects.get(id=alternative_tariff_id)
    except TariffPlan.DoesNotExist:
        raise ValueError("One or both specified tariffs do not exist.")
        
    calc_primary = calculate_bill_for_facility(facility, start_date, end_date, tariff_plan=primary_tariff)
    calc_alt = calculate_bill_for_facility(facility, start_date, end_date, tariff_plan=alt_tariff)
    
    diff_total = calc_alt["total"] - calc_primary["total"]
    diff_percent = Decimal('0.00')
    if calc_primary["total"] > 0:
        diff_percent = ((diff_total / calc_primary["total"]) * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
    return {
        "facility_id": facility.id,
        "facility_name": facility.name,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "primary_tariff": {
            "id": primary_tariff.id,
            "name": primary_tariff.name,
            "total_cost": calc_primary["total"],
            "energy_charge": calc_primary["energy_charge"],
            "demand_charge": calc_primary["demand_charge"],
            "fixed_charge": calc_primary["fixed_charge"],
            "tax": calc_primary["tax"],
        },
        "alternative_tariff": {
            "id": alt_tariff.id,
            "name": alt_tariff.name,
            "total_cost": calc_alt["total"],
            "energy_charge": calc_alt["energy_charge"],
            "demand_charge": calc_alt["demand_charge"],
            "fixed_charge": calc_alt["fixed_charge"],
            "tax": calc_alt["tax"],
        },
        "variance": {
            "modeled_cost_difference": diff_total,
            "percentage_difference": diff_percent,
            "currency": calc_primary["currency"],
            "summary": f"Modeled cost under {alt_tariff.name} is {'higher' if diff_total > 0 else 'lower' if diff_total < 0 else 'identical'} by {calc_primary['currency']} {abs(diff_total)} ({abs(diff_percent)}%) compared to {primary_tariff.name}."
        }
    }
