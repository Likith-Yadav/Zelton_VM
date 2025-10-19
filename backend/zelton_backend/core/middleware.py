from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


class DisableCSRFMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Disable CSRF for all API endpoints
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None
