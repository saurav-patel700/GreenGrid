"""
Data Quality Engine for GreenGrid EMIS.
Applies explicit, transparent rules to evaluate meter telemetry readings.

States:
- GOOD: Valid reading within expected operational bounds.
- DELAYED: Timestamp arrived > 15 minutes past expected interval.
- MISSING: Telemetry gap detected for expected interval.
- SUSPECT: Reading violates domain physics or operational threshold bounds.
"""

from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

QUALITY_GOOD = 'good'
QUALITY_DELAYED = 'delayed'
QUALITY_MISSING = 'missing'
QUALITY_SUSPECT = 'suspect'

RULES_DOCUMENTATION = [
    {
        "code": "RULE_NON_NEGATIVE",
        "description": "Consumption and demand cannot be negative numbers.",
        "flag": QUALITY_SUSPECT
    },
    {
        "code": "RULE_VOLTAGE_BOUNDS",
        "description": "Grid voltage must be between 80V and 500V AC if reported.",
        "flag": QUALITY_SUSPECT
    },
    {
        "code": "RULE_POWER_FACTOR_BOUNDS",
        "description": "Power factor must be between 0.000 and 1.000 if reported.",
        "flag": QUALITY_SUSPECT
    },
    {
        "code": "RULE_DEMAND_CAPACITY",
        "description": "Demand value cannot exceed 100,000 kW for a single meter.",
        "flag": QUALITY_SUSPECT
    },
    {
        "code": "RULE_DELAYED_ARRIVAL",
        "description": "Telemetry timestamp is more than 15 minutes behind real time.",
        "flag": QUALITY_DELAYED
    },
]

def evaluate_reading_quality(consumption, demand, voltage=None, power_factor=None, reading_timestamp=None, recent_baseline=None):
    """
    Evaluates a telemetry reading against explicit data quality rules.
    Returns (quality_status, reason_string).
    """
    try:
        consumption = float(consumption) if consumption is not None else 0.0
        demand = float(demand) if demand is not None else 0.0
    except (ValueError, TypeError):
        return QUALITY_SUSPECT, "Invalid numeric format for consumption or demand."

    # Rule 1: Non-negative check
    if consumption < 0.0 or demand < 0.0:
        return QUALITY_SUSPECT, f"Impossible negative telemetry value detected (consumption: {consumption}, demand: {demand})."

    # Rule 2: Unreasonable high demand cap check
    if demand > 100000.0 or consumption > 500000.0:
        return QUALITY_SUSPECT, f"Extreme value out of operational bounds (demand: {demand} kW)."

    # Rule 3: Voltage bounds check
    if voltage is not None:
        try:
            v_val = float(voltage)
            if v_val < 80.0 or v_val > 500.0:
                return QUALITY_SUSPECT, f"Voltage reading ({v_val}V) outside expected grid limits (80V - 500V)."
        except (ValueError, TypeError):
            return QUALITY_SUSPECT, "Invalid voltage reading format."

    # Rule 4: Power Factor bounds check
    if power_factor is not None:
        try:
            pf_val = float(power_factor)
            if pf_val < 0.0 or pf_val > 1.0:
                return QUALITY_SUSPECT, f"Power factor ({pf_val}) outside valid range (0.00 - 1.00)."
        except (ValueError, TypeError):
            return QUALITY_SUSPECT, "Invalid power factor reading format."

    # Rule 5: Sudden abnormal change spike (>50% vs recent baseline)
    if recent_baseline is not None and recent_baseline > 10.0:
        if demand > (recent_baseline * 2.5):
            return QUALITY_SUSPECT, f"Sudden abnormal demand spike ({demand} kW vs baseline {recent_baseline:.1f} kW)."

    # Rule 6: Delayed arrival check
    if reading_timestamp:
        now = timezone.now()
        if timezone.is_naive(reading_timestamp):
            reading_timestamp = timezone.make_aware(reading_timestamp)
        if (now - reading_timestamp) > timedelta(minutes=15):
            return QUALITY_DELAYED, "Telemetry timestamp arrived > 15 minutes past scheduled interval."

    return QUALITY_GOOD, "Reading verified clean."
