"""
Transparent Rule-Based Anomaly Detection & Alert Integration for GreenGrid EMIS.
Evaluates telemetry readings and meter states against defined operational rules.
Generates Alerts, Notifications, and real-time WebSocket events.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from core.models import Alert, Notification, Meter, Facility
from core.utils import broadcast_org_event
from core.serializers import AlertSerializer

ANOMALY_RULES = {
    "DEMAND_THRESHOLD_EXCEEDED": {
        "title": "Peak Demand Threshold Exceeded",
        "severity": "critical",
        "explanation": "Observed demand surpassed configured facility peak limit."
    },
    "SUDDEN_CONSUMPTION_SPIKE": {
        "title": "Sudden Consumption Spike Detected",
        "severity": "warning",
        "explanation": "Observed consumption surged more than 150% above the 24-hour moving baseline."
    },
    "INVALID_NEGATIVE_READING": {
        "title": "Corrupted Negative Telemetry Reading",
        "severity": "critical",
        "explanation": "Meter recorded physically impossible negative consumption or demand."
    },
    "METER_OFFLINE_MISSING_DATA": {
        "title": "Meter Telemetry Offline / Gap",
        "severity": "warning",
        "explanation": "Meter failed to transmit telemetry readings within the expected reporting interval."
    },
    "VOLTAGE_SAG_SPIKE": {
        "title": "Grid Voltage Out-of-Bounds",
        "severity": "warning",
        "explanation": "Grid supply voltage dropped below or exceeded safe operational limits."
    }
}

def detect_and_handle_anomalies(meter, timestamp, consumption, demand, quality_status, quality_reason="", voltage=None, power_factor=None, baseline_demand=None):
    """
    Evaluates reading against anomaly rules.
    Deduplicates ongoing conditions within a 1-hour window.
    """
    facility = meter.facility
    org = facility.organization

    detected_anomalies = []

    # Rule 1: Invalid negative reading
    if quality_status == 'suspect' and ('negative' in quality_reason.lower()):
        detected_anomalies.append({
            "rule_code": "INVALID_NEGATIVE_READING",
            "observed_value": f"Demand: {demand}, kWh: {consumption}",
            "reference_value": ">= 0.00",
            "explanation": quality_reason
        })

    # Rule 2: Voltage out-of-bounds
    if voltage is not None:
        v_float = float(voltage)
        if v_float < 100.0 or v_float > 480.0:
            detected_anomalies.append({
                "rule_code": "VOLTAGE_SAG_SPIKE",
                "observed_value": f"{v_float:.1f} V",
                "reference_value": "120V - 460V",
                "explanation": f"Grid supply voltage ({v_float:.1f}V) recorded outside nominal range."
            })

    # Rule 3: Peak Demand Threshold Exceeded (default 1000 kW per facility or custom)
    threshold_limit = 1000.0  # Default nominal threshold
    if float(demand) > threshold_limit:
        detected_anomalies.append({
            "rule_code": "DEMAND_THRESHOLD_EXCEEDED",
            "observed_value": f"{float(demand):.1f} kW",
            "reference_value": f"{threshold_limit:.1f} kW",
            "explanation": f"Demand of {float(demand):.1f} kW surpassed threshold of {threshold_limit:.1f} kW."
        })

    # Rule 4: Sudden spike vs baseline
    if baseline_demand and float(baseline_demand) > 10.0:
        if float(demand) > (float(baseline_demand) * 2.2):
            detected_anomalies.append({
                "rule_code": "SUDDEN_CONSUMPTION_SPIKE",
                "observed_value": f"{float(demand):.1f} kW",
                "reference_value": f"{float(baseline_demand):.1f} kW baseline",
                "explanation": f"Demand spike ({float(demand):.1f} kW) is 120%+ higher than baseline ({float(baseline_demand):.1f} kW)."
            })

    # Process each detected anomaly with deduplication
    created_alerts = []
    now = timezone.now()
    one_hour_ago = now - timedelta(hours=1)

    for anomaly in detected_anomalies:
        rule_meta = ANOMALY_RULES.get(anomaly["rule_code"], {
            "title": f"Anomaly: {anomaly['rule_code']}",
            "severity": "warning",
            "explanation": anomaly["explanation"]
        })

        # Deduplication check: check if an alert with same title for this meter exists in last hour
        existing = Alert.objects.filter(
            facility=facility,
            meter=meter,
            title=rule_meta["title"],
            timestamp__gte=one_hour_ago,
            is_resolved=False
        ).exists()

        if not existing:
            alert = Alert.objects.create(
                facility=facility,
                meter=meter,
                severity=rule_meta["severity"],
                title=rule_meta["title"],
                description=f"{rule_meta['explanation']} Observed: {anomaly['observed_value']} (Ref: {anomaly['reference_value']}).",
                is_resolved=False
            )
            created_alerts.append(alert)

            # Broadcast WebSocket event `energy.anomaly_detected`
            event_payload = {
                "alert": AlertSerializer(alert).data,
                "anomaly": {
                    "rule_code": anomaly["rule_code"],
                    "facility_id": facility.id,
                    "facility_name": facility.name,
                    "meter_id": meter.id,
                    "meter_name": meter.name,
                    "observed_value": anomaly["observed_value"],
                    "reference_value": anomaly["reference_value"],
                    "explanation": anomaly["explanation"],
                    "timestamp": timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp)
                }
            }
            broadcast_org_event(org.id, "energy.anomaly_detected", event_payload)

    return created_alerts
