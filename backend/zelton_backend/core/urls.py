from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import auth_views

router = DefaultRouter()
router.register(r'owners', views.OwnerViewSet)
router.register(r'properties', views.PropertyViewSet)
router.register(r'units', views.UnitViewSet)
router.register(r'tenants', views.TenantViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'invoices', views.InvoiceViewSet)
router.register(r'pricing-plans', views.PricingPlanViewSet)
router.register(r'analytics', views.AnalyticsViewSet, basename='analytics')
router.register(r'owner-subscriptions', views.OwnerSubscriptionViewSet, basename='owner-subscriptions')
router.register(r'owner-payouts', views.OwnerPayoutViewSet, basename='owner-payout')
router.register(r'tenant-documents', views.TenantDocumentViewSet, basename='tenant-documents')
router.register(r'manual-payment-proofs', views.ManualPaymentProofViewSet, basename='manual-payment-proofs')
router.register(r'webhooks', views.PhonePeWebhookViewSet, basename='webhooks')
router.register(r'auth', auth_views.AuthViewSet, basename='auth')

urlpatterns = [
    path('api/', include(router.urls)),
]