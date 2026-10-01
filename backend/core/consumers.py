import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken
from core.models import UserProfile

class OrgConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.org_id = self.scope['url_route']['kwargs'].get('org_id')
        self.group_name = f"organization_{self.org_id}"

        # Authenticate token from query string ?token=<jwt_access_token>
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
        token_str = params.get('token')

        user = await self.get_user_from_token(token_str)
        if not user or not user.is_active:
            await self.close(code=4001)
            return

        # Check if user belongs to the requested organization
        user_org_id = await self.get_user_org_id(user)
        if str(user_org_id) != str(self.org_id):
            await self.close(code=4003)
            return

        self.user = user
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_json({
            "type": "connection_established",
            "message": f"Connected to real-time telemetry stream for Organization #{self.org_id}",
            "user": user.username
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        # Clients can send ping heartbeats
        if content.get("type") == "ping":
            await self.send_json({"type": "pong", "timestamp": content.get("timestamp")})

    # Broadcast Handlers
    async def alert_new(self, event):
        await self.send_json(event)

    async def alert_resolved(self, event):
        await self.send_json(event)

    async def meter_status_changed(self, event):
        await self.send_json(event)

    async def energy_reading_created(self, event):
        await self.send_json(event)

    async def energy_anomaly_detected(self, event):
        await self.send_json(event)

    async def dashboard_refresh(self, event):
        await self.send_json(event)

    @database_sync_to_async
    def get_user_from_token(self, token_str):
        if not token_str:
            return None
        try:
            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except Exception:
            return None

    @database_sync_to_async
    def get_user_org_id(self, user):
        try:
            return user.profile.organization_id
        except Exception:
            return None
