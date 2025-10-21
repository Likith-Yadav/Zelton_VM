from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.db.models import Sum
from django.dispatch import receiver
import uuid
import random
import string


class Owner(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('bank', 'Bank Details'),
        ('upi', 'UPI'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='owner_profile')
    phone = models.CharField(max_length=15)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    pan_number = models.CharField(max_length=10, unique=True, null=True, blank=True)
    aadhar_number = models.CharField(max_length=12, unique=True, null=True, blank=True)
    profile_image = models.ImageField(upload_to='owner_profiles/', null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, null=True, blank=True)
    occupation = models.CharField(max_length=100, blank=True, default='')
    emergency_contact = models.CharField(max_length=15, blank=True, default='')
    emergency_contact_name = models.CharField(max_length=100, blank=True, default='')
    
    # Payment Method Fields
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True)
    bank_name = models.CharField(max_length=100, blank=True, default='')
    ifsc_code = models.CharField(max_length=11, blank=True, default='')
    account_number = models.CharField(max_length=20, blank=True, default='')
    upi_id = models.CharField(max_length=100, blank=True, default='')
    
    subscription_plan = models.ForeignKey('PricingPlan', on_delete=models.SET_NULL, null=True, blank=True, related_name='subscribed_owners')
    subscription_status = models.CharField(max_length=20, default='inactive')
    subscription_start_date = models.DateTimeField(null=True, blank=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    total_properties = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - {self.user.email}"
    
    @property
    def calculated_total_properties(self):
        """Calculate total properties for this owner"""
        return self.properties.count()
    
    @property
    def calculated_total_units(self):
        """Calculate total units across all properties for this owner"""
        return Unit.objects.filter(property__owner=self).count()
    
    @property
    def calculated_occupied_units(self):
        """Calculate occupied units across all properties for this owner"""
        return Unit.objects.filter(property__owner=self, status='occupied').count()
    
    @property
    def subscription_plan_name(self):
        """Get the subscription plan name for backward compatibility"""
        return self.subscription_plan.name if self.subscription_plan else 'No Plan'
    
    @property
    def max_units_allowed(self):
        """Get the maximum units allowed by the current subscription plan"""
        return self.subscription_plan.max_units if self.subscription_plan else 0
    
    @property
    def min_units_required(self):
        """Get the minimum units required by the current subscription plan"""
        return self.subscription_plan.min_units if self.subscription_plan else 0
    
    @property
    def is_within_plan_limits(self):
        """Check if owner is within their subscription plan limits"""
        if not self.subscription_plan:
            return False
        return self.calculated_total_units <= self.max_units_allowed
    
    @property
    def suggested_plan_upgrade(self):
        """Suggest the appropriate plan upgrade based on current unit count"""
        if not self.subscription_plan:
            return None
        
        current_count = self.calculated_total_units
        if current_count <= self.max_units_allowed:
            return None  # No upgrade needed
        
        # Find the appropriate plan for current unit count
        suggested_plan = PricingPlan.objects.filter(
            min_units__lte=current_count,
            max_units__gte=current_count,
            is_active=True
        ).first()
        
        return suggested_plan
    
    @property
    def can_add_unit(self):
        """Check if owner can add another unit based on their plan"""
        if not self.subscription_plan:
            return False  # No plan means no units allowed
        return self.calculated_total_units < self.max_units_allowed
    
    @property
    def is_subscription_active(self):
        """Check if subscription is currently active and not expired"""
        if not self.subscription_plan or self.subscription_status != 'active':
            return False
        
        if not self.subscription_end_date:
            return False
        
        from django.utils import timezone
        return timezone.now().date() <= self.subscription_end_date
    
    @property
    def is_subscription_expired(self):
        """Check if subscription has expired"""
        if not self.subscription_plan or not self.subscription_end_date:
            return False
        
        from django.utils import timezone
        return timezone.now().date() > self.subscription_end_date
    
    @property
    def days_until_expiry(self):
        """Get number of days until subscription expires"""
        if not self.subscription_end_date:
            return None
        
        from django.utils import timezone
        today = timezone.now().date()
        delta = self.subscription_end_date - today
        return delta.days
    
    @property
    def subscription_expiry_status(self):
        """Get subscription expiry status"""
        if not self.subscription_plan:
            return 'no_plan'
        
        if self.is_subscription_expired:
            return 'expired'
        
        days_left = self.days_until_expiry
        if days_left is None:
            return 'unknown'
        
        if days_left <= 0:
            return 'expired'
        elif days_left <= 7:
            return 'expiring_soon'
        elif days_left <= 30:
            return 'expiring_month'
        else:
            return 'active'
    
    def validate_unit_limit(self):
        """Validate if owner can add more units - used for security checks"""
        if not self.subscription_plan:
            raise ValueError("No subscription plan found. Please subscribe to a plan first.")
        
        if not self.can_add_unit:
            suggested_plan = self.suggested_plan_upgrade
            if suggested_plan:
                raise ValueError(
                    f"Unit limit exceeded. Current: {self.calculated_total_units}, "
                    f"Max allowed: {self.max_units_allowed}. "
                    f"Upgrade to {suggested_plan.name} to add up to {suggested_plan.max_units} units."
                )
            else:
                raise ValueError(
                    f"Unit limit exceeded. Current: {self.calculated_total_units}, "
                    f"Max allowed: {self.max_units_allowed}. "
                    f"Please contact support for a custom plan."
                )
        return True


class Property(models.Model):
    PROPERTY_TYPES = [
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('villa', 'Villa'),
        ('commercial', 'Commercial'),
        ('other', 'Other'),
    ]
    
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name='properties')
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES)
    description = models.TextField(blank=True)
    total_units = models.IntegerField(default=0)
    occupied_units = models.IntegerField(default=0)
    emergency_contact = models.CharField(max_length=15, blank=True, default='')
    maintenance_contacts = models.JSONField(default=dict, blank=True)  # Store as dictionary
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.city}"


class Unit(models.Model):
    UNIT_STATUS = [
        ('available', 'Available'),
        ('occupied', 'Occupied'),
        ('maintenance', 'Under Maintenance'),
    ]
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='units')
    unit_number = models.CharField(max_length=50)
    unit_type = models.CharField(max_length=50)  # 1BHK, 2BHK, etc.
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    rent_due_date = models.IntegerField(default=1)  # Day of month
    status = models.CharField(max_length=20, choices=UNIT_STATUS, default='available')
    area_sqft = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Remaining rent for current month
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.property.name} - Unit {self.unit_number}"
    
    def update_remaining_amount(self, tenant=None):
        """Update the remaining amount accumulating across months"""
        if not tenant:
            # If no tenant specified, find the current tenant for this unit
            tenant_key = self.tenant_keys.filter(is_used=True).first()
            if not tenant_key or not tenant_key.tenant:
                self.remaining_amount = self.rent_amount
                self.save()
                return
            tenant = tenant_key.tenant
        
        # Calculate total rent owed from tenant's move-in date to current month
        from django.utils import timezone
        today = timezone.now().date()
        
        # Get tenant's move-in date
        tenant_key = self.tenant_keys.filter(tenant=tenant, is_used=True).first()
        if not tenant_key or not tenant_key.used_at:
            self.remaining_amount = self.rent_amount
            self.save()
            return
        
        move_in_date = tenant_key.used_at.date()
        
        # Calculate months from move-in to current month
        months_owed = (today.year - move_in_date.year) * 12 + (today.month - move_in_date.month) + 1
        
        # Total rent owed = months_owed * monthly_rent
        total_rent_owed = months_owed * self.rent_amount
        
        # Calculate total payments made by tenant
        from django.db.models import Sum
        total_payments_made = Payment.objects.filter(
            tenant=tenant,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Remaining amount = Total rent owed - Total payments made
        remaining = max(0, total_rent_owed - total_payments_made)
        
        self.remaining_amount = remaining
        self.save()
        
        return remaining


class Tenant(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tenant_profile')
    phone = models.CharField(max_length=15, blank=True, default='')
    address = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    pincode = models.CharField(max_length=10, blank=True, default='')
    pan_number = models.CharField(max_length=10, unique=True, null=True, blank=True)
    aadhar_number = models.CharField(max_length=12, unique=True, null=True, blank=True)
    profile_image = models.ImageField(upload_to='tenant_profiles/', null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, null=True, blank=True)
    occupation = models.CharField(max_length=100, blank=True, default='')
    emergency_contact = models.CharField(max_length=15, blank=True, default='')
    emergency_contact_name = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} - {self.user.email}"


class TenantKey(models.Model):
    key = models.CharField(max_length=8, unique=True)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='tenant_keys')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='tenant_keys')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_keys', null=True, blank=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_unique_key()
        super().save(*args, **kwargs)
    
    def generate_unique_key(self):
        while True:
            key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not TenantKey.objects.filter(key=key).exists():
                return key
    
    def __str__(self):
        return f"Key: {self.key} - {self.property.name}"


class Payment(models.Model):
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_TYPE = [
        ('rent', 'Rent Payment'),
        ('subscription', 'Subscription Payment'),
        ('maintenance', 'Maintenance Payment'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='payments')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    payment_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField()
    merchant_order_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    phonepe_transaction_id = models.CharField(max_length=100, blank=True)
    phonepe_payment_id = models.CharField(max_length=100, blank=True)
    phonepe_order_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Payment {self.id} - {self.tenant.user.email} - ₹{self.amount}"
    
    @classmethod
    def calculate_monthly_due(cls, tenant, unit):
        """Calculate monthly due amount for a tenant based on rent owed vs payments made"""
        today = timezone.now().date()
        
        # Calculate total rent owed (from tenant's move-in date to current month)
        tenant_key = TenantKey.objects.filter(tenant=tenant, is_used=True).first()
        if not tenant_key:
            return 0
        
        # Get tenant's move-in date (when they joined the property)
        move_in_date = tenant_key.used_at.date() if tenant_key.used_at else today
        
        # Calculate months from move-in to current month
        months_owed = (today.year - move_in_date.year) * 12 + (today.month - move_in_date.month) + 1
        
        # Total rent owed = months_owed * monthly_rent
        total_rent_owed = months_owed * unit.rent_amount
        
        # Calculate total payments made by tenant
        total_payments_made = cls.objects.filter(
            tenant=tenant,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Due amount = Total rent owed - Total payments made
        due_amount = max(0, total_rent_owed - total_payments_made)
        
        return due_amount


class Invoice(models.Model):
    INVOICE_STATUS = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    maintenance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=INVOICE_STATUS, default='draft')
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate unique invoice number using timestamp and random component
            import random
            import string
            import time
            
            # Use microsecond timestamp for better uniqueness
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')[:-3]  # Include milliseconds
            random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.invoice_number = f"INV-{timestamp}-{random_suffix}"
            
            # Ensure uniqueness by checking if it already exists
            while Invoice.objects.filter(invoice_number=self.invoice_number).exists():
                timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')[:-3]
                random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                self.invoice_number = f"INV-{timestamp}-{random_suffix}"
                
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.tenant.user.email}"


class PaymentProof(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='proofs')
    image = models.ImageField(upload_to='payment_proofs/')
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Proof for Payment {self.payment.id}"


class PricingPlan(models.Model):
    name = models.CharField(max_length=100)
    min_units = models.IntegerField()
    max_units = models.IntegerField()
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2)
    features = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.min_units}-{self.max_units} units"
    
    @classmethod
    def get_plan_for_unit_count(cls, unit_count):
        return cls.objects.filter(
            min_units__lte=unit_count,
            max_units__gte=unit_count,
            is_active=True
        ).first()


class PaymentTransaction(models.Model):
    TRANSACTION_STATUS = [
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    RECONCILIATION_STATUS = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    merchant_order_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    phonepe_transaction_id = models.CharField(max_length=100, unique=True)
    phonepe_payment_id = models.CharField(max_length=100, blank=True)
    phonepe_order_id = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS, default='initiated')
    payment_method = models.CharField(max_length=50, blank=True)
    payment_gateway_response = models.JSONField(default=dict)
    payment_attempt_count = models.IntegerField(default=0)
    reconciliation_status = models.CharField(max_length=20, choices=RECONCILIATION_STATUS, default='not_started')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_transactions')
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Transaction {self.phonepe_transaction_id} - {self.status}"


class PropertyImage(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='property_images/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.property.name}"


class UnitImage(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='unit_images/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.unit.property.name} - Unit {self.unit.unit_number}"


class OwnerSubscriptionPayment(models.Model):
    SUBSCRIPTION_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    SUBSCRIPTION_PERIOD = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name='subscription_payments')
    pricing_plan = models.ForeignKey(PricingPlan, on_delete=models.CASCADE, related_name='subscription_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, default='subscription')
    status = models.CharField(max_length=20, choices=SUBSCRIPTION_STATUS, default='pending')
    payment_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField()
    subscription_period = models.CharField(max_length=20, choices=SUBSCRIPTION_PERIOD)
    subscription_start_date = models.DateTimeField(null=True, blank=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    merchant_order_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    phonepe_order_id = models.CharField(max_length=100, blank=True)
    phonepe_transaction_id = models.CharField(max_length=100, blank=True)
    payment_gateway_response = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Subscription Payment {self.id} - {self.owner.user.email} - ₹{self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.merchant_order_id:
            self.merchant_order_id = f"SUB_{self.owner.id}_{int(timezone.now().timestamp())}"
        super().save(*args, **kwargs)


class OwnerPayment(models.Model):
    """
    Comprehensive payment tracking model for all owner payments.
    This model handles both new and legacy payments gracefully.
    """
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_TYPE = [
        ('subscription', 'Subscription Payment'),
        ('upgrade', 'Plan Upgrade'),
        ('renewal', 'Plan Renewal'),
        ('legacy', 'Legacy Payment'),  # For old payments without proper tracking
    ]
    
    PAYMENT_METHOD = [
        ('phonepe', 'PhonePe'),
        ('razorpay', 'Razorpay'),
        ('manual', 'Manual Entry'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]
    
    # Core payment information
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name='all_payments')
    pricing_plan = models.ForeignKey(PricingPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='owner_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE, default='subscription')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD, default='phonepe')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    # Payment dates
    payment_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    subscription_start_date = models.DateTimeField(null=True, blank=True)
    subscription_end_date = models.DateTimeField(null=True, blank=True)
    
    # Payment gateway information
    merchant_order_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    phonepe_order_id = models.CharField(max_length=100, blank=True)
    phonepe_transaction_id = models.CharField(max_length=100, blank=True)
    payment_gateway_response = models.JSONField(default=dict)
    
    # Legacy payment handling
    is_legacy_payment = models.BooleanField(default=False)
    legacy_notes = models.TextField(blank=True, help_text="Notes for legacy payments")
    migrated_from = models.CharField(max_length=100, blank=True, help_text="Source of migration if applicable")
    
    # Additional information
    description = models.TextField(blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    receipt_number = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['payment_date']),
            models.Index(fields=['merchant_order_id']),
        ]
    
    def __str__(self):
        return f"Payment {self.id} - {self.owner.user.email} - ₹{self.amount} ({self.status})"
    
    def save(self, *args, **kwargs):
        if not self.merchant_order_id and not self.is_legacy_payment:
            self.merchant_order_id = f"OWNER_{self.owner.id}_{int(timezone.now().timestamp())}"
        super().save(*args, **kwargs)
    
    @property
    def owner_name(self):
        """Get owner's full name"""
        return self.owner.user.get_full_name() or self.owner.user.username
    
    @property
    def owner_email(self):
        """Get owner's email"""
        return self.owner.user.email
    
    @property
    def pricing_plan_name(self):
        """Get pricing plan name"""
        return self.pricing_plan.name if self.pricing_plan else 'No Plan'
    
    @property
    def subscription_duration_days(self):
        """Get subscription duration in days"""
        if self.subscription_start_date and self.subscription_end_date:
            duration = self.subscription_end_date - self.subscription_start_date
            return duration.days
        return 0
    
    @property
    def is_active_subscription(self):
        """Check if this payment represents an active subscription"""
        if not self.subscription_end_date:
            return False
        from django.utils import timezone
        return timezone.now() <= self.subscription_end_date
    
    @classmethod
    def create_legacy_payment(cls, owner, amount, payment_date=None, description="Legacy payment", **kwargs):
        """
        Create a legacy payment record for old payments that don't have proper tracking.
        This method handles old payments gracefully without errors.
        """
        try:
            # Set default values for legacy payments
            legacy_data = {
                'owner': owner,
                'amount': amount,
                'payment_type': 'legacy',
                'payment_method': 'manual',
                'status': 'completed',
                'is_legacy_payment': True,
                'legacy_notes': description,
                'migrated_from': 'legacy_system',
                'description': description,
            }
            
            if payment_date:
                legacy_data['payment_date'] = payment_date
            
            # Update with any additional kwargs
            legacy_data.update(kwargs)
            
            return cls.objects.create(**legacy_data)
        except Exception as e:
            # Log the error but don't raise it to prevent system crashes
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create legacy payment for owner {owner.id}: {str(e)}")
            return None
    
    @classmethod
    def migrate_old_subscription_payments(cls):
        """
        Migrate old OwnerSubscriptionPayment records to the new OwnerPayment model.
        This method handles the migration gracefully.
        """
        try:
            from .models import OwnerSubscriptionPayment
            
            migrated_count = 0
            for old_payment in OwnerSubscriptionPayment.objects.all():
                try:
                    # Check if already migrated
                    if cls.objects.filter(
                        owner=old_payment.owner,
                        amount=old_payment.amount,
                        payment_date=old_payment.payment_date,
                        migrated_from='OwnerSubscriptionPayment'
                    ).exists():
                        continue
                    
                    # Create new payment record
                    cls.objects.create(
                        owner=old_payment.owner,
                        pricing_plan=old_payment.pricing_plan,
                        amount=old_payment.amount,
                        payment_type='subscription',
                        payment_method='phonepe',
                        status=old_payment.status,
                        payment_date=old_payment.payment_date,
                        due_date=old_payment.due_date,
                        subscription_start_date=old_payment.subscription_start_date,
                        subscription_end_date=old_payment.subscription_end_date,
                        merchant_order_id=old_payment.merchant_order_id,
                        phonepe_order_id=old_payment.phonepe_order_id,
                        phonepe_transaction_id=old_payment.phonepe_transaction_id,
                        payment_gateway_response=old_payment.payment_gateway_response,
                        migrated_from='OwnerSubscriptionPayment',
                        description=f"Migrated from OwnerSubscriptionPayment ID: {old_payment.id}"
                    )
                    migrated_count += 1
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to migrate payment {old_payment.id}: {str(e)}")
                    continue
            
            return migrated_count
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to migrate old subscription payments: {str(e)}")
            return 0


# Signal handlers to update property unit counts
@receiver(post_save, sender=Unit)
def update_property_unit_counts(sender, instance, created, **kwargs):
    """Update property unit counts when a unit is created or updated"""
    property_obj = instance.property
    property_obj.total_units = Unit.objects.filter(property=property_obj).count()
    property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
    property_obj.save(update_fields=['total_units', 'occupied_units'])


@receiver(post_delete, sender=Unit)
def update_property_unit_counts_on_delete(sender, instance, **kwargs):
    """Update property unit counts when a unit is deleted"""
    property_obj = instance.property
    property_obj.total_units = Unit.objects.filter(property=property_obj).count()
    property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
    property_obj.save(update_fields=['total_units', 'occupied_units'])


# Signal handlers to update owner property counts
@receiver(post_save, sender=Property)
def update_owner_property_counts(sender, instance, created, **kwargs):
    """Update owner property count when a property is created or updated"""
    owner = instance.owner
    owner.total_properties = Property.objects.filter(owner=owner).count()
    owner.save(update_fields=['total_properties'])


@receiver(post_delete, sender=Property)
def update_owner_property_counts_on_delete(sender, instance, **kwargs):
    """Update owner property count when a property is deleted"""
    owner = instance.owner
    owner.total_properties = Property.objects.filter(owner=owner).count()
    owner.save(update_fields=['total_properties'])


def validate_document_file(file):
    """Validate uploaded document file"""
    import os
    from django.core.exceptions import ValidationError
    
    # Check file size (5MB limit)
    if file.size > 5 * 1024 * 1024:  # 5MB in bytes
        raise ValidationError('File size cannot exceed 5MB.')
    
    # Check file extension
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    file_extension = os.path.splitext(file.name)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise ValidationError(f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}')


def tenant_document_upload_path(instance, filename):
    """Generate upload path for tenant documents"""
    import os
    import uuid
    
    file_extension = os.path.splitext(filename)[1]
    # Use a UUID if instance.id is not available yet
    unique_id = str(instance.id) if instance.id else str(uuid.uuid4())[:8]
    return f'tenant_documents/{instance.tenant.id}/{instance.document_type}_{unique_id}{file_extension}'


class TenantDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('aadhaar', 'Aadhaar Card'),
        ('rental_agreement', 'Rental Agreement'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='documents')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='tenant_documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPE_CHOICES)
    document_file = models.FileField(
        upload_to=tenant_document_upload_path,
        validators=[validate_document_file]
    )
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()  # Size in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['tenant', 'document_type']  # One document per type per tenant
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.tenant.user.get_full_name()} - {self.get_document_type_display()}"
    
    def save(self, *args, **kwargs):
        if self.document_file:
            self.file_name = self.document_file.name
            self.file_size = self.document_file.size
        super().save(*args, **kwargs)
