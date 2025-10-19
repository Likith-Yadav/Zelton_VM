from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import datetime, timedelta
import requests
import json
import uuid
import base64
import hashlib
import hmac

from .models import (
    Owner, Property, Unit, Tenant, TenantKey, Payment, Invoice,
    PaymentProof, PricingPlan, PaymentTransaction, PropertyImage, UnitImage
)
from .serializers import (
    OwnerSerializer, PropertySerializer, UnitSerializer, TenantSerializer,
    TenantKeySerializer, PaymentSerializer, InvoiceSerializer, PaymentProofSerializer,
    PricingPlanSerializer, PaymentTransactionSerializer, OwnerDashboardSerializer,
    TenantDashboardSerializer, UserSerializer
)


@method_decorator(csrf_exempt, name='dispatch')
class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        data = request.data
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check if user already exists
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'error': 'User with this email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        try:
            user = User.objects.create_user(
                username=data['email'],
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name']
            )
            
            # Create profile based on role
            if data['role'] == 'owner':
                owner = Owner.objects.create(
                    user=user,
                    phone=data.get('phone', ''),
                    address=data.get('address', ''),
                    city=data.get('city', ''),
                    state=data.get('state', ''),
                    pincode=data.get('pincode', ''),
                    pan_number=data.get('pan_number') or None,
                    aadhar_number=data.get('aadhar_number') or None,
                    subscription_plan='basic',
                    subscription_status='inactive'
                )
                serializer = OwnerSerializer(owner)
            elif data['role'] == 'tenant':
                # Create tenant with minimal required fields, allow completion later
                tenant = Tenant.objects.create(
                    user=user,
                    phone=data.get('phone', ''),
                    address=data.get('address', ''),
                    city=data.get('city', ''),
                    state=data.get('state', ''),
                    pincode=data.get('pincode', ''),
                    emergency_contact=data.get('emergency_contact', ''),
                    emergency_contact_name=data.get('emergency_contact_name', '')
                )
                serializer = TenantSerializer(tenant)
            else:
                return Response(
                    {'error': 'Invalid role'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create token for the new user
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'message': 'Registration successful',
                'user': UserSerializer(user).data,
                'profile': serializer.data,
                'role': data['role'],
                'token': token.key
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user exists first
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No account found with this email address'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        user = authenticate(username=email, password=password)
        if user:
            login(request, user)
            
            # Get or create token for the user
            token, created = Token.objects.get_or_create(user=user)
            
            # Get user profile
            try:
                if hasattr(user, 'owner_profile'):
                    profile_serializer = OwnerSerializer(user.owner_profile)
                    role = 'owner'
                    profile = user.owner_profile
                    
                    # Check subscription status for owners
                    if profile.subscription_status != 'active':
                        return Response({
                            'success': False,
                            'error': 'Please complete your subscription payment to access the dashboard',
                            'subscription_required': True,
                            'user': UserSerializer(user).data,
                            'profile': profile_serializer.data,
                            'role': role,
                            'token': token.key
                        }, status=status.HTTP_402_PAYMENT_REQUIRED)
                        
                elif hasattr(user, 'tenant_profile'):
                    profile_serializer = TenantSerializer(user.tenant_profile)
                    role = 'tenant'
                    
                    # Check if tenant has a property assigned
                    from .models import TenantKey
                    tenant_key = TenantKey.objects.filter(tenant=user.tenant_profile, is_used=True).first()
                    if not tenant_key:
                        return Response({
                            'success': False,
                            'error': 'No property assigned. Please enter your tenant key to join a property.',
                            'property_required': True,
                            'user': UserSerializer(user).data,
                            'profile': profile_serializer.data,
                            'role': role,
                            'token': token.key
                        }, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {'error': 'User profile not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )

                return Response({
                    'success': True,
                    'message': 'Login successful',
                    'user': UserSerializer(user).data,
                    'profile': profile_serializer.data,
                    'role': role,
                    'token': token.key
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {'error': 'Invalid password'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        logout(request)
        return Response({
            'success': True,
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def complete_profile(self, request):
        data = request.data
        
        # Get user ID from request
        user_id = data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'User ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update profile based on role
        try:
            if hasattr(user, 'owner_profile'):
                owner = user.owner_profile
                owner.phone = data.get('phone', owner.phone)
                owner.address = data.get('address', owner.address)
                owner.city = data.get('city', owner.city)
                owner.state = data.get('state', owner.state)
                owner.pincode = data.get('pincode', owner.pincode)
                owner.pan_number = data.get('pan_number') or owner.pan_number
                owner.aadhar_number = data.get('aadhar_number') or owner.aadhar_number
                
                # Payment method fields
                owner.payment_method = data.get('payment_method') or owner.payment_method
                owner.bank_name = data.get('bank_name') or owner.bank_name
                owner.ifsc_code = data.get('ifsc_code') or owner.ifsc_code
                owner.account_number = data.get('account_number') or owner.account_number
                owner.upi_id = data.get('upi_id') or owner.upi_id
                
                owner.save()
                
                return Response({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'profile': OwnerSerializer(owner).data
                }, status=status.HTTP_200_OK)
            elif hasattr(user, 'tenant_profile'):
                tenant = user.tenant_profile
                tenant.phone = data.get('phone', tenant.phone)
                tenant.address = data.get('address', tenant.address)
                tenant.city = data.get('city', tenant.city)
                tenant.state = data.get('state', tenant.state)
                tenant.pincode = data.get('pincode', tenant.pincode)
                tenant.pan_number = data.get('pan_number') or tenant.pan_number
                tenant.aadhar_number = data.get('aadhar_number') or tenant.aadhar_number
                tenant.save()
                
                return Response({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'profile': TenantSerializer(tenant).data
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'User profile not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def complete_subscription(self, request):
        """Complete subscription payment and activate user account"""
        data = request.data
        
        # Get user ID from request
        user_id = data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'User ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update owner profile with subscription details
        try:
            if hasattr(user, 'owner_profile'):
                owner = user.owner_profile
                owner.subscription_plan = data.get('subscription_plan', 'basic')
                owner.subscription_status = 'active'
                owner.subscription_start_date = timezone.now()
                
                # Calculate end date based on billing cycle
                billing_cycle = data.get('billing_cycle', 'monthly')
                if billing_cycle == 'yearly':
                    owner.subscription_end_date = timezone.now() + timezone.timedelta(days=365)
                else:
                    owner.subscription_end_date = timezone.now() + timezone.timedelta(days=30)
                
                owner.save()
                
                return Response({
                    'success': True,
                    'message': 'Subscription activated successfully',
                    'profile': OwnerSerializer(owner).data
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Owner profile not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def send_otp(self, request):
        """Send OTP email for email verification"""
        data = request.data
        to_email = data.get('to_email')
        to_name = data.get('to_name')
        verification_code = data.get('verification_code')
        
        if not to_email or not to_name or not verification_code:
            return Response(
                {'error': 'to_email, to_name, and verification_code are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Send email using Django's email backend
            from django.core.mail import send_mail
            from django.conf import settings
            
            subject = 'Verify Your Email - ZeltonLivings Account'
            message = f'''Dear {to_name},

Thank you for registering with ZeltonLivings!

Your email verification code is: {verification_code}

Please enter this code in the app to complete your account setup.

This verification code is valid for 10 minutes.

If you did not create an account with ZeltonLivings, please disregard this email.

For support, contact us at support@zeltonlivings.com

Best regards,
The ZeltonLivings Team'''
            
            print(f"=== SENDING EMAIL VIA SMTP ===")
            print(f"To: {to_email}")
            print(f"Name: {to_name}")
            print(f"OTP: {verification_code}")
            print(f"=================================")
            
            # Send the email
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [to_email],
                    fail_silently=False,
                )
                print(f"Email sent successfully to {to_email}")
                return Response({
                    'success': True,
                    'message': 'OTP sent successfully'
                }, status=status.HTTP_200_OK)
            except Exception as email_error:
                print(f"SMTP error: {str(email_error)}")
                # Fallback: still log the OTP for testing
                print(f"Falling back to console logging for testing")
                return Response({
                    'success': True,
                    'message': 'OTP logged for testing (SMTP failed)'
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error sending OTP email: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to send OTP email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        """Verify OTP for email verification"""
        data = request.data
        email = data.get('email')
        otp = data.get('otp')
        
        if not email or not otp:
            return Response(
                {'error': 'Email and OTP are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # In a production app, you would store the OTP in cache/database with expiration
        # For now, we'll just return success (the actual verification happens client-side)
        # This endpoint can be used for additional server-side validation if needed
        
        return Response({
            'success': True,
            'message': 'OTP verified successfully'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            try:
                if hasattr(request.user, 'owner_profile'):
                    profile_serializer = OwnerSerializer(request.user.owner_profile)
                    role = 'owner'
                elif hasattr(request.user, 'tenant_profile'):
                    profile_serializer = TenantSerializer(request.user.tenant_profile)
                    role = 'tenant'
                else:
                    return Response(
                        {'error': 'User profile not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )

                return Response({
                    'user': UserSerializer(request.user).data,
                    'profile': profile_serializer.data,
                    'role': role
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {'error': 'Not authenticated'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'])
    def send_otp(self, request):
        """Send OTP for email verification"""
        data = request.data
        email = data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate 6-digit OTP
        import random
        verification_code = str(random.randint(100000, 999999))
        
        # Store OTP in session or cache (for production, use Redis or database)
        request.session[f'otp_{email}'] = verification_code
        request.session[f'otp_{email}_time'] = timezone.now().timestamp()
        
        print(f"OTP stored in session: {verification_code}")
        print(f"Session keys after storing: {list(request.session.keys())}")
        
        # Send email with OTP
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            # Get user name if user exists
            try:
                user = User.objects.get(email=email)
                to_name = f"{user.first_name} {user.last_name}".strip() or "User"
            except User.DoesNotExist:
                to_name = "User"
            
            subject = 'Verify Your Email - ZeltonLivings Account'
            message = f'''Dear {to_name},

Thank you for registering with ZeltonLivings!

Your email verification code is: {verification_code}

Please enter this code in the app to complete your account setup.

This verification code is valid for 10 minutes.

If you did not create an account with ZeltonLivings, please disregard this email.

For support, contact us at support@zeltonlivings.com

Best regards,
The ZeltonLivings Team'''
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            print(f"OTP sent to {email}: {verification_code}")
            
            return Response({
                'success': True,
                'message': 'OTP sent successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as email_error:
            print(f"SMTP error: {str(email_error)}")
            # Fallback: still log the OTP for testing
            print(f"Falling back to console logging for testing")
            return Response({
                'success': True,
                'message': 'OTP logged for testing (SMTP failed)',
                'debug_otp': verification_code  # Only for development
            }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        """Verify OTP for email verification"""
        data = request.data
        email = data.get('email')
        otp = data.get('otp')
        
        print(f"OTP verification request: email={email}, otp={otp}")
        print(f"Session keys: {list(request.session.keys())}")
        
        if not email or not otp:
            return Response(
                {'error': 'Email and OTP are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if OTP exists and is valid
        stored_otp = request.session.get(f'otp_{email}')
        stored_time = request.session.get(f'otp_{email}_time')
        
        print(f"Stored OTP: {stored_otp}, Stored time: {stored_time}")
        
        if not stored_otp or not stored_time:
            return Response(
                {'error': 'OTP not found or expired'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if OTP is expired (10 minutes)
        current_time = timezone.now().timestamp()
        if current_time - stored_time > 600:  # 10 minutes
            # Clear expired OTP
            del request.session[f'otp_{email}']
            del request.session[f'otp_{email}_time']
            return Response(
                {'error': 'OTP expired'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify OTP
        if stored_otp != otp:
            return Response(
                {'error': 'Invalid OTP'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clear OTP after successful verification
        del request.session[f'otp_{email}']
        del request.session[f'otp_{email}_time']
        
        return Response({
            'success': True,
            'message': 'OTP verified successfully'
        }, status=status.HTTP_200_OK)
