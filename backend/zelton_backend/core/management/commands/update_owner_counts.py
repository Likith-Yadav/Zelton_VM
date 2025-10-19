from django.core.management.base import BaseCommand
from core.models import Owner, Property, Unit


class Command(BaseCommand):
    help = 'Update owner property and unit counts'

    def handle(self, *args, **options):
        self.stdout.write('Updating owner property and unit counts...')
        
        # Update all owners
        for owner in Owner.objects.all():
            # Update property count
            property_count = Property.objects.filter(owner=owner).count()
            owner.total_properties = property_count
            
            # Update unit counts
            units = Unit.objects.filter(property__owner=owner)
            total_units = units.count()
            occupied_units = units.filter(status='occupied').count()
            
            # Update property unit counts
            for property_obj in owner.properties.all():
                property_units = units.filter(property=property_obj)
                property_obj.total_units = property_units.count()
                property_obj.occupied_units = property_units.filter(status='occupied').count()
                property_obj.save(update_fields=['total_units', 'occupied_units'])
            
            owner.save(update_fields=['total_properties'])
            
            self.stdout.write(
                f'Updated {owner.user.email}: {property_count} properties, {total_units} units, {occupied_units} occupied'
            )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully updated all owner counts!')
        )
