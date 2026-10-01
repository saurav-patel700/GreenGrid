from django.urls import re_path
from .consumers import OrgConsumer

websocket_urlpatterns = [
    re_path(r'ws/org/(?P<org_id>\d+)/$', OrgConsumer.as_asgi()),
]
