from django.contrib import admin
from .models import (
    Owner, Property, Unit, Tenant, TenantKey, Payment, Invoice,
    PaymentProof, PricingPlan, PaymentTransaction, PropertyImage, UnitImage,
    TenantDocument, OwnerSubscriptionPayment, OwnerPayment
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


@admin.register(OwnerSubscriptionPayment)
class OwnerSubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'get_owner_name', 'get_owner_email', 'get_pricing_plan_name', 
        'amount', 'subscription_period', 'status', 'payment_date', 'due_date',
        'get_subscription_duration', 'merchant_order_id', 'created_at'
    ]
    list_filter = [
        'status', 'subscription_period', 'payment_date', 'due_date', 
        'pricing_plan', 'created_at'
    ]
    search_fields = [
        'owner__user__first_name', 'owner__user__last_name', 'owner__user__email',
        'merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id'
    ]
    readonly_fields = [
        'merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id',
        'payment_gateway_response', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('owner', 'pricing_plan', 'amount', 'subscription_period', 'status')
        }),
        ('Payment Dates', {
            'fields': ('payment_date', 'due_date', 'subscription_start_date', 'subscription_end_date')
        }),
        ('Payment Gateway Details', {
            'fields': ('merchant_order_id', 'phonepe_order_id', 'phonepe_transaction_id', 'payment_gateway_response'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_owner_name(self, obj):
        """Display owner's full name"""
        return obj.owner.user.get_full_name() or obj.owner.user.username
    get_owner_name.short_description = 'Owner Name'
    get_owner_name.admin_order_field = 'owner__user__first_name'
    
    def get_owner_email(self, obj):
        """Display owner's email"""
        return obj.owner.user.email
    get_owner_email.short_description = 'Owner Email'
    get_owner_email.admin_order_field = 'owner__user__email'
    
    def get_pricing_plan_name(self, obj):
        """Display pricing plan name"""
        return obj.pricing_plan.name if obj.pricing_plan else 'No Plan'
    get_pricing_plan_name.short_description = 'Pricing Plan'
    get_pricing_plan_name.admin_order_field = 'pricing_plan__name'
    
    def get_subscription_duration(self, obj):
        """Display subscription duration"""
        if obj.subscription_start_date and obj.subscription_end_date:
            from django.utils import timezone
            duration = obj.subscription_end_date - obj.subscription_start_date
            days = duration.days
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
    
    def has_add_permission(self, request):
        """Allow adding payments manually for admin purposes"""
        return True
    
    def has_change_permission(self, request, obj=None):
        """Allow editing payments"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting payments (with caution)"""
        return True


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