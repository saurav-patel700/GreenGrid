"""
GreenGrid Protocol Extension Architecture Foundation.
Provides clean extension points for IoT Industrial Protocol Adapters (Modbus, BACnet, MQTT).
Converts raw hardware telemetry payloads into a unified GreenGrid Telemetry Ingestion Payload.
"""

from abc import ABC, abstractmethod
from decimal import Decimal
from django.utils import timezone
import datetime

class TelemetryIngestionPayload:
    """
    Standardized GreenGrid internal telemetry structure.
    """
    def __init__(self, meter_number, timestamp=None, consumption=0.0, demand=0.0, unit="kWh", source="grid",
                 voltage=None, current=None, power_factor=None, reactive_power=None, frequency=None, raw_payload=None):
        self.meter_number = str(meter_number)
        self.timestamp = timestamp or timezone.now()
        self.consumption = Decimal(str(consumption or 0.0))
        self.demand = Decimal(str(demand or 0.0))
        self.unit = unit
        self.source = source
        self.voltage = Decimal(str(voltage)) if voltage is not None else None
        self.current = Decimal(str(current)) if current is not None else None
        self.power_factor = Decimal(str(power_factor)) if power_factor is not None else None
        self.reactive_power = Decimal(str(reactive_power)) if reactive_power is not None else None
        self.frequency = Decimal(str(frequency)) if frequency is not None else None
        self.raw_payload = raw_payload or {}

    def to_dict(self):
        return {
            "meter_number": self.meter_number,
            "timestamp": self.timestamp.isoformat() if hasattr(self.timestamp, 'isoformat') else str(self.timestamp),
            "consumption": float(self.consumption),
            "demand": float(self.demand),
            "unit": self.unit,
            "source": self.source,
            "voltage": float(self.voltage) if self.voltage is not None else None,
            "current": float(self.current) if self.current is not None else None,
            "power_factor": float(self.power_factor) if self.power_factor is not None else None,
            "reactive_power": float(self.reactive_power) if self.reactive_power is not None else None,
            "frequency": float(self.frequency) if self.frequency is not None else None,
            "raw_payload": self.raw_payload,
        }

class BaseProtocolAdapter(ABC):
    """
    Abstract base class for all protocol hardware adapters.
    """
    @abstractmethod
    def parse_payload(self, raw_data: dict) -> TelemetryIngestionPayload:
        pass

class ModbusRTUAdapter(BaseProtocolAdapter):
    """
    Adapter for Modbus RTU / TCP register maps (e.g. Schneider Electric iEM3000 / Siemens PAC3200).
    Maps Modbus registers (Active Energy, Active Power, Voltage L-N, Current, Power Factor) into standard payload.
    """
    def parse_payload(self, raw_data: dict) -> TelemetryIngestionPayload:
        registers = raw_data.get("registers", {})
        meter_id = raw_data.get("slave_id") or raw_data.get("meter_number") or raw_data.get("meter_id")
        
        # Example Modbus register conversions (kW = W / 1000)
        consumption = registers.get("30001_kwh", raw_data.get("consumption", 0.0))
        demand = registers.get("30005_kw", raw_data.get("demand", 0.0))
        voltage = registers.get("30009_volts", raw_data.get("voltage"))
        current = registers.get("30013_amps", raw_data.get("current"))
        pf = registers.get("30017_pf", raw_data.get("power_factor"))

        return TelemetryIngestionPayload(
            meter_number=meter_id,
            timestamp=raw_data.get("timestamp"),
            consumption=consumption,
            demand=demand,
            unit=raw_data.get("unit", "kWh"),
            source="grid",
            voltage=voltage,
            current=current,
            power_factor=pf,
            raw_payload=raw_data
        )

class BACnetIPAdapter(BaseProtocolAdapter):
    """
    Adapter for BACnet IP objects (Analog Inputs / Present Values for Energy & Demand).
    """
    def parse_payload(self, raw_data: dict) -> TelemetryIngestionPayload:
        bacnet_objs = raw_data.get("objects", {})
        meter_id = raw_data.get("device_instance") or raw_data.get("meter_number") or raw_data.get("meter_id")

        consumption = bacnet_objs.get("AI_1_kWh", raw_data.get("consumption", 0.0))
        demand = bacnet_objs.get("AI_2_kW", raw_data.get("demand", 0.0))

        return TelemetryIngestionPayload(
            meter_number=meter_id,
            timestamp=raw_data.get("timestamp"),
            consumption=consumption,
            demand=demand,
            unit="kWh",
            source="grid",
            raw_payload=raw_data
        )

class MQTTEdgeAdapter(BaseProtocolAdapter):
    """
    Adapter for MQTT JSON telemetry payloads emitted by Edge Gateways (e.g. Mosquitto / AWS IoT Core).
    """
    def parse_payload(self, raw_data: dict) -> TelemetryIngestionPayload:
        return TelemetryIngestionPayload(
            meter_number=raw_data.get("meter_id") or raw_data.get("meter_number"),
            timestamp=raw_data.get("timestamp"),
            consumption=raw_data.get("consumption", 0.0),
            demand=raw_data.get("demand", 0.0),
            unit=raw_data.get("unit", "kWh"),
            source=raw_data.get("source", "grid"),
            voltage=raw_data.get("voltage"),
            current=raw_data.get("current"),
            power_factor=raw_data.get("power_factor"),
            reactive_power=raw_data.get("reactive_power"),
            frequency=raw_data.get("frequency"),
            raw_payload=raw_data
        )
