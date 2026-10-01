from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from core.models import UtilityBill, AuditLog
from core.services.billing import calculate_bill_for_facility, quantize_money

try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    HAS_CHANNELS = True
except ImportError:
    HAS_CHANNELS = False


def reconcile_utility_bill(bill, tolerance_percentage=Decimal('2.0'), user=None):
    """
    Reconcile a UtilityBill invoice against GreenGrid energy telemetry and tariff rules.
    Compares billed vs calculated consumption, peak demand, and monetary costs.
    """
    if not isinstance(tolerance_percentage, Decimal):
        tolerance_percentage = Decimal(str(tolerance_percentage))

    facility = bill.facility
    start_date = bill.billing_period_start
    end_date = bill.billing_period_end
    tariff_plan = bill.tariff_plan

    # Execute server-side calculation engine
    calc_result = calculate_bill_for_facility(
        facility=facility,
        start_date=start_date,
        end_date=end_date,
        tariff_plan=tariff_plan
    )

    # Resolve billed values (fallback to legacy fields if new ones are not set)
    billed_kwh = bill.billed_consumption_kwh or bill.total_consumption_kwh or Decimal('0.00')
    billed_kw = bill.billed_demand_kw or bill.peak_demand_kw or Decimal('0.00')
    billed_cost = bill.billed_amount or bill.total_cost_usd or Decimal('0.00')

    calculated_kwh = calc_result["consumption_kwh"]
    calculated_kw = calc_result["peak_demand_kw"]
    calculated_cost = calc_result["total"]

    # Calculate variances
    variance_amount = quantize_money(billed_cost - calculated_cost)
    kwh_variance = quantize_money(billed_kwh - calculated_kwh)
    kw_variance = quantize_money(billed_kw - calculated_kw)

    if billed_cost > Decimal('0.00'):
        variance_percentage = ((abs(variance_amount) / billed_cost) * Decimal('100.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    else:
        variance_percentage = Decimal('0.00')

    # Status assignment based on tolerance
    if variance_percentage <= tolerance_percentage:
        rec_status = 'MATCHED'
    else:
        rec_status = 'VARIANCE'

    # Update bill fields
    bill.billed_consumption_kwh = billed_kwh
    bill.billed_demand_kw = billed_kw
    bill.billed_amount = billed_cost
    bill.total_consumption_kwh = billed_kwh
    bill.peak_demand_kw = billed_kw
    bill.total_cost_usd = billed_cost

    bill.calculated_consumption_kwh = calculated_kwh
    bill.calculated_demand_kw = calculated_kw
    bill.calculated_amount = calculated_cost

    bill.energy_charge = calc_result["energy_charge"]
    bill.demand_charge = calc_result["demand_charge"]
    bill.fixed_charge = calc_result["fixed_charge"]
    bill.tax_amount = calc_result["tax"]
    bill.adjustments = calc_result["adjustments"]

    bill.variance_amount = variance_amount
    bill.variance_percentage = variance_percentage
    bill.reconciliation_status = rec_status
    bill.save()

    # Create Audit Log
    org = facility.organization
    AuditLog.objects.create(
        organization=org,
        user=user if (user and user.is_authenticated) else None,
        action='RECONCILE_UTILITY_BILL',
        resource_type='UtilityBill',
        resource_id=str(bill.id),
        metadata={
            'invoice_number': bill.invoice_number,
            'billed_amount': str(billed_cost),
            'calculated_amount': str(calculated_cost),
            'variance_amount': str(variance_amount),
            'variance_percentage': str(variance_percentage),
            'reconciliation_status': rec_status
        }
    )

    # Dispatch WebSocket notification if channels available
    if HAS_CHANNELS:
        try:
            channel_layer = get_channel_layer()
            group_name = f"org_{org.code}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "billing.reconciliation_updated",
                    "payload": {
                        "bill_id": bill.id,
                        "invoice_number": bill.invoice_number,
                        "facility_name": facility.name,
                        "reconciliation_status": rec_status,
                        "variance_amount": float(variance_amount),
                        "variance_percentage": float(variance_percentage)
                    }
                }
            )
        except Exception:
            pass # Channels optional fallback

    return {
        "bill_id": bill.id,
        "invoice_number": bill.invoice_number,
        "facility_id": facility.id,
        "facility_name": facility.name,
        "reconciliation_status": rec_status,
        "billed": {
            "consumption_kwh": str(billed_kwh),
            "demand_kw": str(billed_kw),
            "amount": str(billed_cost)
        },
        "calculated": {
            "consumption_kwh": str(calculated_kwh),
            "demand_kw": str(calculated_kw),
            "amount": str(calculated_cost),
            "energy_charge": str(calc_result["energy_charge"]),
            "demand_charge": str(calc_result["demand_charge"]),
            "fixed_charge": str(calc_result["fixed_charge"]),
            "tax": str(calc_result["tax"])
        },
        "variance": {
            "consumption_kwh": str(kwh_variance),
            "demand_kw": str(kw_variance),
            "amount": str(variance_amount),
            "percentage": str(variance_percentage),
            "tolerance_percentage": str(tolerance_percentage)
        },
        "tou_breakdown": calc_result["tou_breakdown"]
    }
