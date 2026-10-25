from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def root_status_view(request):
    return JsonResponse({
        "status": "healthy",
        "service": "GreenGrid EMIS Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health/",
            "api": "/api/"
        }
    })


urlpatterns = [
    path('', root_status_view, name='root-status'),
    path('health/', root_status_view, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
]

