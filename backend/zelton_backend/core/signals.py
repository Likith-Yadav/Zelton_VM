from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Unit, Property, Owner, TenantKey, Payment


@receiver(post_save, sender=Unit)
def handle_unit_creation_and_updates(sender, instance, created, **kwargs):
    """Handle unit creation and updates"""
    if created:
        # Create tenant key for new unit
        from django.utils import timezone
        TenantKey.objects.create(
            property=instance.property,
            unit=instance,
            expires_at=timezone.now() + timezone.timedelta(days=30)
        )
        print(f"Created tenant key for new unit: {instance.unit_number}")
    
    # Update property unit counts
    if instance.property:
        property_obj = instance.property
        property_obj.total_units = Unit.objects.filter(property=property_obj).count()
        property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
        property_obj.save(update_fields=['total_units', 'occupied_units'])


@receiver(post_delete, sender=Unit)
def update_property_unit_counts_on_delete(sender, instance, **kwargs):
    """Update property unit counts when a unit is deleted"""
    if instance.property:
        property_obj = instance.property
        property_obj.total_units = Unit.objects.filter(property=property_obj).count()
        property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
        property_obj.save(update_fields=['total_units', 'occupied_units'])


@receiver(post_save, sender=Property)
def update_owner_property_counts(sender, instance, created, **kwargs):
    """Update owner property counts when a property is created or updated"""
    if instance.owner:
        owner = instance.owner
        owner.total_properties = Property.objects.filter(owner=owner).count()
        owner.save(update_fields=['total_properties'])


@receiver(post_delete, sender=Property)
def update_owner_property_counts_on_delete(sender, instance, **kwargs):
    """Update owner property counts when a property is deleted"""
    if instance.owner:
        owner = instance.owner
        owner.total_properties = Property.objects.filter(owner=owner).count()
        owner.save(update_fields=['total_properties'])


@receiver(post_save, sender=TenantKey)
def update_unit_status_on_tenant_join(sender, instance, created, **kwargs):
    """Update unit status when tenant joins property"""
    if instance.is_used and instance.tenant and instance.unit:
        instance.unit.status = 'occupied'
        instance.unit.save(update_fields=['status'])
        
        # Update property occupied unit count
        property_obj = instance.property
        property_obj.occupied_units = Unit.objects.filter(property=property_obj, status='occupied').count()
        property_obj.save(update_fields=['occupied_units'])


@receiver(post_save, sender=Payment)
def update_unit_remaining_amount_on_payment(sender, instance, created, **kwargs):
    """Update unit remaining amount when payment status changes"""
    if instance.tenant and instance.unit:
        # Update the remaining amount for the unit
        instance.unit.update_remaining_amount(instance.tenant)
