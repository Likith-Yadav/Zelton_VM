from django.contrib import admin
from .models import (
    Owner, Property, Unit, Tenant, TenantKey, Payment, Invoice,
    PaymentProof, ManualPaymentProof, PricingPlan, PaymentTransaction, PropertyImage, UnitImage,
    TenantDocument, OwnerPayment, OwnerPayout
)


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'city', 'get_subscription_plan_name', 'subscription_status', 'get_max_units_allowed', 'get_total_units', 'get_is_within_limits', 'get_can_add_unit']
    list_filter = ['subscription_plan', 'subscription_status', 'city']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'phone']
    readonly_fields = ['get_total_properties', 'get_total_units', 'get_occupied_units', 'get_subscription_plan_name', 'get_max_units_allowed', 'get_is_within_limits', 'get_can_add_unit', 'get_suggested_upgrade']
    
    def get_total_properties(self, obj):
        """Display calculated total properties"""
        return obj.calculated_total_properties
    get_total_properties.short_description = 'Total Properties'
    get_total_properties.admin_order_field = 'total_properties'
    
    def get_total_units(self, obj):
        """Display calculated total units"""
        return obj.calculated_total_units
    get_total_units.short_description = 'Total Units'
    
    def get_occupied_units(self, obj):
        """Display calculated occupied units"""
        return obj.calculated_occupied_units
    get_occupied_units.short_description = 'Occupied Units'
    
    def get_subscription_plan_name(self, obj):
        """Display subscription plan name"""
        return obj.subscription_plan_name
    get_subscription_plan_name.short_description = 'Subscription Plan'
    get_subscription_plan_name.admin_order_field = 'subscription_plan__name'
    
    def get_max_units_allowed(self, obj):
        """Display maximum units allowed by subscription plan"""
        return obj.max_units_allowed
    get_max_units_allowed.short_description = 'Max Units Allowed'
    get_max_units_allowed.admin_order_field = 'subscription_plan__max_units'
    
    def get_is_within_limits(self, obj):
        """Display if owner is within plan limits"""
        return obj.is_within_plan_limits
    get_is_within_limits.short_description = 'Within Limits'
    get_is_within_limits.boolean = True
    
    def get_can_add_unit(self, obj):
        """Display if owner can add more units"""
        return obj.can_add_unit
    get_can_add_unit.short_description = 'Can Add Unit'
    get_can_add_unit.boolean = True
    
    def get_suggested_upgrade(self, obj):
        """Display suggested plan upgrade"""
        suggested = obj.suggested_plan_upgrade
        return suggested.name if suggested else 'No upgrade needed'
    get_suggested_upgrade.short_description = 'Suggested Upgrade'


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'city', 'property_type', 'total_units', 'occupied_units', 'get_maintenance_contacts_count']
    list_filter = ['property_type', 'city', 'state']
    search_fields = ['name', 'city', 'address']
    readonly_fields = ['get_maintenance_contacts_display']
    
    def get_maintenance_contacts_count(self, obj):
        """Display count of maintenance contacts"""
        if obj.maintenance_contacts:
            return len(obj.maintenance_contacts)
        return 0
    get_maintenance_contacts_count.short_description = 'Maintenance Contacts'
    
    def get_maintenance_contacts_display(self, obj):
        """Display maintenance contacts in detail view"""
        if not obj.maintenance_contacts:
            return "No maintenance contacts"
        
        contacts = []
        for service_type, contact in obj.maintenance_contacts.items():
            contacts.append(f"{service_type.title()}: {contact.get('name', 'N/A')} - {contact.get('phone', 'N/A')}")
        
        return "\n".join(contacts)
    get_maintenance_contacts_display.short_description = 'Maintenance Contacts Details'


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['unit_number', 'property', 'unit_type', 'rent_amount', 'status']
    list_filter = ['status', 'unit_type', 'property__city']
    search_fields = ['unit_number', 'property__name']


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'city']
    list_filter = ['city', 'state']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'phone']


@admin.register(TenantKey)
class TenantKeyAdmin(admin.ModelAdmin):
    list_display = ['key', 'property', 'unit', 'tenant', 'is_used']
    list_filter = ['is_used', 'property__city']
    search_fields = ['key', 'property__name', 'unit__unit_number']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'tenant', 'unit', 'amount', 'status', 'due_date', 'payment_date']
    list_filter = ['status', 'payment_type', 'due_date']
    search_fields = ['tenant__user__email', 'unit__property__name']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'tenant', 'unit', 'amount', 'status', 'due_date']
    list_filter = ['status', 'due_date']
    search_fields = ['invoice_number', 'tenant__user__email']


@admin.register(PricingPlan)
class PricingPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_units', 'max_units', 'monthly_price', 'yearly_price', 'is_active']
    list_filter = ['is_active']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['phonepe_transaction_id', 'amount', 'status', 'user', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['phonepe_transaction_id', 'user__email']


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ['property', 'is_primary', 'created_at']
    list_filter = ['is_primary']


@admin.register(UnitImage)
class UnitImageAdmin(admin.ModelAdmin):
    list_display = ['unit', 'is_primary', 'created_at']
    list_filter = ['is_primary']


@admin.register(PaymentProof)
class PaymentProofAdmin(admin.ModelAdmin):
    list_display = ['payment', 'uploaded_at']
    list_filter = ['uploaded_at']


@admin.register(TenantDocument)
class TenantDocumentAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'unit', 'document_type', 'file_name', 'file_size', 'uploaded_at', 'is_required']
    list_filter = ['document_type', 'is_required', 'uploaded_at']
    search_fields = ['tenant__user__email', 'unit__unit_number', 'file_name']
    readonly_fields = ['file_name', 'file_size', 'uploaded_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('tenant__user', 'unit')


@admin.register(OwnerPayment)
class OwnerPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'get_owner_name', 'get_owner_email', 'get_pricing_plan_name', 
        'amount', 'payment_type', 'payment_method', 'status', 'payment_date', 
        'get_subscription_duration', 'is_legacy_payment', 'migrated_from', 'created_at'
    ]
    list_filter = [
        'status', 'payment_type', 'payment_method', 'is_legacy_payment', 
        'payment_date', 'created_at', 'pricing_plan'
    ]
    search_fields = [
        'owner__user__first_name', 'owner__user__last_name', 'owner__user__email',
        'merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id',
        'invoice_number', 'receipt_number', 'description'
    ]
    readonly_fields = [
        'merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id',
        'payment_gateway_response', 'created_at', 'updated_at', 'migrated_from'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('owner', 'pricing_plan', 'amount', 'payment_type', 'payment_method', 'status')
        }),
        ('Payment Dates', {
            'fields': ('payment_date', 'due_date', 'subscription_start_date', 'subscription_end_date')
        }),
        ('Payment Gateway Details', {
            'fields': ('merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id', 'payment_gateway_response'),
            'classes': ('collapse',)
        }),
        ('Legacy & Migration Info', {
            'fields': ('is_legacy_payment', 'legacy_notes', 'migrated_from'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('description', 'invoice_number', 'receipt_number'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_completed', 'mark_as_failed', 'create_legacy_payment']
    
    def get_owner_name(self, obj):
        """Display owner's full name"""
        return obj.owner_name
    get_owner_name.short_description = 'Owner Name'
    get_owner_name.admin_order_field = 'owner__user__first_name'
    
    def get_owner_email(self, obj):
        """Display owner's email"""
        return obj.owner_email
    get_owner_email.short_description = 'Owner Email'
    get_owner_email.admin_order_field = 'owner__user__email'
    
    def get_pricing_plan_name(self, obj):
        """Display pricing plan name"""
        return obj.pricing_plan_name
    get_pricing_plan_name.short_description = 'Pricing Plan'
    get_pricing_plan_name.admin_order_field = 'pricing_plan__name'
    
    def get_subscription_duration(self, obj):
        """Display subscription duration"""
        days = obj.subscription_duration_days
        if days > 0:
            if days >= 365:
                years = days // 365
                remaining_days = days % 365
                return f"{years} year{'s' if years > 1 else ''} {remaining_days} day{'s' if remaining_days > 1 else ''}"
            elif days >= 30:
                months = days // 30
                remaining_days = days % 30
                return f"{months} month{'s' if months > 1 else ''} {remaining_days} day{'s' if remaining_days > 1 else ''}"
            else:
                return f"{days} day{'s' if days > 1 else ''}"
        return 'Not set'
    get_subscription_duration.short_description = 'Duration'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related(
            'owner__user', 'pricing_plan'
        )
    
    def mark_as_completed(self, request, queryset):
        """Mark selected payments as completed"""
        from django.utils import timezone
        updated = queryset.update(status='completed', payment_date=timezone.now())
        self.message_user(request, f'{updated} payments marked as completed.')
    mark_as_completed.short_description = "Mark selected payments as completed"
    
    def mark_as_failed(self, request, queryset):
        """Mark selected payments as failed"""
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} payments marked as failed.')
    mark_as_failed.short_description = "Mark selected payments as failed"
    
    def create_legacy_payment(self, request, queryset):
        """Create legacy payment records for old payments"""
        # This action would be used to create legacy payment records
        # Implementation would depend on specific requirements
        self.message_user(request, 'Legacy payment creation action triggered.')
    create_legacy_payment.short_description = "Create legacy payment records"
    
    def has_add_permission(self, request):
        """Allow adding payments manually for admin purposes"""
        return True
    
    def has_change_permission(self, request, obj=None):
        """Allow editing payments"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting payments (with caution)"""
        return True

@admin.register(ManualPaymentProof)
class ManualPaymentProofAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'get_tenant_name', 'get_unit_number', 'get_property_name', 
        'amount', 'verification_status', 'get_owner_name', 'uploaded_at', 'verified_at'
    ]
    list_filter = ['verification_status', 'uploaded_at', 'verified_at', 'unit__property__owner']
    search_fields = [
        'tenant__user__first_name', 'tenant__user__last_name', 'tenant__user__email',
        'unit__unit_number', 'unit__property__name', 'unit__property__owner__user__email'
    ]
    readonly_fields = [
        'id', 'uploaded_at', 'updated_at', 'verified_at', 'verified_by'
    ]
    fieldsets = (
        ('Payment Details', {
            'fields': ('tenant', 'unit', 'amount', 'payment_proof_image', 'description')
        }),
        ('Verification Details', {
            'fields': ('verification_status', 'verified_by', 'verification_notes', 'verified_at')
        }),
        ('Timestamps', {
            'fields': ('uploaded_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_tenant_name(self, obj):
        '''Display tenant name'''
        return f'{obj.tenant.user.first_name} {obj.tenant.user.last_name}'.strip() or obj.tenant.user.email
    get_tenant_name.short_description = 'Tenant'
    get_tenant_name.admin_order_field = 'tenant__user__first_name'
    
    def get_unit_number(self, obj):
        '''Display unit number'''
        return obj.unit.unit_number
    get_unit_number.short_description = 'Unit'
    get_unit_number.admin_order_field = 'unit__unit_number'
    
    def get_property_name(self, obj):
        '''Display property name'''
        return obj.unit.property.name
    get_property_name.short_description = 'Property'
    get_property_name.admin_order_field = 'unit__property__name'
    
    def get_owner_name(self, obj):
        '''Display owner name'''
        return f'{obj.unit.property.owner.user.first_name} {obj.unit.property.owner.user.last_name}'.strip() or obj.unit.property.owner.user.email
    get_owner_name.short_description = 'Owner'
    get_owner_name.admin_order_field = 'unit__property__owner__user__first_name'
    
    def has_add_permission(self, request):
        '''Only allow adding through API'''
        return False
    
    def has_change_permission(self, request, obj=None):
        '''Allow changing verification status'''
        return True
    
    def has_delete_permission(self, request, obj=None):
        '''Allow deleting payment proofs'''
        return True


@admin.register(OwnerPayout)
class OwnerPayoutAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'get_owner_name', 'get_payment_info', 'amount', 'status',
        'beneficiary_type', 'retry_count', 'initiated_at', 'completed_at'
    ]
    list_filter = [
        'status', 'beneficiary_type', 'initiated_at', 'completed_at'
    ]
    search_fields = [
        'owner__user__first_name', 'owner__user__last_name', 'owner__user__email',
        'cashfree_transfer_id', 'cashfree_utr', 'payment__id'
    ]
    readonly_fields = [
        'payment', 'owner', 'amount', 'cashfree_transfer_id', 'cashfree_reference_id',
        'cashfree_utr', 'cashfree_response', 'initiated_at', 'completed_at',
        'last_retry_at', 'next_retry_at'
    ]
    date_hierarchy = 'initiated_at'
    ordering = ['-initiated_at']
    
    fieldsets = (
        ('Payout Information', {
            'fields': ('payment', 'owner', 'amount', 'status', 'beneficiary_type')
        }),
        ('Cashfree Details', {
            'fields': ('cashfree_transfer_id', 'cashfree_reference_id', 'cashfree_utr', 'cashfree_response'),
            'classes': ('collapse',)
        }),
        ('Retry Information', {
            'fields': ('retry_count', 'max_retries', 'last_retry_at', 'next_retry_at', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('initiated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['retry_failed_payouts', 'check_payout_status']
    
    def get_owner_name(self, obj):
        """Display owner's full name"""
        return f"{obj.owner.user.first_name} {obj.owner.user.last_name}".strip() or obj.owner.user.email
    get_owner_name.short_description = 'Owner'
    get_owner_name.admin_order_field = 'owner__user__first_name'
    
    def get_payment_info(self, obj):
        """Display payment and unit information"""
        return f"Payment #{obj.payment.id} - Unit {obj.payment.unit.unit_number}"
    get_payment_info.short_description = 'Payment Info'
    get_payment_info.admin_order_field = 'payment__id'
    
    def retry_failed_payouts(self, request, queryset):
        """Manually retry selected failed payouts"""
        from core.services.cashfree_payout_service import CashfreePayoutService
        
        failed_payouts = queryset.filter(status__in=['failed', 'retry_scheduled'])
        success_count = 0
        
        for payout in failed_payouts:
            result = CashfreePayoutService.retry_failed_payout(payout.id)
            if result['success']:
                success_count += 1
        
        self.message_user(request, f'{success_count} out of {failed_payouts.count()} payouts retried successfully.')
    retry_failed_payouts.short_description = "Retry selected failed payouts"
    
    def check_payout_status(self, request, queryset):
        """Check status of selected payouts with Cashfree"""
        from core.services.cashfree_payout_service import CashfreePayoutService
        
        success_count = 0
        for payout in queryset:
            result = CashfreePayoutService.check_payout_status(payout.id)
            if result['success']:
                success_count += 1
        
        self.message_user(request, f'Status checked for {success_count} out of {queryset.count()} payouts.')
    check_payout_status.short_description = "Check status with Cashfree"
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related(
            'owner__user', 'payment__unit__property', 'payment__tenant__user'
        )
    
    def has_add_permission(self, request):
        """Don't allow manual creation - payouts are auto-generated"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Allow editing status and retry settings"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting payouts (with caution)"""
        return True
