from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from core.models import AuditLog

def broadcast_org_event(org_id, event_type, payload):
    """
    Broadcasts real-time events to all WebSocket clients connected to organization_<org_id>.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"organization_{org_id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": event_type.replace('.', '_'), # e.g. alert.new -> alert_new
                    "event": event_type,
                    "data": payload
                }
            )
    except Exception as e:
        print(f"[WebSocket Broadcast Notice] Unable to dispatch real-time event: {e}")

def create_audit_log(organization, user, action, resource_type, resource_id='', metadata=None, request=None):
    """
    Helper function to record security & administration audit log entries.
    """
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    return AuditLog.objects.create(
        organization=organization,
        user=user if (user and user.is_authenticated) else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        metadata=metadata or {},
        ip_address=ip_address
    )
