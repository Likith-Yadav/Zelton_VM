from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from decimal import Decimal, ROUND_HALF_UP
from django.contrib.auth.models import User
from django.db.models import Q, Sum, Count, Avg
from django.db import models
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from datetime import datetime, timedelta
import requests
import json
import uuid
import base64
import hashlib
import hmac
import logging

logger = logging.getLogger(__name__)

from .models import (
    Owner, Property, Unit, Tenant, TenantKey, Payment, Invoice,
    PaymentProof, ManualPaymentProof, PricingPlan, PaymentTransaction, PropertyImage, UnitImage,
    TenantDocument, OwnerPayment, OwnerPayout
)
from .serializers import (
    OwnerSerializer, PropertySerializer, UnitSerializer, TenantSerializer,
    TenantKeySerializer, PaymentSerializer, InvoiceSerializer, PaymentProofSerializer,
    ManualPaymentProofSerializer, ManualPaymentProofCreateSerializer, ManualPaymentProofVerificationSerializer,
    PricingPlanSerializer, PaymentTransactionSerializer, OwnerDashboardSerializer,
    TenantDashboardSerializer, OwnerPaymentSerializer,
    PaymentInitiationResponseSerializer, TenantDocumentSerializer, OwnerPayoutSerializer
)
from .services.phonepe_service import PhonePeService
from .payment_utils import create_owner_payment_record, handle_legacy_payment, get_owner_payment_history


@method_decorator(csrf_exempt, name='dispatch')
class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.all()
    serializer_class = OwnerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Owner.objects.filter(user=self.request.user)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['post'], url_path='upload-profile-image')
    def upload_profile_image(self, request):
        """Upload owner profile image"""
        try:
            owner = self.get_queryset().first()
            if not owner:
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            if 'profile_image' not in request.FILES:
                return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete old image if exists
            if owner.profile_image:
                owner.profile_image.delete(save=False)
            
            # Save new image
            owner.profile_image = request.FILES['profile_image']
            owner.save()
            
            # Get absolute URL for the image using the same method as serializer
            image_url = None
            if owner.profile_image:
                image_url = request.build_absolute_uri(owner.profile_image.url)
                print(f"Generated image URL: {image_url}")
                print(f"Image file path: {owner.profile_image.path}")
                print(f"Image URL: {owner.profile_image.url}")
            
            return Response({
                'success': True,
                'message': 'Profile image updated successfully',
                'profile_image': image_url
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error uploading profile image: {str(e)}")
            return Response({'error': 'Failed to upload image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        owner = self.get_queryset().first()
        if not owner:
            # Return demo data if no owner profile exists
            return Response({
                'total_properties': 0,
                'total_units': 0,
                'occupied_units': 0,
                'vacant_units': 0,
                'monthly_revenue': 0,
                'pending_payments': 0,
                'overdue_payments': 0,
                'total_due': 0,
                'recent_payments': [],
                'recent_tenants': [],
            })

        # Calculate dashboard metrics
        properties = Property.objects.filter(owner=owner)
        total_properties = properties.count()
        total_units = Unit.objects.filter(property__in=properties).count()
        occupied_units = Unit.objects.filter(property__in=properties, status='occupied').count()
        vacant_units = total_units - occupied_units

        # Calculate total revenue from all completed payments
        total_revenue = Payment.objects.filter(
            unit__property__in=properties,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Calculate current month revenue for comparison
        current_month = timezone.now().replace(day=1)
        monthly_revenue = Payment.objects.filter(
            unit__property__in=properties,
            status='completed',
            payment_date__gte=current_month
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Calculate total due for all tenants
        total_due = 0
        
        # Get all tenants for this owner's properties
        tenants = Tenant.objects.filter(tenant_keys__property__in=properties).distinct()
        
        for tenant in tenants:
            tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if tenant_key:
                unit = tenant_key.unit
                # Calculate total due for this tenant (rent owed - payments made)
                tenant_due = Payment.calculate_monthly_due(tenant, unit)
                total_due += tenant_due

        # For backward compatibility, set pending and overdue to same as total_due
        pending_amount = total_due
        overdue_amount = 0  # We'll calculate this separately if needed

        # Get recent payments with tenant information (only completed payments)
        recent_payments = Payment.objects.filter(
            unit__property__in=properties,
            status='completed'
        ).select_related('tenant__user', 'unit__property').order_by('-created_at')[:5]

        # Get recent tenants
        recent_tenants = Tenant.objects.filter(
            tenant_keys__property__in=properties
        ).select_related('user').distinct().order_by('-created_at')[:5]

        dashboard_data = {
            'total_properties': total_properties,
            'total_units': total_units,
            'occupied_units': occupied_units,
            'vacant_units': vacant_units,
            'monthly_revenue': total_revenue,  # Show total revenue instead of just current month
            'pending_payments': pending_amount,
            'overdue_payments': overdue_amount,
            'total_due': total_due,
            'recent_payments': PaymentSerializer(recent_payments, many=True).data,
            'recent_tenants': TenantSerializer(recent_tenants, many=True).data,
        }

        serializer = OwnerDashboardSerializer(dashboard_data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get owner profile information"""
        owner = self.get_queryset().first()
        if not owner:
            return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = OwnerSerializer(owner)
        return Response({
            'success': True,
            'data': serializer.data
        })


@method_decorator(csrf_exempt, name='dispatch')
class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        owner = Owner.objects.filter(user=self.request.user).first()
        if owner:
            return Property.objects.filter(owner=owner)
        return Property.objects.none()

    def list(self, request, *args, **kwargs):
        """Override list to include payment statistics"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            data = serializer.data
            
            # Enhance with payment data
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            for property_data in data:
                try:
                    property_obj = Property.objects.get(id=property_data['id'])
                    # Calculate payment statistics
                    total_payments = Payment.objects.filter(
                        unit__property=property_obj,
                        status='completed'
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    current_month_payments = Payment.objects.filter(
                        unit__property=property_obj,
                        status='completed'
                    ).filter(
                        Q(payment_date__gte=current_month) | Q(payment_date__isnull=True, created_at__gte=current_month)
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    pending_payments = Payment.objects.filter(
                        unit__property=property_obj,
                        status='pending'
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    property_data['total_payments'] = float(total_payments)
                    property_data['current_month_payments'] = float(current_month_payments)
                    property_data['pending_payments'] = float(pending_payments)
                except (Property.DoesNotExist, KeyError, ValueError) as e:
                    logger.warning(f"Error enhancing property data: {e}")
                    property_data['total_payments'] = 0
                    property_data['current_month_payments'] = 0
                    property_data['pending_payments'] = 0
            
            return Response(data)
        except Exception as e:
            logger.error(f"Error in property list: {e}")
            # Fallback to default list behavior
            return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        
        try:
            owner = Owner.objects.get(user=self.request.user)
            serializer.save(owner=owner)
        except Owner.DoesNotExist:
            raise serializers.ValidationError({'owner': 'Owner profile not found'})
        except Exception as e:
            raise

    @action(detail=False, methods=['get'])
    def detailed_properties(self, request):
        """Get properties with detailed unit and payment information"""
        try:
            owner = Owner.objects.filter(user=request.user).first()
            if not owner:
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            properties = Property.objects.filter(owner=owner)
            detailed_properties = []
            
            for property in properties:
                # Get all units for this property
                units = Unit.objects.filter(property=property)
                
                # Calculate payment statistics
                from django.db.models import Sum, Count
                from django.utils import timezone
                
                # Total payments received for this property
                total_payments = Payment.objects.filter(
                    unit__property=property,
                    status='completed'
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                # Current month payments - use payment_date for accurate monthly tracking
                # Include payments where payment_date is in current month OR payment_date is null but created_at is in current month
                current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                current_month_payments = Payment.objects.filter(
                    unit__property=property,
                    status='completed'
                ).filter(
                    Q(payment_date__gte=current_month) | Q(payment_date__isnull=True, created_at__gte=current_month)
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                # Pending payments - only for units in this property
                pending_payments = Payment.objects.filter(
                    unit__property=property,
                    status='pending'
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                # Unit details with payment info
                unit_details = []
                for unit in units:
                    # Get tenant info for occupied units
                    tenant_info = None
                    if unit.status == 'occupied':
                        tenant_key = TenantKey.objects.filter(unit=unit, is_used=True).first()
                        if tenant_key and tenant_key.tenant:
                            tenant = tenant_key.tenant
                            tenant_info = {
                                'id': tenant.id,
                                'name': tenant.user.get_full_name(),
                                'email': tenant.user.email,
                                'phone': tenant.phone,
                                'move_in_date': tenant_key.used_at,
                            }
                    
                    # Get unit payment statistics
                    unit_total_payments = Payment.objects.filter(
                        unit=unit,
                        status='completed'
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    # Use payment_date for accurate monthly tracking
                    # Include payments where payment_date is in current month OR payment_date is null but created_at is in current month
                    unit_current_month_payments = Payment.objects.filter(
                        unit=unit,
                        status='completed'
                    ).filter(
                        Q(payment_date__gte=current_month) | Q(payment_date__isnull=True, created_at__gte=current_month)
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    unit_pending_payments = Payment.objects.filter(
                        unit=unit,
                        status='pending'
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    unit_details.append({
                        'id': unit.id,
                        'unit_number': unit.unit_number,
                        'status': unit.status,
                        'rent_amount': float(unit.rent_amount),
                        'remaining_amount': float(unit.remaining_amount),
                        'tenant': tenant_info,
                        'total_payments': float(unit_total_payments),
                        'current_month_payments': float(unit_current_month_payments),
                        'pending_payments': float(unit_pending_payments),
                    })
                
                detailed_properties.append({
                    'id': property.id,
                    'name': property.name,
                    'address': property.address,
                    'city': property.city,
                    'state': property.state,
                    'pincode': property.pincode,
                    'property_type': property.property_type,
                    'description': property.description,
                    'total_units': property.total_units,
                    'occupied_units': property.occupied_units,
                    'vacant_units': property.total_units - property.occupied_units,
                    'maintenance_contacts': property.maintenance_contacts or {},
                    'total_payments': float(total_payments),
                    'current_month_payments': float(current_month_payments),
                    'pending_payments': float(pending_payments),
                    'units': unit_details,
                    'created_at': property.created_at,
                    'updated_at': property.updated_at,
                })
            
            return Response({
                'success': True,
                'data': detailed_properties
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def generate_tenant_key(self, request, pk=None):
        print("=== Generate Tenant Key Debug ===")
        print("Property ID:", pk)
        print("Request data:", request.data)
        print("Request method:", request.method)
        print("Request content type:", request.content_type)
        
        property_obj = self.get_object()
        unit_id = request.data.get('unit_id')
        
        print("Unit ID from request:", unit_id)
        
        if not unit_id:
            print("No unit_id found in request data")
            return Response({'error': 'Unit ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            unit = Unit.objects.get(id=unit_id, property=property_obj)
            print("Unit found:", unit)
            
            # CRITICAL VALIDATION: Check if owner has payment details configured
            owner = property_obj.owner
            if not owner.payment_method:
                return Response({
                    'success': False,
                    'error': 'Owner payment details not configured',
                    'message': 'Property owner must configure bank/UPI details before generating tenant keys. Please contact property owner.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate completeness based on payment method
            if owner.payment_method == 'bank':
                if not all([owner.bank_name, owner.ifsc_code, owner.account_number]):
                    return Response({
                        'success': False,
                        'error': 'Owner bank details incomplete',
                        'message': 'Property owner has incomplete bank details. Please contact property owner.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif owner.payment_method == 'upi':
                if not owner.upi_id:
                    return Response({
                        'success': False,
                        'error': 'Owner UPI ID not configured',
                        'message': 'Property owner must configure UPI ID. Please contact property owner.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if unit already has an active tenant
            active_tenant_key = TenantKey.objects.filter(unit=unit, is_used=True).first()
            if active_tenant_key:
                return Response({
                    'error': 'Unit already has an active tenant',
                    'message': f'Unit {unit.unit_number} is currently occupied by {active_tenant_key.tenant.user.email if active_tenant_key.tenant else "Unknown"}',
                    'tenant_key_exists': True,
                    'existing_key': active_tenant_key.key
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if there's already an unused key for this unit
            existing_key = TenantKey.objects.filter(unit=unit, is_used=False).first()
            if existing_key:
                # Key still valid, return existing one
                tenant_key = existing_key
            else:
                # No existing key, create new one
                tenant_key = TenantKey.objects.create(property=property_obj, unit=unit)
            
            print("Tenant key created/retrieved:", tenant_key)
            serializer = TenantKeySerializer(tenant_key)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Unit.DoesNotExist:
            print("Unit not found with ID:", unit_id, "for property:", property_obj)
            return Response({'error': 'Unit not found'}, status=status.HTTP_404_NOT_FOUND)


@method_decorator(csrf_exempt, name='dispatch')
class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        owner = Owner.objects.filter(user=self.request.user).first()
        if not owner:
            return Unit.objects.none()

        queryset = Unit.objects.filter(property__owner=owner)

        # Optional filter by property id from query params
        property_id = self.request.query_params.get('property')
        if property_id is not None:
            try:
                property_id_int = int(property_id)
            except (ValueError, TypeError):
                return Unit.objects.none()

            # Ensure the property exists and belongs to this owner
            has_property = Property.objects.filter(id=property_id_int, owner=owner).exists()
            if not has_property:
                return Unit.objects.none()

            queryset = queryset.filter(property_id=property_id_int)

        return queryset

    def perform_create(self, serializer):
        # The property should be passed in the request data
        # We'll validate that the property belongs to the current owner
        property_id = self.request.data.get('property')
        if not property_id:
            raise serializers.ValidationError({'property': 'This field is required.'})
        
        try:
            property_obj = Property.objects.get(id=property_id, owner__user=self.request.user)
            owner = property_obj.owner
            
            # Check if owner can add more units based on subscription plan
            try:
                owner.validate_unit_limit()
            except ValueError as e:
                # Get suggested upgrade plan for detailed error response
                suggested_plan = owner.suggested_plan_upgrade
                
                error_data = {
                    'error': 'Unit limit exceeded',
                    'message': str(e),
                    'current_units': owner.calculated_total_units,
                    'max_units_allowed': owner.max_units_allowed,
                    'subscription_plan': owner.subscription_plan_name,
                    'upgrade_required': True
                }
                
                if suggested_plan:
                    error_data.update({
                        'suggested_plan': {
                            'id': suggested_plan.id,
                            'name': suggested_plan.name,
                            'max_units': suggested_plan.max_units,
                            'monthly_price': float(suggested_plan.monthly_price),
                            'yearly_price': float(suggested_plan.yearly_price),
                            'features': suggested_plan.features
                        },
                        'upgrade_message': f'Upgrade to {suggested_plan.name} to add up to {suggested_plan.max_units} units.'
                    })
                else:
                    error_data.update({
                        'upgrade_message': 'Please contact support for a custom plan that supports your unit count.'
                    })
                
                raise serializers.ValidationError(error_data)
            
            serializer.save(property=property_obj)
        except Property.DoesNotExist:
            raise serializers.ValidationError({'property': 'Property not found or does not belong to you.'})

    @action(detail=True, methods=['post'])
    def remove_tenant(self, request, pk=None):
        """Remove tenant from unit and free up the unit"""
        try:
            unit = self.get_object()
            
            # Check if unit is occupied
            if unit.status != 'occupied':
                return Response({
                    'error': 'Unit is not occupied',
                    'message': f'Unit {unit.unit_number} is not currently occupied by any tenant'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get active tenant key
            active_tenant_key = TenantKey.objects.filter(unit=unit, is_used=True).first()
            if not active_tenant_key:
                return Response({
                    'error': 'No active tenant found',
                    'message': f'No active tenant key found for unit {unit.unit_number}'
                }, status=status.HTTP_404_NOT_FOUND)
            
            tenant = active_tenant_key.tenant
            tenant_name = f"{tenant.user.first_name} {tenant.user.last_name}".strip() or tenant.user.email
            
            # Remove tenant assignment
            active_tenant_key.tenant = None
            active_tenant_key.is_used = False
            active_tenant_key.used_at = None
            active_tenant_key.save()
            
            # Update unit status to available
            unit.status = 'available'
            unit.save()
            
            # Update property occupied unit count
            property_obj = unit.property
            property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
            property_obj.save()
            
            return Response({
                'success': True,
                'message': f'Tenant {tenant_name} has been removed from unit {unit.unit_number}',
                'unit_status': 'available',
                'tenant_removed': tenant_name
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to remove tenant',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def change_tenant(self, request, pk=None):
        """Change tenant for a unit (remove current tenant and allow new one)"""
        try:
            unit = self.get_object()
            
            # Check if unit is occupied
            if unit.status != 'occupied':
                return Response({
                    'error': 'Unit is not occupied',
                    'message': f'Unit {unit.unit_number} is not currently occupied'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get active tenant key
            active_tenant_key = TenantKey.objects.filter(unit=unit, is_used=True).first()
            if not active_tenant_key:
                return Response({
                    'error': 'No active tenant found',
                    'message': f'No active tenant key found for unit {unit.unit_number}'
                }, status=status.HTTP_404_NOT_FOUND)
            
            current_tenant = active_tenant_key.tenant
            current_tenant_name = f"{current_tenant.user.first_name} {current_tenant.user.last_name}".strip() or current_tenant.user.email
            
            # Remove current tenant assignment
            active_tenant_key.tenant = None
            active_tenant_key.is_used = False
            active_tenant_key.used_at = None
            active_tenant_key.save()
            
            # Update unit status to available
            unit.status = 'available'
            unit.save()
            
            # Update property occupied unit count
            property_obj = unit.property
            property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
            property_obj.save()
            
            return Response({
                'success': True,
                'message': f'Tenant {current_tenant_name} has been removed from unit {unit.unit_number}. Unit is now available for new tenant.',
                'unit_status': 'available',
                'previous_tenant': current_tenant_name,
                'next_step': 'Generate a new tenant key for the new tenant'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to change tenant',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tenant.objects.filter(user=self.request.user)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['post'], url_path='upload-profile-image')
    def upload_profile_image(self, request):
        """Upload tenant profile image"""
        try:
            tenant = self.get_queryset().first()
            if not tenant:
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

            if 'profile_image' not in request.FILES:
                return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Delete old image if exists
            if tenant.profile_image:
                tenant.profile_image.delete(save=False)

            # Save new image
            tenant.profile_image = request.FILES['profile_image']
            tenant.save()

            # Get absolute URL for the image using the same method as serializer
            image_url = None
            if tenant.profile_image:
                image_url = request.build_absolute_uri(tenant.profile_image.url)
            
            return Response({
                'success': True,
                'message': 'Profile image updated successfully',
                'profile_image': image_url
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error uploading tenant profile image: {str(e)}")
            return Response({'error': 'Failed to upload image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        print("=== DEFAULT CREATE METHOD CALLED ===")
        print("Request data:", request.data)
        print("Request method:", request.method)
        print("Request URL:", request.path)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='join-property', permission_classes=[AllowAny])
    def join_property(self, request):
        print("=== JOIN PROPERTY METHOD CALLED ===")
        print("=== Join Property Debug ===")
        print("Request data:", request.data)
        print("Request path:", request.path)
        print("Request method:", request.method)
        print("Request META:", dict(request.META))
        print("Request data type:", type(request.data))
        print("Request data keys:", list(request.data.keys()) if hasattr(request.data, 'keys') else 'No keys')
        print("Request user:", request.user)
        print("Request user authenticated:", request.user.is_authenticated)
        print("Request method:", request.method)
        print("Request content type:", request.content_type)
        
        # For tenant key joins, we don't require authentication initially
        # The user will be created/authenticated as part of the join process
        
        # Try to get key from different sources
        print("Trying to extract key from request...")
        print("request.data:", request.data)
        print("type(request.data):", type(request.data))
        print("Content-Type:", request.content_type)
        
        key = None
        
        # Method 1: Try request.data
        if hasattr(request.data, 'get'):
            key = request.data.get('key')
            print("Got key from request.data.get('key'):", key)
        
        # Method 2: Try request.POST
        if not key and hasattr(request, 'POST'):
            key = request.POST.get('key')
            print("Got key from request.POST.get('key'):", key)
        
        # Method 3: Try request.GET
        if not key and hasattr(request, 'GET'):
            key = request.GET.get('key')
            print("Got key from request.GET.get('key'):", key)
        
        
        print("Final extracted key:", key)
        print("Key type:", type(key) if key else None)
        print("Key is None:", key is None)
        print("Key is empty string:", key == '' if key is not None else 'N/A')
        
        # Clean the key
        if key:
            key = str(key).strip().upper()
            print("Cleaned key:", key)
            print("Cleaned key length:", len(key))
        
        if not key:
            print("No key provided in request - returning error")
            return Response({'error': 'Tenant key is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            print("Looking for tenant key:", key)
            print("Total tenant keys in DB:", TenantKey.objects.count())
            print("Available tenant keys:", TenantKey.objects.filter(is_used=False).count())
            
            # Check if key exists at all
            all_keys = TenantKey.objects.filter(key=key)
            print("Keys with this value:", all_keys.count())
            for tk in all_keys:
                print(f"  Key: {tk.key}, Used: {tk.is_used}")
            
            # First check if any key with this value exists
            if not all_keys.exists():
                print("No tenant key found with this value")
                return Response({'error': 'Invalid tenant key'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the tenant key
            try:
                tenant_key = TenantKey.objects.get(key=key, is_used=False)
                print("Tenant key found:", tenant_key)
                print("Current time:", timezone.now())
            except TenantKey.DoesNotExist:
                print("Tenant key not found or already used")
                return Response({'error': 'Tenant key not found or already used'}, status=status.HTTP_400_BAD_REQUEST)

            # Handle tenant creation/authentication
            tenant = None
            created = False
            
            if request.user.is_authenticated:
                # User is already authenticated, get or create tenant profile
                tenant, created = Tenant.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'phone': '',
                        'address': '',
                        'city': '',
                        'state': '',
                        'pincode': '',
                    }
                )
                print("Authenticated user - Tenant found/created:", tenant, "Created:", created)
            else:
                # User is not authenticated, create a temporary user and tenant
                # This is for the tenant key join flow
                print("Creating temporary user for tenant key join")
                
                # Generate a temporary username based on the tenant key
                temp_username = f"tenant_{key}_{int(timezone.now().timestamp())}"
                
                # Create a temporary user
                import secrets
                temp_password = secrets.token_urlsafe(12)
                temp_user = User.objects.create_user(
                    username=temp_username,
                    email=f"{temp_username}@temp.zelton.com",
                    password=temp_password,
                    first_name="Tenant",
                    last_name="User"
                )
                
                # Create tenant profile
                tenant = Tenant.objects.create(
                    user=temp_user,
                    phone='',
                    address='',
                    city='',
                    state='',
                    pincode='',
                )
                created = True
                print("Temporary user and tenant created:", tenant)
            
            # Check if tenant is already assigned to a property
            existing_assignment = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if existing_assignment:
                print("Tenant already assigned to property:", existing_assignment.property.name)
                return Response({'error': 'You are already assigned to a property'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Assign tenant to the property
            try:
                tenant_key.tenant = tenant
                tenant_key.is_used = True
                tenant_key.used_at = timezone.now()
                tenant_key.save()
                print("Tenant assigned to property")
            except Exception as e:
                print("Error assigning tenant to property:", str(e))
                raise

            # Update unit status to occupied
            try:
                unit = tenant_key.unit
                unit.status = 'occupied'
                unit.save()
                print("Unit status updated to occupied")
            except Exception as e:
                print("Error updating unit status:", str(e))
                raise

            # Update property occupied unit count
            try:
                property_obj = tenant_key.property
                property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
                property_obj.save()
                print("Property occupied unit count updated:", property_obj.occupied_units)
            except Exception as e:
                print("Error updating property occupied unit count:", str(e))
                raise

            # Update owner property counts
            try:
                owner = property_obj.owner
                owner.total_properties = Property.objects.filter(owner=owner).count()
                owner.save()
                print("Owner property counts updated")
            except Exception as e:
                print("Error updating owner property counts:", str(e))
                raise

            # Generate authentication token for the tenant
            from rest_framework.authtoken.models import Token
            token, token_created = Token.objects.get_or_create(user=tenant.user)
            
            # Return comprehensive property data for dashboard
            property_data = {
                'property': {
                    'id': property_obj.id,
                    'name': property_obj.name,
                    'address': property_obj.address,
                    'city': property_obj.city,
                    'state': property_obj.state,
                    'pincode': property_obj.pincode,
                    'total_units': property_obj.total_units,
                    'occupied_units': property_obj.occupied_units,
                },
                'unit': {
                    'id': unit.id,
                    'unit_number': unit.unit_number,
                    'unit_type': unit.unit_type,
                    'rent_amount': float(unit.rent_amount),
                    'rent_due_date': unit.rent_due_date,
                    'status': unit.status,
                },
                'tenant_key': {
                    'key': tenant_key.key,
                    'is_used': tenant_key.is_used,
                    'used_at': tenant_key.used_at,
                },
                'user': {
                    'id': tenant.user.id,
                    'username': tenant.user.username,
                    'email': tenant.user.email,
                    'first_name': tenant.user.first_name,
                    'last_name': tenant.user.last_name,
                },
                'tenant': {
                    'id': tenant.id,
                    'phone': tenant.phone,
                    'address': tenant.address,
                    'city': tenant.city,
                    'state': tenant.state,
                    'pincode': tenant.pincode,
                }
            }

            print("Successfully joined property")
            return Response({
                'success': True,
                'message': 'Successfully joined property',
                'data': property_data,
                'token': token.key,
                'user_created': created
            }, status=status.HTTP_200_OK)
            
        except TenantKey.DoesNotExist:
            print("Tenant key not found or already used")
            return Response({'error': 'Invalid or expired tenant key'}, status=status.HTTP_400_BAD_REQUEST)
        except Tenant.DoesNotExist:
            print("Tenant profile not found for user:", request.user)
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print("Unexpected error in join_property:", str(e))
            print("Error type:", type(e).__name__)
            import traceback
            print("Traceback:", traceback.format_exc())
            return Response({'error': f'An unexpected error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        tenant = self.get_queryset().first()
        if not tenant:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get current property and unit
        tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
        if not tenant_key:
            return Response({'error': 'No property assigned'}, status=status.HTTP_404_NOT_FOUND)

        current_property = tenant_key.property
        current_unit = tenant_key.unit

        # Calculate next due date
        today = timezone.now().date()
        next_month = today.replace(day=current_unit.rent_due_date)
        if next_month <= today:
            next_month = (next_month + timedelta(days=32)).replace(day=current_unit.rent_due_date)

        # Get recent payments
        recent_payments = Payment.objects.filter(tenant=tenant).order_by('-created_at')[:5]

        # Update and get remaining amount from unit
        remaining_amount = current_unit.update_remaining_amount(tenant)
        
        # Calculate current month payment status
        current_month = timezone.now().replace(day=1)
        current_month_payments = Payment.objects.filter(
            tenant=tenant,
            status='completed',
            created_at__gte=current_month
        )
        
        total_paid_this_month = sum(payment.amount for payment in current_month_payments)
        monthly_rent = current_unit.rent_amount
        
        # Determine payment status based on accumulated remaining amount
        if remaining_amount == 0:
            payment_status = 'paid'
            payment_status_text = 'Rent Paid'
            payment_status_color = 'green'
        elif remaining_amount < monthly_rent:
            payment_status = 'partial'
            payment_status_text = 'Partial Payment'
            payment_status_color = 'orange'
        else:
            payment_status = 'overdue'
            payment_status_text = 'Overdue'
            payment_status_color = 'red'

        # Get property owner info
        owner = current_property.owner

        dashboard_data = {
            'current_property': {
                'id': current_property.id,
                'name': current_property.name,
                'address': current_property.address,
                'city': current_property.city,
                'state': current_property.state,
                'pincode': current_property.pincode,
                'total_units': current_property.total_units,
                'occupied_units': current_property.occupied_units,
                'maintenance_contacts': current_property.maintenance_contacts or {},
            },
            'current_unit': UnitSerializer(current_unit).data,
            'owner': {
                'id': owner.id,
                'name': f"{owner.user.first_name} {owner.user.last_name}",
                'phone': owner.phone,
                'email': owner.user.email,
            },
            'monthly_rent': float(current_unit.rent_amount),
            'next_due_date': next_month,
            'payment_status': payment_status,
            'payment_status_text': payment_status_text,
            'payment_status_color': payment_status_color,
            'current_month_paid': remaining_amount == 0,
            'recent_payments': PaymentSerializer(recent_payments, many=True).data,
            'pending_amount': float(remaining_amount),
            'joined_at': tenant_key.used_at,
        }

        return Response(dashboard_data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get tenant profile information"""
        tenant = self.get_queryset().first()
        if not tenant:
            return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TenantSerializer(tenant)
        return Response({
            'success': True,
            'data': serializer.data
        })

    @action(detail=False, methods=['post'])
    def upload_document(self, request):
        """Upload a new document for the tenant"""
        try:
            tenant = self.get_queryset().first()
            if not tenant:
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

            # Get current unit
            tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if not tenant_key:
                return Response({'error': 'No property assigned'}, status=status.HTTP_404_NOT_FOUND)

            current_unit = tenant_key.unit

            # Validate required fields
            document_type = request.data.get('document_type')
            if not document_type:
                return Response({'error': 'Document type is required'}, status=status.HTTP_400_BAD_REQUEST)

            if 'document_file' not in request.FILES:
                return Response({'error': 'Document file is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if document of this type already exists and replace it
            existing_document = TenantDocument.objects.filter(
                tenant=tenant, 
                document_type=document_type
            ).first()

            if existing_document:
                # Delete the existing document file from storage
                if existing_document.document_file:
                    existing_document.document_file.delete(save=False)
                # Delete the existing document record
                existing_document.delete()

            # Create new document
            document_file = request.FILES['document_file']
            document = TenantDocument.objects.create(
                tenant=tenant,
                unit=current_unit,
                document_type=document_type,
                document_file=document_file,
                file_name=document_file.name,
                file_size=document_file.size,
                is_required=document_type in ['aadhaar', 'rental_agreement']  # Mark required documents
            )

            serializer = TenantDocumentSerializer(document, context={'request': request})
            return Response({
                'success': True,
                'message': 'Document uploaded successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def documents(self, request):
        """Get all documents for the current tenant"""
        try:
            tenant = self.get_queryset().first()
            if not tenant:
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

            documents = TenantDocument.objects.filter(tenant=tenant)
            serializer = TenantDocumentSerializer(documents, many=True, context={'request': request})
            
            return Response({
                'success': True,
                'data': serializer.data
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='documents/(?P<document_id>[^/.]+)/download')
    def download_document(self, request, document_id=None):
        """Download a specific document"""
        try:
            # Get the current tenant
            tenant = self.get_queryset().first()
            if not tenant:
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

            print(f"Looking for document ID: {document_id}")
            print(f"Tenant: {tenant}")
            
            # Get the document for this tenant
            document = TenantDocument.objects.filter(
                id=document_id, 
                tenant=tenant
            ).first()

            print(f"Document found: {document}")

            if not document:
                return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

            if not document.document_file:
                return Response({'error': 'Document file not found'}, status=status.HTTP_404_NOT_FOUND)

            # Return file URL for download
            # Use the correct domain instead of request.build_absolute_uri()
            from django.conf import settings
            base_url = getattr(settings, 'BASE_URL', 'https://api.zelton.in')
            document_url = f"{base_url}{document.document_file.url}"
            
            # Debug logging
            print(f"Document file URL: {document.document_file.url}")
            print(f"Constructed URL: {document_url}")
            print(f"File exists: {document.document_file.storage.exists(document.document_file.name)}")
            
            # Get file name and size, with fallbacks
            file_name = document.file_name or document.document_file.name.split('/')[-1] if document.document_file else 'unknown'
            file_size = document.file_size or (document.document_file.size if document.document_file else 0)
            
            return Response({
                'success': True,
                'download_url': document_url,
                'file_name': file_name,
                'file_size': file_size,
                'debug_info': {
                    'relative_url': document.document_file.url,
                    'absolute_url': document_url,
                    'file_exists': document.document_file.storage.exists(document.document_file.name),
                    'model_file_name': document.file_name,
                    'model_file_size': document.file_size,
                    'actual_file_name': document.document_file.name if document.document_file else None,
                    'actual_file_size': document.document_file.size if document.document_file else None
                }
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'], url_path='documents/(?P<document_id>[^/.]+)')
    def delete_document(self, request, document_id=None):
        """Delete a specific document"""
        try:
            tenant = self.get_queryset().first()
            if not tenant:
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)

            document = TenantDocument.objects.filter(
                id=document_id, 
                tenant=tenant
            ).first()

            if not document:
                return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

            # Delete the file from storage
            if document.document_file:
                document.document_file.delete(save=False)

            # Delete the document record
            document.delete()

            return Response({
                'success': True,
                'message': 'Document deleted successfully'
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @method_decorator(csrf_exempt, name='dispatch')
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update tenant profile information"""
        print("=== Update Tenant Profile Debug ===")
        print("Request data:", request.data)
        print("Request user:", request.user)
        
        try:
            tenant = self.get_queryset().first()
            if not tenant:
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Update tenant fields
            for field in ['phone', 'address', 'city', 'state', 'pincode']:
                if field in request.data:
                    setattr(tenant, field, request.data[field])
            
            tenant.save()
            print("Tenant profile updated successfully")
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': {
                    'id': tenant.id,
                    'phone': tenant.phone,
                    'address': tenant.address,
                    'city': tenant.city,
                    'state': tenant.state,
                    'pincode': tenant.pincode,
                }
            })
            
        except Exception as e:
            print("Error updating tenant profile:", str(e))
            return Response({'error': 'Failed to update profile'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='join_property')
    def join_property_old(self, request):
        """Legacy endpoint with underscore for backward compatibility"""
        print("=== JOIN PROPERTY OLD METHOD CALLED ===")
        return self.join_property(request)

    @action(detail=False, methods=['post'], url_path='test-join-simple')
    def test_join_simple(self, request):
        """Simple test endpoint that accepts any data"""
        print("=== TEST JOIN SIMPLE CALLED ===")
        print("Request data:", request.data)
        print("Request method:", request.method)
        print("Request content type:", request.content_type)
        
        # Try to get key from any source
        key = None
        if hasattr(request.data, 'get'):
            key = request.data.get('key')
        
        print("Extracted key:", key)
        
        if key:
            return Response({
                'success': True,
                'message': 'Key received successfully',
                'key': key,
                'data': request.data
            })
        else:
            return Response({
                'success': False,
                'message': 'No key found',
                'data': request.data,
                'body': 'Empty'
            })

    @method_decorator(csrf_exempt, name='dispatch')
    @action(detail=False, methods=['post'])
    def test_join(self, request):
        """Test endpoint to verify backend is working"""
        print("=== TEST JOIN ENDPOINT CALLED ===")
        print("Request data:", request.data)
        print("Request user:", request.user)
        print("Request user authenticated:", request.user.is_authenticated)
        
        # Test tenant key lookup
        from core.models import TenantKey
        all_keys = TenantKey.objects.all()
        print("All tenant keys in DB:", [tk.key for tk in all_keys])
        
        return Response({
            'success': True,
            'message': 'Test endpoint working',
            'data': request.data,
            'user_authenticated': request.user.is_authenticated,
            'available_keys': [tk.key for tk in all_keys]
        })


@method_decorator(csrf_exempt, name='dispatch')
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter payments based on user role
        if hasattr(self.request.user, 'owner_profile'):
            owner = self.request.user.owner_profile
            return Payment.objects.filter(unit__property__owner=owner)
        elif hasattr(self.request.user, 'tenant_profile'):
            tenant = self.request.user.tenant_profile
            return Payment.objects.filter(tenant=tenant)
        return Payment.objects.none()

    @action(detail=False, methods=['post'])
    def initiate_rent_payment(self, request):
        """Initiate rent payment for tenant using PhonePe"""
        try:
            # Get tenant profile
            if not hasattr(request.user, 'tenant_profile'):
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            tenant = request.user.tenant_profile
            
            # Get tenant's current unit
            tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if not tenant_key:
                return Response({'error': 'No active property found for tenant'}, status=status.HTTP_404_NOT_FOUND)
            
            unit = tenant_key.unit
            amount = request.data.get('amount')
            payment_type = request.data.get('payment_type', 'rent')
            
            if amount in (None, ''):
                return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert amount to Decimal for validation
            try:
                base_amount = Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate amount is positive
            if base_amount <= 0:
                return Response({'error': 'Amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update and get remaining amount from unit
            remaining_amount = unit.update_remaining_amount(tenant)
            
            # Validate amount doesn't exceed remaining amount
            if base_amount > remaining_amount:
                return Response({
                    'error': f'Payment amount cannot exceed remaining amount of ₹{remaining_amount:.2f}',
                    'remaining_amount': float(remaining_amount)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate payment gateway charge
            charge_rate_percent = Decimal('2.00') if base_amount <= Decimal('10000') else Decimal('2.50')
            payment_charge = (base_amount * charge_rate_percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_amount = (base_amount + payment_charge).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Calculate due date (next month's rent due date)
            today = timezone.now().date()
            next_month = today.replace(day=unit.rent_due_date)
            if next_month <= today:
                # If due date has passed this month, set for next month
                if next_month.month == 12:
                    next_month = next_month.replace(year=next_month.year + 1, month=1)
                else:
                    next_month = next_month.replace(month=next_month.month + 1)
            
            # Create payment record
            payment = Payment.objects.create(
                tenant=tenant,
                unit=unit,
                amount=base_amount,
                payment_gateway_charge=payment_charge,
                payment_type=payment_type,
                status='pending',
                due_date=next_month
            )
            
            # Initiate PhonePe payment
            phonepe_response = PhonePeService.initiate_tenant_rent_payment(
                tenant,
                unit,
                base_amount,
                payment_charge=payment_charge,
                charge_rate_percent=charge_rate_percent
            )
            
            if not phonepe_response['success']:
                payment.status = 'failed'
                payment.save()
                return Response({
                    'success': False,
                    'error': phonepe_response['error'],
                    'error_code': phonepe_response.get('error_code', 'UNKNOWN')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update payment with merchant order ID
            payment.merchant_order_id = phonepe_response['merchant_order_id']
            payment.phonepe_order_id = phonepe_response['order_id']
            payment.save()
            
            # Create transaction record
            transaction = PaymentTransaction.objects.create(
                merchant_order_id=phonepe_response['merchant_order_id'],
                phonepe_transaction_id=phonepe_response['merchant_order_id'],
                phonepe_order_id=phonepe_response['order_id'],
                amount=total_amount,
                user=request.user,
                payment=payment,
                status='initiated',
                reconciliation_status='not_started'
            )
            
            return Response({
                'success': True,
                'message': 'Payment initiated successfully',
                'merchant_order_id': phonepe_response['merchant_order_id'],
                'order_id': phonepe_response['order_id'],
                'redirect_url': phonepe_response['redirect_url'],
                'expire_at': phonepe_response['expire_at'],
                'state': phonepe_response['state'],
                'payment_id': payment.id,
                'payment_breakup': {
                    'base_amount': float(base_amount),
                    'payment_charge': float(payment_charge),
                    'charge_rate_percent': float(charge_rate_percent),
                    'total_payable': float(total_amount)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='verify-payment/(?P<merchant_order_id>[^/.]+)')
    def verify_payment(self, request, merchant_order_id=None):
        """Verify payment status using PhonePe SDK"""
        try:
            # Verify payment status with PhonePe
            phonepe_response = PhonePeService.verify_payment_status(merchant_order_id)
            
            if not phonepe_response['success']:
                return Response({
                    'success': False,
                    'error': phonepe_response['error'],
                    'error_code': phonepe_response.get('error_code', 'UNKNOWN')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find payment record
            payment = Payment.objects.filter(merchant_order_id=merchant_order_id).first()
            if not payment:
                return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Update payment status based on PhonePe response
            state = phonepe_response['state']
            if state == 'COMPLETED':
                PhonePeService.handle_payment_completed(merchant_order_id)
                payment.refresh_from_db()
                
                # Generate invoice (check if already exists)
                try:
                    invoice, created = Invoice.objects.get_or_create(
                        payment=payment,
                        defaults={
                            'tenant': payment.tenant,
                            'unit': payment.unit,
                            'amount': payment.amount,
                            'rent_amount': payment.unit.rent_amount,
                            'due_date': payment.due_date,
                            'status': 'paid'
                        }
                    )
                    
                    return Response({
                        'success': True,
                        'message': 'Payment verified successfully',
                        'state': state,
                        'payment': PaymentSerializer(payment).data,
                        'invoice': InvoiceSerializer(invoice).data
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    print(f"Error in payment verification for {merchant_order_id}: {str(e)}")
                    # Return success for payment but note invoice creation issue
                    return Response({
                        'success': True,
                        'message': 'Payment verified successfully, but invoice creation failed',
                        'state': state,
                        'payment': PaymentSerializer(payment).data,
                        'invoice_error': str(e)
                    }, status=status.HTTP_200_OK)
            
            elif state == 'FAILED':
                PhonePeService.handle_payment_failed(merchant_order_id)
                payment.refresh_from_db()
                
                return Response({
                    'success': False,
                    'message': 'Payment failed',
                    'state': state,
                    'payment': PaymentSerializer(payment).data
                }, status=status.HTTP_400_BAD_REQUEST)
            
            elif state == 'PENDING':
                return Response({
                    'success': True,
                    'message': 'Payment is still pending',
                    'state': state,
                    'payment': PaymentSerializer(payment).data
                }, status=status.HTTP_200_OK)
            
            else:
                return Response({
                    'success': False,
                    'error': f'Unknown payment state: {state}',
                    'state': state
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in payment verification for {merchant_order_id}: {str(e)}")
            
            # Provide more specific error messages based on error type
            error_message = str(e)
            if 'Rate limit exceeded' in error_message or 'RATE_LIMIT_EXCEEDED' in error_message:
                return Response({
                    'error': 'Payment verification is temporarily unavailable due to high traffic. Please try again in a few minutes.',
                    'error_code': 'RATE_LIMIT_EXCEEDED'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            elif 'timeout' in error_message.lower() or 'TIMEOUT_ERROR' in error_message:
                return Response({
                    'error': 'Payment verification timed out. Please try again.',
                    'error_code': 'TIMEOUT_ERROR'
                }, status=status.HTTP_408_REQUEST_TIMEOUT)
            else:
                return Response({
                    'error': 'Unable to verify payment status. Please contact support if this issue persists.',
                    'error_code': 'VERIFICATION_ERROR'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def handle_payment_callback(self, request):
        """Handle payment callback from PhonePe redirect"""
        try:
            order_id = request.data.get('orderId') or request.GET.get('orderId')
            payment_status = request.data.get('status') or request.GET.get('status')
            
            if not order_id:
                return Response({'error': 'Order ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Find payment by PhonePe order ID
            payment = Payment.objects.filter(phonepe_order_id=order_id).first()
            if not payment:
                return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Verify payment status with PhonePe
            phonepe_response = PhonePeService.verify_payment_status(payment.merchant_order_id)
            
            if not phonepe_response['success']:
                return Response({
                    'success': False,
                    'error': phonepe_response['error']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            state = phonepe_response['state']
            
            if state == 'COMPLETED':
                PhonePeService.handle_payment_completed(payment.merchant_order_id)
                payment.refresh_from_db()
                
                return Response({
                    'success': True,
                    'message': 'Payment completed successfully',
                    'state': state,
                    'payment': PaymentSerializer(payment).data,
                    # Removed redirect_url to prevent app restart - app should poll for status instead
                }, status=status.HTTP_200_OK)
            
            elif state == 'FAILED':
                PhonePeService.handle_payment_failed(payment.merchant_order_id)
                payment.refresh_from_db()
                
                return Response({
                    'success': False,
                    'message': 'Payment failed',
                    'state': state,
                    'payment': PaymentSerializer(payment).data,
                    # Removed redirect_url to prevent app restart - app should poll for status instead
                }, status=status.HTTP_400_BAD_REQUEST)
            
            else:
                return Response({
                    'success': True,
                    'message': 'Payment is still processing',
                    'state': state,
                    'payment': PaymentSerializer(payment).data,
                    # Removed redirect_url to prevent app restart - app should poll for status instead
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Initiate refund for a payment"""
        try:
            payment = self.get_object()
            amount = request.data.get('amount')  # Optional, defaults to full refund
            
            if payment.status != 'completed':
                return Response({
                    'error': 'Only completed payments can be refunded'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not payment.merchant_order_id:
                return Response({
                    'error': 'Payment does not have a merchant order ID'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Initiate refund with PhonePe
            refund_response = PhonePeService.initiate_refund(payment.merchant_order_id, amount)
            
            if not refund_response['success']:
                return Response({
                    'success': False,
                    'error': refund_response['error'],
                    'error_code': refund_response.get('error_code', 'UNKNOWN')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'message': 'Refund initiated successfully',
                'merchant_refund_id': refund_response['merchant_refund_id'],
                'refund_id': refund_response['refund_id'],
                'state': refund_response['state'],
                'amount': refund_response['amount']
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_rent_payment(self, request):
        """Create a new rent payment for tenant"""
        try:
            # Get tenant profile
            if not hasattr(request.user, 'tenant_profile'):
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            tenant = request.user.tenant_profile
            
            # Get tenant's current unit
            tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if not tenant_key:
                return Response({'error': 'No active property found for tenant'}, status=status.HTTP_404_NOT_FOUND)
            
            unit = tenant_key.unit
            amount = request.data.get('amount')
            payment_type = request.data.get('payment_type', 'rent')
            
            if not amount:
                return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate due date (next month's rent due date)
            from datetime import datetime, timedelta
            today = timezone.now().date()
            next_month = today.replace(day=unit.rent_due_date)
            if next_month <= today:
                # If due date has passed this month, set for next month
                if next_month.month == 12:
                    next_month = next_month.replace(year=next_month.year + 1, month=1)
                else:
                    next_month = next_month.replace(month=next_month.month + 1)
            
            # Create payment record
            payment = Payment.objects.create(
                tenant=tenant,
                unit=unit,
                amount=amount,
                payment_type=payment_type,
                status='pending',
                due_date=next_month
            )
            
            # Create transaction record
            transaction_id = f"TXN_{payment.id}_{int(timezone.now().timestamp())}"
            transaction = PaymentTransaction.objects.create(
                phonepe_transaction_id=transaction_id,
                phonepe_order_id=transaction_id,
                amount=amount,
                user=request.user,
                payment=payment,
                status='initiated'
            )
            
            return Response({
                'success': True,
                'message': 'Payment created successfully',
                'payment': PaymentSerializer(payment).data,
                'transaction_id': transaction_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def process_tenant_payment(self, request):
        """Process tenant payment immediately"""
        try:
            # Get tenant profile
            if not hasattr(request.user, 'tenant_profile'):
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            tenant = request.user.tenant_profile
            
            # Get tenant's current unit
            tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if not tenant_key:
                return Response({'error': 'No active property found for tenant'}, status=status.HTTP_404_NOT_FOUND)
            
            unit = tenant_key.unit
            amount = request.data.get('amount')
            payment_type = request.data.get('payment_type', 'rent')
            
            if not amount:
                return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if current month rent is fully paid
            current_month = timezone.now().replace(day=1)
            current_month_payments = Payment.objects.filter(
                tenant=tenant,
                status='completed',
                created_at__gte=current_month
            )
            
            # Calculate total amount paid this month
            total_paid_this_month = sum(payment.amount for payment in current_month_payments)
            monthly_rent = unit.rent_amount
            
            print(f"=== PAYMENT DEBUG ===")
            print(f"Tenant: {tenant.user.email}")
            print(f"Unit: {unit.unit_number}")
            print(f"Monthly rent: {monthly_rent}")
            print(f"Current month: {current_month}")
            print(f"Payments this month: {current_month_payments.count()}")
            print(f"Total paid this month: {total_paid_this_month}")
            print(f"Payment amount: {amount}")
            print(f"Will total exceed monthly rent? {total_paid_this_month + amount > monthly_rent}")
            
            # Only prevent payment if monthly rent is fully paid
            if total_paid_this_month >= monthly_rent:
                print(f"Payment blocked: Monthly rent already fully paid")
                return Response({
                    'success': False,
                    'error': 'Monthly rent has already been fully paid',
                    'message': f'Total paid this month: ₹{total_paid_this_month}, Monthly rent: ₹{monthly_rent}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"Payment allowed: Proceeding with payment")
            
            # Create payment record with completed status
            payment = Payment.objects.create(
                tenant=tenant,
                unit=unit,
                amount=amount,
                payment_type=payment_type,
                status='completed',
                payment_date=timezone.now(),
                due_date=timezone.now().date()
            )
            
            # Create transaction record
            transaction_id = f"TXN_{payment.id}_{int(timezone.now().timestamp())}"
            transaction = PaymentTransaction.objects.create(
                phonepe_transaction_id=transaction_id,
                phonepe_order_id=transaction_id,
                amount=amount,
                user=request.user,
                payment=payment,
                status='success'
            )
            
            return Response({
                'success': True,
                'message': 'Payment processed successfully',
                'payment': PaymentSerializer(payment).data,
                'transaction_id': transaction_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def check_payment_status(self, request):
        """Check current payment status for tenant"""
        try:
            # Get tenant profile
            if not hasattr(request.user, 'tenant_profile'):
                return Response({'error': 'Tenant profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            tenant = request.user.tenant_profile
            
            # Get tenant's current unit
            tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
            if not tenant_key:
                return Response({'error': 'No active property found for tenant'}, status=status.HTTP_404_NOT_FOUND)
            
            unit = tenant_key.unit
            
            # Update and get remaining amount from unit
            remaining_amount = unit.update_remaining_amount(tenant)
            
            # Check current month payments
            current_month = timezone.now().replace(day=1)
            current_month_payments = Payment.objects.filter(
                tenant=tenant,
                status='completed',
                created_at__gte=current_month
            )
            
            total_paid_this_month = sum(payment.amount for payment in current_month_payments)
            monthly_rent = unit.rent_amount
            
            return Response({
                'success': True,
                'data': {
                    'monthly_rent': float(monthly_rent),
                    'total_paid_this_month': float(total_paid_this_month),
                    'remaining_amount': float(remaining_amount),
                    'is_fully_paid': remaining_amount == 0,
                    'payments_count': current_month_payments.count(),
                    'current_month': current_month.isoformat(),
                    'payments': [
                        {
                            'id': p.id,
                            'amount': float(p.amount),
                            'date': p.created_at.isoformat(),
                            'status': p.status
                        } for p in current_month_payments
                    ]
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def complete_payment(self, request, pk=None):
        """Complete a payment (simulate successful payment)"""
        payment = self.get_object()
        
        try:
            # Update payment status
            payment.status = 'completed'
            payment.payment_date = timezone.now()
            payment.save()
            
            # Update transaction status
            transaction = PaymentTransaction.objects.filter(payment=payment).first()
            if transaction:
                transaction.status = 'success'
                transaction.save()
            
            # Generate invoice
            invoice = Invoice.objects.create(
                tenant=payment.tenant,
                unit=payment.unit,
                amount=payment.amount,
                rent_amount=payment.unit.rent_amount,
                due_date=payment.due_date,
                status='paid',
                payment=payment
            )
            
            return Response({
                'success': True,
                'message': 'Payment completed successfully',
                'payment': PaymentSerializer(payment).data,
                'invoice': InvoiceSerializer(invoice).data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get comprehensive analytics data"""
        period = request.query_params.get('period', '6months')
        
        # Calculate date range based on period
        end_date = timezone.now()
        if period == '3months':
            start_date = end_date - timedelta(days=90)
        elif period == '6months':
            start_date = end_date - timedelta(days=180)
        elif period == '1year':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=180)

        # Get user's properties
        if hasattr(request.user, 'owner_profile'):
            owner = request.user.owner_profile
            properties = Property.objects.filter(owner=owner)
        else:
            return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Calculate monthly revenue
        monthly_revenue = self._get_monthly_revenue(properties, start_date, end_date)
        
        # Calculate monthly tenants
        monthly_tenants = self._get_monthly_tenants(properties, start_date, end_date)
        
        # Calculate payment status distribution
        payment_status_dist = self._get_payment_status_distribution(properties)
        
        # Calculate occupancy rate
        total_units = Unit.objects.filter(property__in=properties).count()
        occupied_units = Unit.objects.filter(property__in=properties, status='occupied').count()
        occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0
        
        # Calculate average rent
        avg_rent = Unit.objects.filter(property__in=properties).aggregate(
            avg_rent=Avg('rent_amount')
        )['avg_rent'] or 0
        
        # Calculate total revenue
        total_revenue = Payment.objects.filter(
            unit__property__in=properties,
            status='completed',
            payment_date__gte=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Calculate pending and overdue amounts
        pending_amount = Payment.objects.filter(
            unit__property__in=properties,
            status='pending',
            due_date__gte=timezone.now().date()
        ).aggregate(total=Sum('amount'))['total'] or 0

        overdue_amount = Payment.objects.filter(
            unit__property__in=properties,
            status='pending',
            due_date__lt=timezone.now().date()
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Calculate payment success rate
        total_payments = Payment.objects.filter(
            unit__property__in=properties,
            created_at__gte=start_date
        ).count()
        completed_payments = Payment.objects.filter(
            unit__property__in=properties,
            status='completed',
            created_at__gte=start_date
        ).count()
        payment_success_rate = (completed_payments / total_payments * 100) if total_payments > 0 else 0
        
        # Calculate total tenants
        total_tenants = Tenant.objects.filter(
            tenant_keys__property__in=properties,
            created_at__gte=start_date
        ).distinct().count()
        
        # Get recent activity
        recent_activity = self._get_recent_activity(properties)

        analytics_data = {
            'monthlyRevenue': monthly_revenue,
            'monthlyTenants': monthly_tenants,
            'paymentStatusDistribution': payment_status_dist,
            'occupancyRate': round(occupancy_rate, 1),
            'averageRent': float(avg_rent),
            'totalRevenue': float(total_revenue),
            'totalTenants': total_tenants,
            'recentActivity': recent_activity,
            'pendingAmount': float(pending_amount),
            'overdueAmount': float(overdue_amount),
            'paymentSuccessRate': round(payment_success_rate, 1),
        }

        return Response(analytics_data)

    def _get_monthly_revenue(self, properties, start_date, end_date):
        """Get monthly revenue data"""
        monthly_data = []
        current = start_date.replace(day=1)
        
        while current <= end_date:
            month_start = current
            month_end = (current + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            revenue = Payment.objects.filter(
                unit__property__in=properties,
                status='completed',
                payment_date__gte=month_start,
                payment_date__lte=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_data.append({
                'month': current.strftime('%b %Y'),
                'value': float(revenue)
            })
            
            current = (current + timedelta(days=32)).replace(day=1)
        
        return monthly_data

    def _get_monthly_tenants(self, properties, start_date, end_date):
        """Get monthly tenant data"""
        monthly_data = []
        current = start_date.replace(day=1)
        
        while current <= end_date:
            month_start = current
            month_end = (current + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            tenants = Tenant.objects.filter(
                tenant_keys__property__in=properties,
                created_at__gte=month_start,
                created_at__lte=month_end
            ).distinct().count()
            
            monthly_data.append({
                'month': current.strftime('%b %Y'),
                'value': tenants
            })
            
            current = (current + timedelta(days=32)).replace(day=1)
        
        return monthly_data

    def _get_payment_status_distribution(self, properties):
        """Get payment status distribution"""
        status_counts = {}
        payments = Payment.objects.filter(unit__property__in=properties)
        
        for status, _ in Payment.PAYMENT_STATUS:
            count = payments.filter(status=status).count()
            status_counts[status] = count
        
        return status_counts

    def _get_recent_activity(self, properties):
        """Get recent activity data"""
        activities = []
        
        # Recent payments (only completed payments)
        recent_payments = Payment.objects.filter(
            unit__property__in=properties,
            status='completed'
        ).order_by('-created_at')[:5]
        
        for payment in recent_payments:
            activities.append({
                'title': f'Payment from {payment.tenant.user.get_full_name()}',
                'subtitle': f'Unit {payment.unit.unit_number} - ₹{payment.amount}',
                'time': self._get_time_ago(payment.created_at),
                'icon': 'card',
                'color': 'success' if payment.status == 'completed' else 'warning'
            })
        
        # Recent tenants
        recent_tenants = Tenant.objects.filter(
            tenant_keys__property__in=properties
        ).order_by('-created_at')[:3]
        
        for tenant in recent_tenants:
            activities.append({
                'title': f'New tenant: {tenant.user.get_full_name()}',
                'subtitle': f'Joined {tenant.tenant_keys.first().property.name}',
                'time': self._get_time_ago(tenant.created_at),
                'icon': 'person-add',
                'color': 'primary'
            })
        
        return sorted(activities, key=lambda x: x['time'], reverse=True)[:8]

    def _get_time_ago(self, date):
        """Get human readable time ago"""
        now = timezone.now()
        diff = now - date
        
        if diff.days > 0:
            return f'{diff.days}d ago'
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f'{hours}h ago'
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f'{minutes}m ago'
        else:
            return 'Just now'


@method_decorator(csrf_exempt, name='dispatch')
class OwnerSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = OwnerPayment.objects.filter(payment_type__in=['subscription', 'upgrade', 'renewal'])
    serializer_class = OwnerPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        owner = Owner.objects.filter(user=self.request.user).first()
        if owner:
            return OwnerPayment.objects.filter(owner=owner, payment_type__in=['subscription', 'upgrade', 'renewal'])
        return OwnerPayment.objects.none()

    @action(detail=False, methods=['post'])
    def initiate_upgrade(self, request):
        """Initiate subscription upgrade payment"""
        try:
            # Get owner profile
            if not hasattr(request.user, 'owner_profile'):
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            owner = request.user.owner_profile
            pricing_plan_id = request.data.get('pricing_plan_id')
            period = request.data.get('period', 'monthly')
            
            if not pricing_plan_id:
                return Response({'error': 'Pricing plan ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                pricing_plan = PricingPlan.objects.get(id=pricing_plan_id, is_active=True)
            except PricingPlan.DoesNotExist:
                return Response({'error': 'Pricing plan not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Validate that this is actually an upgrade
            if owner.subscription_plan and pricing_plan.max_units <= owner.subscription_plan.max_units:
                return Response({
                    'error': 'Invalid upgrade',
                    'message': 'Selected plan does not provide more units than current plan'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if current unit count fits in the new plan
            if owner.calculated_total_units > pricing_plan.max_units:
                return Response({
                    'error': 'Plan insufficient',
                    'message': f'Your current unit count ({owner.calculated_total_units}) exceeds the maximum units allowed by this plan ({pricing_plan.max_units})'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate amount based on period and include 18% GST
            if period == 'yearly':
                base_amount = pricing_plan.yearly_price
            else:
                base_amount = pricing_plan.monthly_price

            base_decimal = Decimal(str(base_amount))
            gst_amount = (base_decimal * Decimal('0.18')).quantize(Decimal('0.01'))
            total_amount = (base_decimal + gst_amount).quantize(Decimal('0.01'))
            
            # Calculate due date
            today = timezone.now().date()
            if period == 'yearly':
                due_date = today + timedelta(days=365)
            else:
                due_date = today + timedelta(days=30)
            
            # Create subscription payment record using new OwnerPayment model
            subscription_payment = create_owner_payment_record(
                owner=owner,
                pricing_plan=pricing_plan,
                amount=total_amount,
                payment_type='upgrade',
                status='pending',
                due_date=due_date,
                description=f"Plan upgrade to {pricing_plan.name} ({period})"
            )
            
            # Initiate PhonePe payment
            phonepe_response = PhonePeService.initiate_owner_subscription_payment(owner, pricing_plan, period)
            
            if not phonepe_response['success']:
                subscription_payment.status = 'failed'
                subscription_payment.save()
                return Response({
                    'success': False,
                    'error': phonepe_response['error'],
                    'error_code': phonepe_response.get('error_code', 'UNKNOWN')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update subscription payment with PhonePe details
            subscription_payment.merchant_order_id = phonepe_response['merchant_order_id']
            subscription_payment.phonepe_order_id = phonepe_response['order_id']
            subscription_payment.save()
            
            return Response({
                'success': True,
                'message': 'Subscription upgrade payment initiated successfully',
                'merchant_order_id': phonepe_response['merchant_order_id'],
                'order_id': phonepe_response['order_id'],
                'redirect_url': phonepe_response['redirect_url'],  # Required to open PhonePe payment page
                'expire_at': phonepe_response['expire_at'],
                'state': phonepe_response['state'],
                'subscription_payment_id': subscription_payment.id,
                'upgrade_details': {
                    'from_plan': owner.subscription_plan_name,
                    'to_plan': pricing_plan.name,
                    'new_max_units': pricing_plan.max_units,
                    'current_units': owner.calculated_total_units
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def initiate_payment(self, request):
        """Initiate subscription payment for owner"""
        try:
            # Get owner profile
            if not hasattr(request.user, 'owner_profile'):
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            owner = request.user.owner_profile
            pricing_plan_id = request.data.get('pricing_plan_id')
            period = request.data.get('period', 'monthly')
            
            if not pricing_plan_id:
                return Response({'error': 'Pricing plan ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                pricing_plan = PricingPlan.objects.get(id=pricing_plan_id, is_active=True)
            except PricingPlan.DoesNotExist:
                return Response({'error': 'Pricing plan not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # ENHANCED DOWNGRADE PREVENTION
            if owner.subscription_plan and pricing_plan.max_units < owner.subscription_plan.max_units:
                return Response({
                    'error': 'Downgrade not allowed',
                    'message': 'You cannot downgrade to a plan with fewer units. Please contact our sales team at sales@zelton.in for assistance.',
                    'contact_email': 'sales@zelton.in',
                    'current_plan': {
                        'name': owner.subscription_plan.name,
                        'max_units': owner.subscription_plan.max_units
                    },
                    'requested_plan': {
                        'name': pricing_plan.name,
                        'max_units': pricing_plan.max_units
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if current unit count fits in the new plan
            if owner.calculated_total_units > pricing_plan.max_units:
                return Response({
                    'error': 'Plan insufficient',
                    'message': f'Your current unit count ({owner.calculated_total_units}) exceeds the maximum units allowed by this plan ({pricing_plan.max_units})',
                    'current_units': owner.calculated_total_units,
                    'plan_max_units': pricing_plan.max_units
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate amount based on period and include 18% GST
            if period == 'yearly':
                base_amount = pricing_plan.yearly_price
            else:
                base_amount = pricing_plan.monthly_price

            base_decimal = Decimal(str(base_amount))
            gst_amount = (base_decimal * Decimal('0.18')).quantize(Decimal('0.01'))
            total_amount = (base_decimal + gst_amount).quantize(Decimal('0.01'))
            
            # Calculate due date (next month)
            today = timezone.now().date()
            if period == 'yearly':
                due_date = today + timedelta(days=365)
            else:
                due_date = today + timedelta(days=30)
            
            # Create subscription payment record using new OwnerPayment model
            subscription_payment = create_owner_payment_record(
                owner=owner,
                pricing_plan=pricing_plan,
                amount=total_amount,
                payment_type='subscription',
                status='pending',
                due_date=due_date,
                description=f"New subscription to {pricing_plan.name} ({period})"
            )
            
            # Initiate PhonePe payment
            phonepe_response = PhonePeService.initiate_owner_subscription_payment(owner, pricing_plan, period)
            
            if not phonepe_response['success']:
                subscription_payment.status = 'failed'
                subscription_payment.save()
                return Response({
                    'success': False,
                    'error': phonepe_response['error'],
                    'error_code': phonepe_response.get('error_code', 'UNKNOWN')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update subscription payment with PhonePe details
            subscription_payment.merchant_order_id = phonepe_response['merchant_order_id']
            subscription_payment.phonepe_order_id = phonepe_response['order_id']
            subscription_payment.save()
            
            return Response({
                'success': True,
                'message': 'Subscription payment initiated successfully',
                'merchant_order_id': phonepe_response['merchant_order_id'],
                'order_id': phonepe_response['order_id'],
                'redirect_url': phonepe_response['redirect_url'],  # Required to open PhonePe payment page
                'expire_at': phonepe_response['expire_at'],
                'state': phonepe_response['state'],
                'subscription_payment_id': subscription_payment.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='verify-payment/(?P<merchant_order_id>[^/.]+)')
    def verify_payment(self, request, merchant_order_id=None):
        """Verify subscription payment status"""
        try:
            # Verify payment status with PhonePe
            phonepe_response = PhonePeService.verify_payment_status(merchant_order_id)
            
            if not phonepe_response['success']:
                return Response({
                    'success': False,
                    'error': phonepe_response['error'],
                    'error_code': phonepe_response.get('error_code', 'UNKNOWN')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find subscription payment record
            owner_payment = OwnerPayment.objects.filter(merchant_order_id=merchant_order_id).first()
            
            if not owner_payment:
                return Response({'error': 'Subscription payment not found'}, status=status.HTTP_404_NOT_FOUND)
            
            payment_record = owner_payment
            
            # Update payment status based on PhonePe response
            state = phonepe_response['state']
            if state == 'COMPLETED':
                PhonePeService.handle_payment_completed(merchant_order_id)
                payment_record.refresh_from_db()
                
                # Return appropriate serializer data
                payment_data = OwnerPaymentSerializer(payment_record).data
                
                return Response({
                    'success': True,
                    'message': 'Subscription payment verified successfully',
                    'state': state,
                    'subscription_payment': payment_data
                }, status=status.HTTP_200_OK)
            
            elif state == 'FAILED':
                PhonePeService.handle_payment_failed(merchant_order_id)
                payment_record.refresh_from_db()
                
                # Return appropriate serializer data
                payment_data = OwnerPaymentSerializer(payment_record).data
                
                return Response({
                    'success': False,
                    'message': 'Subscription payment failed',
                    'state': state,
                    'subscription_payment': payment_data
                }, status=status.HTTP_400_BAD_REQUEST)
            
            elif state == 'PENDING':
                # Return appropriate serializer data
                payment_data = OwnerPaymentSerializer(payment_record).data
                
                return Response({
                    'success': True,
                    'message': 'Subscription payment is still pending',
                    'state': state,
                    'subscription_payment': payment_data
                }, status=status.HTTP_200_OK)
            
            else:
                return Response({
                    'success': False,
                    'error': f'Unknown payment state: {state}',
                    'state': state
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def payment_callback(self, request):
        """Handle subscription payment callback from PhonePe redirect"""
        try:
            order_id = request.data.get('orderId') or request.GET.get('orderId')
            
            if not order_id:
                return Response({'error': 'Order ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Find subscription payment by PhonePe order ID
            owner_payment = OwnerPayment.objects.filter(phonepe_order_id=order_id).first()
            
            if not owner_payment:
                return Response({'error': 'Subscription payment not found'}, status=status.HTTP_404_NOT_FOUND)
            
            payment_record = owner_payment
            
            # Verify payment status with PhonePe
            phonepe_response = PhonePeService.verify_payment_status(payment_record.merchant_order_id)
            
            if not phonepe_response['success']:
                return Response({
                    'success': False,
                    'error': phonepe_response['error']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            state = phonepe_response['state']
            
            if state == 'COMPLETED':
                PhonePeService.handle_payment_completed(payment_record.merchant_order_id)
                payment_record.refresh_from_db()
                
                # Return appropriate serializer data
                payment_data = OwnerPaymentSerializer(payment_record).data
                
                return Response({
                    'success': True,
                    'message': 'Subscription payment completed successfully',
                    'state': state,
                    'subscription_payment': payment_data,
                    # Removed redirect_url to prevent app restart - app should poll for status instead
                }, status=status.HTTP_200_OK)
            
            elif state == 'FAILED':
                PhonePeService.handle_payment_failed(payment_record.merchant_order_id)
                payment_record.refresh_from_db()
                
                # Return appropriate serializer data
                payment_data = OwnerPaymentSerializer(payment_record).data
                
                return Response({
                    'success': False,
                    'message': 'Subscription payment failed',
                    'state': state,
                    'subscription_payment': payment_data,
                    # Removed redirect_url to prevent app restart - app should poll for status instead
                }, status=status.HTTP_400_BAD_REQUEST)
            
            else:
                return Response({
                    'success': True,
                    'message': 'Subscription payment is still processing',
                    'state': state,
                    'subscription_payment': OwnerPaymentSerializer(owner_payment).data,
                    # Removed redirect_url to prevent app restart - app should poll for status instead
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def check_limits(self, request):
        """Check current subscription limits and suggest upgrades if needed"""
        try:
            owner = Owner.objects.filter(user=request.user).first()
            if not owner:
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get current subscription details
            current_units = owner.calculated_total_units
            max_units = owner.max_units_allowed
            can_add_unit = owner.can_add_unit
            is_within_limits = owner.is_within_plan_limits
            suggested_plan = owner.suggested_plan_upgrade
            
            response_data = {
                'current_units': current_units,
                'max_units_allowed': max_units,
                'can_add_unit': can_add_unit,
                'is_within_limits': is_within_limits,
                'subscription_plan': {
                    'id': owner.subscription_plan.id if owner.subscription_plan else None,
                    'name': owner.subscription_plan_name,
                    'status': owner.subscription_status
                } if owner.subscription_plan else None,
                'upgrade_required': not can_add_unit,
                'suggested_plan': None
            }
            
            if suggested_plan:
                response_data['suggested_plan'] = {
                    'id': suggested_plan.id,
                    'name': suggested_plan.name,
                    'min_units': suggested_plan.min_units,
                    'max_units': suggested_plan.max_units,
                    'monthly_price': float(suggested_plan.monthly_price),
                    'yearly_price': float(suggested_plan.yearly_price),
                    'features': suggested_plan.features
                }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def available_plans(self, request):
        """Get all available pricing plans for upgrade"""
        try:
            owner = Owner.objects.filter(user=request.user).first()
            if not owner:
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            current_units = owner.calculated_total_units
            current_plan = owner.subscription_plan
            
            # Get all active plans that can accommodate current unit count
            available_plans = PricingPlan.objects.filter(
                is_active=True,
                max_units__gte=current_units
            ).exclude(
                id=current_plan.id if current_plan else None
            ).order_by('max_units')
            
            plans_data = []
            for plan in available_plans:
                plans_data.append({
                    'id': plan.id,
                    'name': plan.name,
                    'min_units': plan.min_units,
                    'max_units': plan.max_units,
                    'monthly_price': float(plan.monthly_price),
                    'yearly_price': float(plan.yearly_price),
                    'features': plan.features,
                    'is_recommended': plan.max_units >= current_units and (
                        not current_plan or plan.max_units > current_plan.max_units
                    )
                })
            
            return Response({
                'current_plan': {
                    'id': current_plan.id if current_plan else None,
                    'name': owner.subscription_plan_name,
                    'max_units': current_plan.max_units if current_plan else 0
                },
                'current_units': current_units,
                'available_plans': plans_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active subscription details"""
        try:
            owner = Owner.objects.filter(user=request.user).first()
            if not owner:
                return Response({'error': 'Owner profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get active subscription payment
            active_payment = OwnerPayment.objects.filter(
                owner=owner,
                status='completed',
                payment_type__in=['subscription', 'upgrade', 'renewal']
            ).order_by('-created_at').first()
            
            if not active_payment:
                return Response({
                    'has_active_subscription': False,
                    'message': 'No active subscription found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if subscription is still valid
            now = timezone.now()
            is_active = (
                active_payment.subscription_start_date <= now <= active_payment.subscription_end_date
            )
            
            response_data = {
                'has_active_subscription': is_active,
                'subscription_payment': OwnerPaymentSerializer(active_payment).data,
                'owner_limits': {
                    'current_units': owner.calculated_total_units,
                    'max_units_allowed': owner.max_units_allowed,
                    'can_add_unit': owner.can_add_unit,
                    'is_within_limits': owner.is_within_plan_limits
                }
            }
            
            if not is_active:
                response_data['message'] = 'Subscription has expired'
                response_data['expired_at'] = active_payment.subscription_end_date
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def audit_limits(self, request):
        """Admin endpoint to audit unit limits across all owners"""
        # Only allow superusers to access this endpoint
        if not request.user.is_superuser:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        from .utils import audit_unit_limits
        audit_results = audit_unit_limits()
        
        return Response(audit_results, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class OwnerPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing owner payments with comprehensive tracking.
    Handles both new and legacy payments gracefully.
    """
    queryset = OwnerPayment.objects.all()
    serializer_class = OwnerPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter payments by owner and other parameters"""
        owner_id = self.request.query_params.get('owner_id')
        include_legacy = self.request.query_params.get('include_legacy', 'true').lower() == 'true'
        
        if owner_id:
            try:
                owner = Owner.objects.get(id=owner_id)
                queryset = get_owner_payment_history(owner, include_legacy=include_legacy)
                return queryset
            except Owner.DoesNotExist:
                return OwnerPayment.objects.none()
        
        # If no owner_id specified, return payments for current user
        owner = Owner.objects.filter(user=self.request.user).first()
        if owner:
            return get_owner_payment_history(owner, include_legacy=include_legacy)
        
        return OwnerPayment.objects.none()
    
    @action(detail=False, methods=['get'])
    def payment_history(self, request):
        """Get comprehensive payment history for an owner"""
        owner_id = request.query_params.get('owner_id')
        if not owner_id:
            # Use current user's owner profile
            owner = Owner.objects.filter(user=request.user).first()
            if not owner:
                return Response({
                    'success': False,
                    'error': 'Owner profile not found'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                owner = Owner.objects.get(id=owner_id)
            except Owner.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Owner not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            include_legacy = request.query_params.get('include_legacy', 'true').lower() == 'true'
            payments = get_owner_payment_history(owner, include_legacy=include_legacy)
            
            # Calculate summary statistics
            from django.db.models import Sum, Count, Q
            summary = payments.aggregate(
                total_payments=Count('id'),
                total_amount=Sum('amount'),
                completed_payments=Count('id', filter=Q(status='completed')),
                completed_amount=Sum('amount', filter=Q(status='completed'))
            )
            
            return Response({
                'success': True,
                'payments': OwnerPaymentSerializer(payments, many=True).data,
                'summary': summary
            })
            
        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get payment history'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def create_legacy_payment(self, request):
        """Create a legacy payment record for old payments"""
        try:
            owner_id = request.data.get('owner_id')
            amount = request.data.get('amount')
            description = request.data.get('description', 'Legacy payment')
            
            if not owner_id or not amount:
                return Response({
                    'success': False,
                    'error': 'owner_id and amount are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            owner = Owner.objects.get(id=owner_id)
            
            # Create legacy payment
            legacy_payment = handle_legacy_payment(
                owner=owner,
                amount=amount,
                description=description,
                payment_date=request.data.get('payment_date'),
                pricing_plan_id=request.data.get('pricing_plan_id')
            )
            
            if legacy_payment:
                return Response({
                    'success': True,
                    'payment': OwnerPaymentSerializer(legacy_payment).data,
                    'message': 'Legacy payment created successfully'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to create legacy payment'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Owner.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Owner not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating legacy payment: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to create legacy payment'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PhonePeWebhookViewSet(viewsets.ViewSet):
    """PhonePe Webhook Handler"""
    permission_classes = [AllowAny]  # PhonePe needs to access this endpoint
    
    @action(detail=False, methods=['post'], url_path='phonepe-webhook')
    def webhook(self, request):
        """Handle PhonePe S2S webhook callbacks"""
        try:
            # Get webhook data
            callback_body = request.body.decode('utf-8')
            authorization_header = request.META.get('HTTP_AUTHORIZATION', '')
            
            # Validate webhook signature
            validation_response = PhonePeService.validate_webhook_signature(
                username=settings.PHONEPE_WEBHOOK_USERNAME,
                password=settings.PHONEPE_WEBHOOK_PASSWORD,
                callback_header=authorization_header,
                callback_body=callback_body
            )
            
            if not validation_response['success']:
                logger.warning(f"Invalid webhook signature: {validation_response['error']}")
                return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Process webhook callback
            process_response = PhonePeService.process_webhook_callback(validation_response)
            
            if not process_response['success']:
                logger.error(f"Error processing webhook: {process_response['error']}")
                return Response({'error': process_response['error']}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Webhook processed successfully: {process_response}")
            return Response({'success': True, 'message': 'Webhook processed successfully'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Unexpected error in webhook processing: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PricingPlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PricingPlan.objects.filter(is_active=True)
    serializer_class = PricingPlanSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def get_plan_for_properties(self, request):
        property_count = request.query_params.get('count', 0)
        try:
            property_count = int(property_count)
            plan = PricingPlan.get_plan_for_property_count(property_count)
            if plan:
                serializer = PricingPlanSerializer(plan)
                return Response(serializer.data)
            else:
                return Response({'error': 'No plan available for this property count'}, 
                              status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': 'Invalid property count'}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class OwnerPayoutViewSet(viewsets.ModelViewSet):
    """Admin dashboard for monitoring and managing payouts"""
    queryset = OwnerPayout.objects.all()
    serializer_class = OwnerPayoutSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin can see all
        if user.is_staff or user.is_superuser:
            return OwnerPayout.objects.all().select_related('owner__user', 'payment__unit__property')
        
        # Owner can only see their own
        try:
            owner = Owner.objects.get(user=user)
            return OwnerPayout.objects.filter(owner=owner)
        except Owner.DoesNotExist:
            return OwnerPayout.objects.none()
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get payout statistics for admin dashboard"""
        from django.db.models import Sum, Count
        
        stats = {
            'total_payouts': OwnerPayout.objects.count(),
            'completed': OwnerPayout.objects.filter(status='completed').count(),
            'processing': OwnerPayout.objects.filter(status__in=['pending', 'processing']).count(),
            'failed': OwnerPayout.objects.filter(status='failed').count(),
            'retry_scheduled': OwnerPayout.objects.filter(status='retry_scheduled').count(),
            'total_amount': OwnerPayout.objects.filter(status='completed').aggregate(
                total=Sum('amount'))['total'] or 0,
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def manual_retry(self, request, pk=None):
        """Manually retry a failed payout"""
        from core.services.cashfree_payout_service import CashfreePayoutService
        
        result = CashfreePayoutService.retry_failed_payout(pk)
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Payout retry initiated'
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def check_status(self, request, pk=None):
        """Check current status with Cashfree"""
        from core.services.cashfree_payout_service import CashfreePayoutService
        
        result = CashfreePayoutService.check_payout_status(pk)
        
        if result['success']:
            payout = self.get_object()
            return Response({
                'success': True,
                'status': payout.status,
                'message': f'Status updated to {payout.status}'
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'owner_profile'):
            owner = self.request.user.owner_profile
            return Invoice.objects.filter(unit__property__owner=owner)
        elif hasattr(self.request.user, 'tenant_profile'):
            tenant = self.request.user.tenant_profile
            return Invoice.objects.filter(tenant=tenant)
        return Invoice.objects.none()


@method_decorator(csrf_exempt, name='dispatch')
class TenantDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for owners to view tenant documents"""
    queryset = TenantDocument.objects.all()
    serializer_class = TenantDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only owners can access this viewset
        if hasattr(self.request.user, 'owner_profile'):
            owner = self.request.user.owner_profile
            return TenantDocument.objects.filter(unit__property__owner=owner)
        return TenantDocument.objects.none()

    @action(detail=False, methods=['get'], url_path='by_unit/(?P<unit_id>[^/.]+)')
    def by_unit(self, request, unit_id=None):
        """Get documents for a specific unit's tenant"""
        try:
            # Verify the unit belongs to the owner
            if hasattr(request.user, 'owner_profile'):
                owner = request.user.owner_profile
                unit = Unit.objects.filter(id=unit_id, property__owner=owner).first()
                
                if not unit:
                    return Response({'error': 'Unit not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

                # Get tenant for this unit
                tenant_key = TenantKey.objects.filter(unit=unit, is_used=True).first()
                if not tenant_key or not tenant_key.tenant:
                    return Response({'error': 'No tenant assigned to this unit'}, status=status.HTTP_404_NOT_FOUND)

                # Get documents for this tenant
                documents = TenantDocument.objects.filter(tenant=tenant_key.tenant)
                serializer = TenantDocumentSerializer(documents, many=True, context={'request': request})
                
                return Response({
                    'success': True,
                    'data': {
                        'unit': {
                            'id': unit.id,
                            'unit_number': unit.unit_number,
                            'property_name': unit.property.name
                        },
                        'tenant': {
                            'id': tenant_key.tenant.id,
                            'name': tenant_key.tenant.user.get_full_name(),
                            'email': tenant_key.tenant.user.email
                        },
                        'documents': serializer.data
                    }
                })

            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path=r'download/(?P<document_id>\d+)')
    def download_document(self, request, document_id=None):
        """Download a specific tenant document (owner access)"""
        try:
            if hasattr(request.user, 'owner_profile'):
                owner = request.user.owner_profile
                
                print(f"Owner download - Looking for document ID: {document_id}")
                print(f"Owner: {owner}")
                
                # Verify the document belongs to a unit owned by this owner
                document = TenantDocument.objects.filter(
                    id=document_id,
                    unit__property__owner=owner
                ).first()

                print(f"Owner download - Document found: {document}")

                if not document:
                    return Response({'error': 'Document not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

                if not document.document_file:
                    return Response({'error': 'Document file not found'}, status=status.HTTP_404_NOT_FOUND)

                # Return file URL for download
                # Use the correct domain instead of request.build_absolute_uri()
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'https://api.zelton.in')
                document_url = f"{base_url}{document.document_file.url}"
                
                # Debug logging
                print(f"Owner download - Document file URL: {document.document_file.url}")
                print(f"Owner download - Constructed URL: {document_url}")
                print(f"Owner download - File exists: {document.document_file.storage.exists(document.document_file.name)}")
                
                # Get file name and size, with fallbacks
                file_name = document.file_name or document.document_file.name.split('/')[-1] if document.document_file else 'unknown'
                file_size = document.file_size or (document.document_file.size if document.document_file else 0)
                
                return Response({
                    'success': True,
                    'download_url': document_url,
                    'file_name': file_name,
                    'file_size': file_size,
                    'tenant_name': document.tenant.user.get_full_name(),
                    'unit_number': document.unit.unit_number,
                    'debug_info': {
                        'relative_url': document.document_file.url,
                        'absolute_url': document_url,
                        'file_exists': document.document_file.storage.exists(document.document_file.name),
                        'model_file_name': document.file_name,
                        'model_file_size': document.file_size,
                        'actual_file_name': document.document_file.name if document.document_file else None,
                        'actual_file_size': document.document_file.size if document.document_file else None
                    }
                })

            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        except Exception as e:
            print(f"Owner download error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class ManualPaymentProofViewSet(viewsets.ModelViewSet):
    '''
    ViewSet for managing manual payment proof uploads and verifications
    '''
    queryset = ManualPaymentProof.objects.all()
    serializer_class = ManualPaymentProofSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        '''Filter queryset based on user role'''
        user = self.request.user
        
        if hasattr(user, 'tenant_profile'):
            # Tenant can only see their own payment proofs
            return ManualPaymentProof.objects.filter(tenant=user.tenant_profile)
        elif hasattr(user, 'owner_profile'):
            # Owner can see payment proofs for their units
            return ManualPaymentProof.objects.filter(unit__property__owner=user.owner_profile)
        else:
            return ManualPaymentProof.objects.none()

    def get_serializer_class(self):
        '''Return appropriate serializer based on action'''
        if self.action == 'create':
            return ManualPaymentProofCreateSerializer
        elif self.action == 'verify':
            return ManualPaymentProofVerificationSerializer
        return ManualPaymentProofSerializer

    def get_serializer_context(self):
        '''Add request to serializer context'''
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        '''Create a new manual payment proof (tenant upload)'''
        try:
            print(f"Payment proof upload request data: {request.data}")
            print(f"Payment proof upload files: {request.FILES}")
            print(f"User: {request.user}")
            print(f"Request method: {request.method}")
            print(f"Content type: {request.content_type}")
            
            # Ensure user is a tenant
            if not hasattr(request.user, 'tenant_profile'):
                return Response(
                    {'error': 'Only tenants can upload payment proofs'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            tenant = request.user.tenant_profile
            print(f"Tenant: {tenant}")
            
            # Validate that the unit belongs to the tenant
            unit_id = request.data.get('unit')
            print(f"Unit ID from request: {unit_id}")
            
            tenant_key = TenantKey.objects.filter(tenant=tenant, unit_id=unit_id, is_used=True).first()
            print(f"Tenant key found: {tenant_key}")
            
            if not tenant_key:
                return Response(
                    {'error': 'You are not assigned to this unit'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate required fields (same pattern as tenant document upload)
            unit_id = request.data.get('unit')
            amount = request.data.get('amount')
            description = request.data.get('description', '')
            
            if not unit_id:
                return Response({'error': 'Unit is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not amount:
                return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if 'payment_proof_image' not in request.FILES:
                return Response({'error': 'Payment proof image is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Get the unit
            unit = tenant_key.unit
            
            # Create payment proof directly (same pattern as tenant document upload)
            payment_proof_image = request.FILES['payment_proof_image']
            payment_proof = ManualPaymentProof.objects.create(
                tenant=tenant,
                unit=unit,
                amount=amount,
                payment_proof_image=payment_proof_image,
                description=description,
                verification_status='pending'
            )
            print(f"Payment proof created: {payment_proof}")
            
            return Response({
                'success': True,
                'message': 'Payment proof uploaded successfully',
                'payment_proof': ManualPaymentProofSerializer(payment_proof, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Payment proof upload error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        '''Verify a payment proof (owner action)'''
        try:
            # Ensure user is an owner
            if not hasattr(request.user, 'owner_profile'):
                return Response(
                    {'error': 'Only owners can verify payment proofs'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            owner = request.user.owner_profile
            payment_proof = self.get_object()

            # Ensure the payment proof belongs to the owner's unit
            if payment_proof.unit.property.owner != owner:
                return Response(
                    {'error': 'You can only verify payment proofs for your own units'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            # Ensure payment proof is pending
            if payment_proof.verification_status != 'pending':
                return Response(
                    {'error': 'Payment proof has already been processed'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(payment_proof, data=request.data, partial=True)
            if serializer.is_valid():
                verification_status = serializer.validated_data.get('verification_status')
                verification_notes = serializer.validated_data.get('verification_notes', '')

                if verification_status == 'verified':
                    payment_proof.verify_payment(request.user, verification_notes)
                    message = 'Payment proof verified successfully. Payment record created.'
                elif verification_status == 'rejected':
                    payment_proof.reject_payment(request.user, verification_notes)
                    message = 'Payment proof rejected.'
                else:
                    return Response(
                        {'error': 'Invalid verification status'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

                return Response({
                    'success': True,
                    'message': message,
                    'payment_proof': ManualPaymentProofSerializer(payment_proof, context={'request': request}).data
                }, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        '''Get all pending payment proofs for the owner'''
        try:
            if not hasattr(request.user, 'owner_profile'):
                return Response(
                    {'error': 'Only owners can view pending payment proofs'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            owner = request.user.owner_profile
            pending_proofs = ManualPaymentProof.objects.filter(
                unit__property__owner=owner,
                verification_status='pending'
            ).order_by('-uploaded_at')

            serializer = self.get_serializer(pending_proofs, many=True)
            return Response({
                'success': True,
                'pending_payment_proofs': serializer.data,
                'count': pending_proofs.count()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def my_proofs(self, request):
        '''Get all payment proofs uploaded by the tenant'''
        try:
            if not hasattr(request.user, 'tenant_profile'):
                return Response(
                    {'error': 'Only tenants can view their payment proofs'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            tenant = request.user.tenant_profile
            tenant_proofs = ManualPaymentProof.objects.filter(
                tenant=tenant
            ).order_by('-uploaded_at')

            serializer = self.get_serializer(tenant_proofs, many=True)
            return Response({
                'success': True,
                'my_payment_proofs': serializer.data,
                'count': tenant_proofs.count()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
