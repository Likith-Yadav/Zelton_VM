# Generated manually to migrate PricingPlan from properties to units

from django.db import migrations, models


def migrate_pricing_plans_to_units(apps, schema_editor):
    """Migrate existing pricing plans to use units instead of properties"""
    PricingPlan = apps.get_model('core', 'PricingPlan')
    
    # Update existing plans to use units instead of properties
    # We'll keep the same limits but change the field names
    for plan in PricingPlan.objects.all():
        # Copy properties values to units values
        plan.min_units = plan.min_properties
        plan.max_units = plan.max_properties
        plan.save()
    
    print("Migrated all pricing plans to use units instead of properties")


def reverse_migrate_pricing_plans_to_properties(apps, schema_editor):
    """Reverse migration - copy units back to properties"""
    PricingPlan = apps.get_model('core', 'PricingPlan')
    
    for plan in PricingPlan.objects.all():
        plan.min_properties = plan.min_units
        plan.max_properties = plan.max_units
        plan.save()
    
    print("Reversed migration - copied units back to properties")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_migrate_subscription_plan_to_foreignkey'),
    ]

    operations = [
        # Step 1: Add new units fields
        migrations.AddField(
            model_name='pricingplan',
            name='min_units',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='pricingplan',
            name='max_units',
            field=models.IntegerField(default=20),
        ),
        
        # Step 2: Migrate data from properties to units
        migrations.RunPython(migrate_pricing_plans_to_units, reverse_migrate_pricing_plans_to_properties),
        
        # Step 3: Remove old properties fields
        migrations.RemoveField(
            model_name='pricingplan',
            name='min_properties',
        ),
        migrations.RemoveField(
            model_name='pricingplan',
            name='max_properties',
        ),
    ]

