"""
Safe Device Control & Automation Engine for GreenGrid
Enforces read-only defaults, explicit user authorization, role permissions,
safety policy limits, command queue lifecycle, audit logging, and global emergency stop.
"""
from decimal import Decimal
from django.utils import timezone
from core.models import (
    Organization, Facility, Device, AutomationConfig, DeviceSafetyPolicy, ControlCommand, AuditLog, Alert
)

def get_or_create_automation_config(organization):
    """Retrieves or initializes organization automation configuration."""
    config, _ = AutomationConfig.objects.get_or_create(
        organization=organization,
        defaults={'automation_enabled': True, 'mode': 'approval_required'}
    )
    return config

def get_or_create_safety_policy(organization, facility=None, device=None):
    """Retrieves or initializes device safety boundaries."""
    policy = DeviceSafetyPolicy.objects.filter(
        organization=organization,
        device=device,
        facility=facility
    ).first()

    if not policy:
        policy = DeviceSafetyPolicy.objects.filter(
            organization=organization,
            facility=facility,
            device__isnull=True
        ).first()

    if not policy:
        policy, _ = DeviceSafetyPolicy.objects.get_or_create(
            organization=organization,
            facility=None,
            device=None,
            defaults={
                'min_battery_soc_percent': Decimal('10.00'),
                'max_battery_soc_percent': Decimal('95.00'),
                'max_charge_power_kw': Decimal('250.00'),
                'max_discharge_power_kw': Decimal('250.00'),
                'max_hvac_setpoint_change_deg': Decimal('3.0'),
                'max_command_duration_minutes': 120
            }
        )
    return policy

def validate_control_command(command_type, requested_value, device, user):
    """
    Validates a control command against role permissions, global emergency stop, and safety limits.
    Returns (is_valid, rejection_reason, validation_code).
    """
    org = device.organization

    # 1. Tenant boundary check
    profile = getattr(user, 'profile', None)
    if not profile or profile.organization != org:
        return False, "Unauthorized: User does not belong to the device organization.", "CROSS_TENANT_UNAUTHORIZED"

    # 2. Global Emergency Stop check
    auto_config = get_or_create_automation_config(org)
    if not auto_config.automation_enabled:
        return False, "Global automation is currently DISABLED (Emergency Stop Active).", "GLOBAL_DISABLED"

    # 3. RBAC check: Only admin or facility_manager can initiate control commands
    if profile.role not in ['admin', 'facility_manager']:
        return False, "Unauthorized: User role does not possess device control privileges.", "UNAUTHORIZED_ROLE"

    # 3. Safety Limit Boundaries Check
    safety_policy = get_or_create_safety_policy(org, facility=device.facility, device=device)
    if safety_policy.emergency_shutdown_active:
        return False, "Emergency shutdown active for this facility/device.", "EMERGENCY_SHUTDOWN"

    try:
        val = float(requested_value)
    except (ValueError, TypeError):
        val = 0.0

    if command_type in ['set_bess_soc_limit', 'bess_charge', 'bess_discharge']:
        min_soc = float(safety_policy.min_battery_soc_percent)
        max_soc = float(safety_policy.max_battery_soc_percent)
        if command_type == 'set_bess_soc_limit' and (val < min_soc or val > max_soc):
            return False, f"BESS SOC request ({val}%) violates safety boundary [{min_soc}% - {max_soc}%].", "SOC_OUT_OF_BOUNDS"
        
        max_dis = float(safety_policy.max_discharge_power_kw)
        if command_type == 'bess_discharge' and val > max_dis:
            return False, f"Discharge power request ({val} kW) exceeds safety limit ({max_dis} kW).", "POWER_OUT_OF_BOUNDS"

    elif command_type == 'hvac_setpoint':
        max_change = float(safety_policy.max_hvac_setpoint_change_deg)
        if abs(val) > max_change:
            return False, f"HVAC setpoint adjustment ({val}°C) exceeds max allowed change ({max_change}°C).", "SETPOINT_OUT_OF_BOUNDS"

    return True, "", "PASSED"

def create_control_command(organization, device, command_type, requested_value, user):
    """
    Creates and queues a control command with read-only validation & approval requirements.
    """
    is_valid, reason, code = validate_control_command(command_type, requested_value, device, user)
    
    auto_config = get_or_create_automation_config(organization)

    # Determine approval requirement based on automation mode
    if not is_valid:
        approval_status = 'REJECTED'
        execution_status = 'REJECTED'
        validation_status = 'REJECTED'
    elif auto_config.mode == 'automated' and command_type != 'emergency_stop':
        approval_status = 'NOT_REQUIRED'
        execution_status = 'APPROVED'
        validation_status = 'PASSED'
    else:
        approval_status = 'PENDING'
        execution_status = 'PENDING_APPROVAL'
        validation_status = 'PASSED'

    cmd = ControlCommand.objects.create(
        organization=organization,
        device=device,
        command_type=command_type,
        requested_value=str(requested_value),
        requested_by=user,
        validation_status=validation_status,
        approval_status=approval_status,
        execution_status=execution_status,
        rejection_reason=reason
    )

    # Log to audit log
    AuditLog.objects.create(
        organization=organization,
        user=user,
        action=f"CONTROL_COMMAND_REQUESTED_{command_type.upper()}",
        resource_type="ControlCommand",
        resource_id=str(cmd.id),
        metadata={
            'device_id': device.id,
            'device_serial': device.serial_number,
            'requested_value': requested_value,
            'status': execution_status,
            'rejection_reason': reason
        }
    )

    return cmd

def approve_and_execute_command(command_id, user):
    """
    Approves and executes a queued control command.
    """
    if hasattr(command_id, 'id'):
        cmd = command_id
    else:
        cmd = ControlCommand.objects.get(id=command_id)

    profile = getattr(user, 'profile', None)
    if not profile or profile.role not in ['admin', 'facility_manager']:
        raise PermissionError("User role does not possess command approval authorization.")

    if profile.organization != cmd.organization:
        raise PermissionError("User belongs to a different organization than the command target.")

    # Re-validate before execution
    is_valid, reason, _ = validate_control_command(cmd.command_type, cmd.requested_value, cmd.device, user)
    if not is_valid:
        cmd.execution_status = 'FAILED'
        cmd.rejection_reason = reason
        cmd.save()
        return cmd

    cmd.approved_by = user
    cmd.approval_status = 'APPROVED'
    cmd.execution_status = 'COMPLETED'
    cmd.executed_at = timezone.now()
    cmd.completed_at = timezone.now()
    cmd.result_payload = {
        'status': 'SUCCESS',
        'execution_mode': 'SAFE_SIMULATED_ADAPTER_DISPATCH',
        'applied_value': cmd.requested_value,
        'protocol': cmd.device.protocol,
        'timestamp': timezone.now().isoformat()
    }
    cmd.save()

    AuditLog.objects.create(
        organization=cmd.organization,
        user=user,
        action=f"CONTROL_COMMAND_EXECUTED_{cmd.command_type.upper()}",
        resource_type="ControlCommand",
        resource_id=str(cmd.id),
        metadata={
            'device_serial': cmd.device.serial_number,
            'applied_value': cmd.requested_value
        }
    )

    return cmd

def emergency_stop_all_automation(organization, user, reason="Manual Operational Emergency Stop Triggered"):
    """
    Global Organization Emergency Stop: Immediately disables all automated control commands
    and cancels all pending control commands across the organization.
    """
    auto_config = get_or_create_automation_config(organization)
    auto_config.automation_enabled = False
    auto_config.updated_by = user
    auto_config.save()

    # Cancel all pending commands
    pending_cmds = ControlCommand.objects.filter(
        organization=organization,
        execution_status__in=['PENDING_APPROVAL', 'REQUESTED', 'APPROVED', 'EXECUTING']
    )
    count = pending_cmds.count()
    pending_cmds.update(
        execution_status='CANCELLED',
        rejection_reason=f"Emergency Stop: {reason}"
    )

    Alert.objects.create(
        severity='critical',
        title=f"EMERGENCY STOP ACTIVATED - {organization.name}",
        description=f"Global automation was manually DISABLED by {user.username}. {count} pending control commands cancelled."
    )

    AuditLog.objects.create(
        organization=organization,
        user=user,
        action="EMERGENCY_STOP_ACTIVATED",
        resource_type="AutomationConfig",
        resource_id=str(auto_config.id),
        metadata={'cancelled_commands_count': count, 'reason': reason}
    )

    return {'status': 'DISABLED', 'cancelled_commands_count': count}
