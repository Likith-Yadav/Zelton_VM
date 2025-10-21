from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Unit, Property, Owner, TenantKey, Payment, OwnerSubscriptionPayment


@receiver(post_save, sender=Unit)
def handle_unit_creation_and_updates(sender, instance, created, **kwargs):
    """Handle unit creation and updates"""
    if created:
        # Create tenant key for new unit
        TenantKey.objects.create(
            property=instance.property,
            unit=instance
        )
        print(f"Created tenant key for new unit: {instance.unit_number}")
        
        # Additional security check: Verify owner can still add units
        owner = instance.property.owner
        if not owner.can_add_unit:
            # This should not happen if the API validation is working correctly
            # But we'll log it as a security concern
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"SECURITY ALERT: Unit {instance.id} created for owner {owner.id} "
                f"who has reached their limit ({owner.calculated_total_units}/{owner.max_units_allowed})"
            )
    
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


@receiver(post_save, sender=OwnerSubscriptionPayment)
def handle_subscription_payment_completion(sender, instance, created, **kwargs):
    """Handle subscription payment completion and update owner limits"""
    if not created and instance.status == 'completed':
        # Update owner's subscription plan
        owner = instance.owner
        owner.subscription_plan = instance.pricing_plan
        owner.subscription_status = 'active'
        owner.subscription_start_date = instance.subscription_start_date
        owner.subscription_end_date = instance.subscription_end_date
        owner.save()
        
        # Log the upgrade for audit purposes
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            f"Subscription updated for owner {owner.id}: "
            f"Plan changed to {instance.pricing_plan.name} "
            f"(max units: {instance.pricing_plan.max_units})"
        )
