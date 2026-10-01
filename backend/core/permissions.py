from rest_framework import permissions

class IsOrgAdmin(permissions.BasePermission):
    """
    Allows access only to users with the 'admin' role in their Organization.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role == 'admin'

class IsOrgFacilityManagerOrAdmin(permissions.BasePermission):
    """
    Allows access to Admins and Facility Managers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role in ['admin', 'facility_manager']

class IsOrgAnalystOrAbove(permissions.BasePermission):
    """
    Allows access to Admins, Facility Managers, and Energy Analysts.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role in ['admin', 'facility_manager', 'analyst']

class IsReadOnlyOrFacilityManagerAdmin(permissions.BasePermission):
    """
    Allows SAFE_METHODS to all authenticated org users, write actions restricted to admin and facility_manager.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role in ['admin', 'facility_manager']
