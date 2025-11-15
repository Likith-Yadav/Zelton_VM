from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
import re
from .models import (
    Owner, Property, Unit, Tenant, TenantKey, Payment, Invoice, 
    PaymentProof, ManualPaymentProof, PricingPlan, PaymentTransaction, PropertyImage, UnitImage,
    TenantDocument, OwnerPayment, OwnerPayout
)


def validate_phone_number(value):
    """Validate phone number format - exactly 10 digits starting with 6-9"""
    if not value:
        return value
    
    # Remove any non-digit characters
    cleaned = re.sub(r'\D', '', str(value))
    
    # Check if it's exactly 10 digits and starts with 6-9
    if not re.match(r'^[6-9]\d{9}$', cleaned):
        raise serializers.ValidationError(
            "Phone number must be exactly 10 digits and start with 6, 7, 8, or 9"
        )
    
    return cleaned


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class OwnerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile_image = serializers.SerializerMethodField()
    phone = serializers.CharField(validators=[validate_phone_number])
    subscription_plan_name = serializers.CharField(read_only=True)
    max_units_allowed = serializers.IntegerField(read_only=True)
    min_units_required = serializers.IntegerField(read_only=True)
    is_within_plan_limits = serializers.BooleanField(read_only=True)
    suggested_plan_upgrade = serializers.CharField(source='suggested_plan_upgrade.name', read_only=True)
    can_add_unit = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Owner
        fields = [
            'id', 'user', 'phone', 'address', 'city', 'state', 'pincode',
            'pan_number', 'aadhar_number', 'profile_image', 'date_of_birth', 'gender', 'occupation',
            'payment_method', 'bank_name', 
            'ifsc_code', 'account_number', 'upi_id', 'subscription_plan', 'subscription_plan_name', 
            'subscription_status', 'subscription_start_date', 'subscription_end_date', 'total_properties',
            'max_units_allowed', 'min_units_required', 'is_within_plan_limits', 
            'suggested_plan_upgrade', 'can_add_unit', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_properties']
    
    def get_profile_image(self, obj):
        if obj.profile_image:
            # Use the correct domain instead of request.build_absolute_uri()
            from django.conf import settings
            base_url = getattr(settings, 'BASE_URL', 'https://api.zelton.in')
            return f"{base_url}{obj.profile_image.url}"
        return None


class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'is_primary', 'created_at']


class PropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.user.get_full_name', read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'owner', 'owner_name', 'name', 'address', 'city', 'state', 'pincode',
            'property_type', 'description', 'total_units', 'occupied_units',
            'maintenance_contacts', 'images', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at', 'total_units', 'occupied_units']


class UnitImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitImage
        fields = ['id', 'image', 'is_primary', 'created_at']


class UnitSerializer(serializers.ModelSerializer):
    images = UnitImageSerializer(many=True, read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    rent_status = serializers.SerializerMethodField()
    rent_status_text = serializers.SerializerMethodField()
    rent_status_color = serializers.SerializerMethodField()
    current_month_paid = serializers.SerializerMethodField()
    pending_amount = serializers.SerializerMethodField()
    tenant_name = serializers.SerializerMethodField()
    tenant_key = serializers.SerializerMethodField()
    tenant_key_status = serializers.SerializerMethodField()
    
    def get_rent_status(self, obj):
        """Get rent status for the unit"""
        # Check if unit is occupied
        if obj.status != 'occupied':
            return 'available'
        
        # Get tenant for this unit
        tenant_key = obj.tenant_keys.filter(is_used=True).first()
        if not tenant_key or not tenant_key.tenant:
            return 'available'
        
        tenant = tenant_key.tenant
        
        # Calculate pending amount
        from django.utils import timezone
        today = timezone.now().date()
        
        # Calculate total rent owed (from tenant's move-in date to current month)
        move_in_date = tenant_key.used_at.date() if tenant_key.used_at else today
        
        # Calculate months from move-in to current month
        months_owed = (today.year - move_in_date.year) * 12 + (today.month - move_in_date.month) + 1
        
        # Total rent owed = months_owed * monthly_rent
        total_rent_owed = months_owed * float(obj.rent_amount)
        
        # Get total payments made
        from django.db.models import Sum
        total_payments = Payment.objects.filter(
            tenant=tenant,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Convert to float for calculation
        total_payments = float(total_payments)
        
        # Calculate pending amount
        pending_amount = total_rent_owed - total_payments
        
        # Check if current month rent is already paid
        current_month = timezone.now().replace(day=1)
        current_month_payment = Payment.objects.filter(
            tenant=tenant,
            status='completed',
            created_at__gte=current_month
        ).first()
        
        # Determine payment status
        if pending_amount <= 0:
            return 'paid'
        elif current_month_payment:
            return 'partial'
        else:
            return 'overdue'
    
    def get_rent_status_text(self, obj):
        """Get rent status text"""
        status = self.get_rent_status(obj)
        if status == 'available':
            return 'Available'
        elif status == 'paid':
            return 'Rent Paid'
        elif status == 'overdue':
            return 'Overdue'
        elif status == 'partial':
            return 'Partial Payment'
        return 'Unknown'
    
    def get_rent_status_color(self, obj):
        """Get rent status color"""
        status = self.get_rent_status(obj)
        if status == 'available':
            return 'blue'
        elif status == 'paid':
            return 'green'
        elif status == 'overdue':
            return 'red'
        elif status == 'partial':
            return 'orange'
        return 'gray'
    
    def get_current_month_paid(self, obj):
        """Check if current month rent is paid"""
        if obj.status != 'occupied':
            return False
        
        tenant_key = obj.tenant_keys.filter(is_used=True).first()
        if not tenant_key or not tenant_key.tenant:
            return False
        
        from django.utils import timezone
        current_month = timezone.now().replace(day=1)
        current_month_payment = Payment.objects.filter(
            tenant=tenant_key.tenant,
            status='completed',
            created_at__gte=current_month
        ).first()
        
        return current_month_payment is not None
    
    def get_pending_amount(self, obj):
        """Get pending rent amount"""
        if obj.status != 'occupied':
            return 0
        
        tenant_key = obj.tenant_keys.filter(is_used=True).first()
        if not tenant_key or not tenant_key.tenant:
            return 0
        
        # Use the Payment model's calculate_monthly_due method
        from core.models import Payment
        return float(Payment.calculate_monthly_due(tenant_key.tenant, obj))
    
    def get_tenant_name(self, obj):
        """Get tenant name if unit is occupied"""
        if obj.status != 'occupied':
            return None
        
        tenant_key = obj.tenant_keys.filter(is_used=True).first()
        if not tenant_key or not tenant_key.tenant:
            return None
        
        tenant = tenant_key.tenant
        return f"{tenant.user.first_name} {tenant.user.last_name}".strip() or tenant.user.email
    
    def get_tenant_key(self, obj):
        """Get tenant key for the unit"""
        # Get the most recent tenant key (used or unused)
        tenant_key = obj.tenant_keys.order_by('-created_at').first()
        if not tenant_key:
            return None
        
        return tenant_key.key
    
    def get_tenant_key_status(self, obj):
        """Get tenant key status"""
        # Get the most recent tenant key (used or unused)
        tenant_key = obj.tenant_keys.order_by('-created_at').first()
        if not tenant_key:
            return 'no_key'
        
        if tenant_key.is_used:
            return 'used'
        else:
            return 'available'
    
    class Meta:
        model = Unit
        fields = [
            'id', 'property', 'property_name', 'unit_number', 'unit_type', 'rent_amount',
            'rent_due_date', 'status', 'area_sqft', 'description', 'remaining_amount', 
            'images', 'created_at', 'updated_at', 'rent_status', 'rent_status_text', 
            'rent_status_color', 'current_month_paid', 'pending_amount', 'tenant_name', 
            'tenant_key', 'tenant_key_status'
        ]
        read_only_fields = ['id', 'property', 'created_at', 'updated_at']


class TenantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile_image = serializers.SerializerMethodField()
    phone = serializers.CharField(validators=[validate_phone_number], allow_blank=True)
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'user', 'phone', 'address', 'city', 'state', 'pincode',
            'pan_number', 'aadhar_number', 'profile_image', 'date_of_birth', 'gender', 'occupation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None


class TenantKeySerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    
    class Meta:
        model = TenantKey
        fields = [
            'id', 'key', 'property', 'property_name', 'unit', 'unit_number',
            'tenant', 'tenant_name', 'is_used', 'used_at', 'created_at'
        ]
        read_only_fields = ['id', 'key', 'created_at']


class OwnerPayoutSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    payment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = OwnerPayout
        fields = [
            'id', 'payment', 'owner', 'owner_name', 'amount', 'status',
            'beneficiary_type', 'cashfree_transfer_id', 'cashfree_utr',
            'retry_count', 'max_retries', 'initiated_at', 'completed_at',
            'error_message', 'payment_details'
        ]
        read_only_fields = ['id', 'initiated_at', 'completed_at']
    
    def get_owner_name(self, obj):
        return f"{obj.owner.user.first_name} {obj.owner.user.last_name}"
    
    def get_payment_details(self, obj):
        return {
            'unit_number': obj.payment.unit.unit_number,
            'property_name': obj.payment.unit.property.name,
            'tenant_name': obj.payment.tenant.user.get_full_name()
        }


class PaymentSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    reconciliation_status = serializers.SerializerMethodField()
    payout_status = serializers.SerializerMethodField()
    payout_message = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    
    def get_reconciliation_status(self, obj):
        """Get reconciliation status from related transaction"""
        transaction = obj.transactions.first()
        return transaction.reconciliation_status if transaction else 'not_started'
    
    def get_payout_status(self, obj):
        """Get payout status for owner visibility"""
        try:
            payout = obj.owner_payout
            return payout.status
        except:
            return 'not_initiated'
    
    def get_payout_message(self, obj):
        """Get user-friendly payout message"""
        try:
            payout = obj.owner_payout
            if payout.status == 'completed':
                return 'Payment transferred successfully'
            elif payout.status in ['pending', 'processing', 'retry_scheduled']:
                return 'Payment processing, contact admin if delayed'
            elif payout.status == 'failed':
                return 'Payment processing failed, contact admin'
            else:
                return 'Payment processing'
        except:
            return 'Payout not initiated'
    
    class Meta:
        model = Payment
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name',
            'amount', 'payment_gateway_charge', 'total_amount',
            'payment_type', 'status', 'payment_date', 'due_date',
            'merchant_order_id', 'phonepe_transaction_id', 'phonepe_payment_id', 'phonepe_order_id',
            'reconciliation_status', 'payout_status', 'payout_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        return obj.total_amount


class PaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProof
        fields = ['id', 'payment', 'image', 'description', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class InvoiceSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'tenant', 'tenant_name', 'unit', 'unit_number', 'property_name',
            'invoice_number', 'amount', 'rent_amount', 'maintenance_amount',
            'due_date', 'status', 'payment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']


class PricingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingPlan
        fields = [
            'id', 'name', 'min_units', 'max_units', 'monthly_price',
            'yearly_price', 'features', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'merchant_order_id', 'phonepe_transaction_id', 'phonepe_payment_id', 'phonepe_order_id',
            'amount', 'currency', 'status', 'payment_method', 'payment_gateway_response',
            'payment_attempt_count', 'reconciliation_status', 'user', 'payment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OwnerPaymentSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.user.get_full_name', read_only=True)
    owner_email = serializers.CharField(source='owner.user.email', read_only=True)
    pricing_plan_name = serializers.CharField(source='pricing_plan.name', read_only=True)
    
    class Meta:
        model = OwnerPayment
        fields = [
            'id', 'owner', 'owner_name', 'owner_email', 'pricing_plan', 'pricing_plan_name',
            'amount', 'payment_type', 'payment_method', 'status', 'payment_date',
            'due_date', 'subscription_start_date', 'subscription_end_date',
            'merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id',
            'payment_gateway_response', 'is_legacy_payment', 'legacy_notes',
            'migrated_from', 'description', 'invoice_number', 'receipt_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentInitiationResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    merchant_order_id = serializers.CharField()
    order_id = serializers.CharField()
    redirect_url = serializers.URLField()
    expire_at = serializers.IntegerField()
    state = serializers.CharField()
    error = serializers.CharField(required=False)
    error_code = serializers.CharField(required=False)


# Dashboard serializers
class OwnerDashboardSerializer(serializers.Serializer):
    total_properties = serializers.IntegerField()
    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    vacant_units = serializers.IntegerField()
    monthly_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_payments = serializers.DecimalField(max_digits=10, decimal_places=2)
    overdue_payments = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_due = serializers.DecimalField(max_digits=10, decimal_places=2)
    recent_payments = serializers.ListField(child=serializers.DictField())
    recent_tenants = serializers.ListField(child=serializers.DictField())


class TenantDashboardSerializer(serializers.Serializer):
    current_property = PropertySerializer()
    current_unit = UnitSerializer()
    monthly_rent = serializers.DecimalField(max_digits=10, decimal_places=2)
    next_due_date = serializers.DateField()
    payment_status = serializers.CharField()
    recent_payments = PaymentSerializer(many=True)
    pending_amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class TenantDocumentSerializer(serializers.ModelSerializer):
    document_url = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    tenant_name = serializers.SerializerMethodField()
    unit_number = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantDocument
        fields = [
            'id', 'tenant', 'unit', 'document_type', 'document_file', 
            'file_name', 'file_size', 'file_size_mb', 'uploaded_at', 
            'is_required', 'document_url', 'tenant_name', 'unit_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'unit', 'file_name', 'file_size', 'uploaded_at', 'created_at', 'updated_at']
    
    def get_document_url(self, obj):
        """Generate absolute URL for the document file"""
        if obj.document_file:
            # Use the correct domain instead of request.build_absolute_uri()
            from django.conf import settings
            base_url = getattr(settings, 'BASE_URL', 'https://api.zelton.in')
            return f"{base_url}{obj.document_file.url}"
        return None
    
    def get_file_size_mb(self, obj):
        """Convert file size to MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return 0
    
    def get_tenant_name(self, obj):
        """Get tenant's full name"""
        return obj.tenant.user.get_full_name()
    
    def get_unit_number(self, obj):
        """Get unit number"""
        return obj.unit.unit_number


class ManualPaymentProofSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.user.get_full_name', read_only=True)
    tenant_email = serializers.CharField(source='tenant.user.email', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    owner_name = serializers.CharField(source='owner.user.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    payment_proof_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ManualPaymentProof
        fields = [
            'id', 'tenant', 'unit', 'amount', 'payment_proof_image', 'payment_proof_image_url',
            'description', 'verification_status', 'verified_by', 'verified_by_name',
            'verification_notes', 'verified_at', 'uploaded_at', 'updated_at',
            'tenant_name', 'tenant_email', 'unit_number', 'property_name', 'owner_name'
        ]
        read_only_fields = [
            'id', 'verified_by', 'verified_by_name', 'verified_at', 'uploaded_at', 'updated_at',
            'tenant_name', 'tenant_email', 'unit_number', 'property_name', 'owner_name',
            'payment_proof_image_url'
        ]
    
    def get_payment_proof_image_url(self, obj):
        """Get the full URL for the payment proof image"""
        if obj.payment_proof_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.payment_proof_image.url)
            return obj.payment_proof_image.url
        return None


class ManualPaymentProofCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating manual payment proofs (tenant upload)"""
    
    class Meta:
        model = ManualPaymentProof
        fields = ['unit', 'amount', 'payment_proof_image', 'description']
    
    def validate_amount(self, value):
        """Validate that amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value
    
    def validate(self, data):
        """Validate the entire data"""
        if not data.get('payment_proof_image'):
            raise serializers.ValidationError({"payment_proof_image": "Payment proof image is required"})
        return data


class ManualPaymentProofVerificationSerializer(serializers.ModelSerializer):
    """Serializer for owner verification of payment proofs"""
    
    class Meta:
        model = ManualPaymentProof
        fields = ['verification_status', 'verification_notes']
    
    def validate_verification_status(self, value):
        """Validate verification status"""
        if value not in ['verified', 'rejected']:
            raise serializers.ValidationError("Verification status must be 'verified' or 'rejected'")
        return value


