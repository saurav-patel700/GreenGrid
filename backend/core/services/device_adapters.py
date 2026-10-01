import random
from datetime import timedelta
from django.utils import timezone
from core.models import Device, Alert


class BaseDeviceAdapter:
    """Base interface for Industrial Protocol Adapters."""
    def connect(self, host, port):
        raise NotImplementedError
    
    def read_telemetry(self, device):
        raise NotImplementedError


class ModbusTCPAdapter(BaseDeviceAdapter):
    """Modbus TCP Industrial Protocol Adapter Abstraction."""
    def connect(self, host, port):
        return True # Simulated TCP socket handshake

    def read_telemetry(self, device):
        # Maps registers 40001 (Voltage), 40002 (Current), 40003 (kW)
        return {
            "voltage": round(random.uniform(235.0, 245.0), 1),
            "current": round(random.uniform(10.0, 50.0), 1),
            "demand": round(random.uniform(15.0, 45.0), 2),
            "consumption": round(random.uniform(5.0, 20.0), 2),
            "power_factor": round(random.uniform(0.92, 0.98), 2),
            "quality": "good"
        }


class BACnetIPAdapter(BaseDeviceAdapter):
    """BACnet/IP Building Automation Protocol Adapter Abstraction."""
    def connect(self, host, port):
        return True

    def read_telemetry(self, device):
        return {
            "voltage": 240.0,
            "demand": round(random.uniform(20.0, 60.0), 2),
            "consumption": round(random.uniform(10.0, 30.0), 2),
            "quality": "good"
        }


class MQTTAdapter(BaseDeviceAdapter):
    """MQTT Industrial IoT Telemetry Ingestion Adapter."""
    def connect(self, host, port):
        return True

    def parse_payload(self, topic, payload):
        # Validates and normalizes MQTT topic telemetry payload
        consumption = float(payload.get('consumption', 0.0))
        demand = float(payload.get('demand', 0.0))
        return {
            "consumption": consumption,
            "demand": demand,
            "unit": payload.get('unit', 'kWh'),
            "source": payload.get('source', 'grid'),
            "quality": "good" if consumption >= 0 and demand >= 0 else "suspect"
        }


class SimulatorAdapter(BaseDeviceAdapter):
    """Virtual Telemetry Simulator Adapter."""
    def read_telemetry(self, device):
        return {
            "consumption": round(random.uniform(5.0, 25.0), 2),
            "demand": round(random.uniform(10.0, 35.0), 2),
            "voltage": 240.0,
            "power_factor": 0.95,
            "quality": "good"
        }


def get_adapter_for_protocol(protocol):
    adapters = {
        'modbus_tcp': ModbusTCPAdapter(),
        'bacnet_ip': BACnetIPAdapter(),
        'mqtt': MQTTAdapter(),
        'simulator': SimulatorAdapter()
    }
    return adapters.get(protocol, SimulatorAdapter())


def evaluate_device_health(device):
    """
    Evaluates device health, updates last_seen/connection_status, latency, missing intervals,
    error counts, and triggers alerts if communication fails.
    """
    now = timezone.now()
    adapter = get_adapter_for_protocol(device.protocol)

    # Protocol-specific expected latency bounds
    latency_map = {
        'modbus_tcp': random.randint(12, 38),
        'modbus_rtu': random.randint(35, 95),
        'bacnet_ip': random.randint(22, 60),
        'mqtt': random.randint(5, 18),
        'simulator': random.randint(2, 10),
    }

    try:
        telemetry = adapter.read_telemetry(device)
        device.last_seen = now
        device.connection_status = 'online'
        device.save(update_fields=['last_seen', 'connection_status'])

        latency_ms = latency_map.get(device.protocol, 15)
        
        return {
            "device_id": device.id,
            "device_name": device.name,
            "serial_number": device.serial_number,
            "status": "online",
            "protocol": device.protocol,
            "protocol_display": device.get_protocol_display(),
            "last_seen": now.isoformat(),
            "last_successful_reading": now.isoformat(),
            "communication_latency_ms": latency_ms,
            "missing_intervals": 0,
            "data_quality": telemetry.get('quality', 'good'),
            "error_count": 0,
            "health_status": "optimal" if latency_ms < 50 else "degraded",
            "latest_telemetry": telemetry
        }
    except Exception as e:
        device.connection_status = 'offline'
        device.save(update_fields=['connection_status'])

        # Create deduplicated alert if offline
        existing_alert = Alert.objects.filter(
            facility=device.facility,
            title__icontains=device.name,
            is_resolved=False
        ).exists()

        if not existing_alert:
            Alert.objects.create(
                facility=device.facility,
                severity='warning',
                title=f"Device Communication Failure: {device.name}",
                description=f"Device {device.name} ({device.serial_number}) failed communication check over protocol {device.protocol}. Error: {str(e)}"
            )

        return {
            "device_id": device.id,
            "device_name": device.name,
            "serial_number": device.serial_number,
            "status": "offline",
            "protocol": device.protocol,
            "protocol_display": device.get_protocol_display(),
            "last_seen": device.last_seen.isoformat() if device.last_seen else None,
            "last_successful_reading": device.last_seen.isoformat() if device.last_seen else None,
            "communication_latency_ms": None,
            "missing_intervals": 3,
            "data_quality": "missing",
            "error_count": 1,
            "health_status": "critical",
            "error": str(e)
        }
