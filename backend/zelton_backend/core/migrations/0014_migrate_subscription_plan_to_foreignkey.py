# Generated manually to properly migrate subscription_plan from CharField to ForeignKey

from django.db import migrations, models
import django.db.models.deletion


def migrate_subscription_plans_forward(apps, schema_editor):
    """Migrate existing owners with 'basic' subscription plan to Starter Plan"""
    Owner = apps.get_model('core', 'Owner')
    PricingPlan = apps.get_model('core', 'PricingPlan')
    
    # Get the Starter Plan (or create it if it doesn't exist)
    starter_plan, created = PricingPlan.objects.get_or_create(
        name='Starter Plan',
        defaults={
            'min_properties': 1,
            'max_properties': 20,
            'monthly_price': 2000.00,
            'yearly_price': 22000.00,
            'features': [
                'Up to 20 properties',
                'Basic property management',
                'Tenant management',
                'Payment tracking',
                'Email support'
            ],
            'is_active': True
        }
    )
    
    # Update all owners with 'basic' subscription_plan to Starter Plan
    owners_updated = Owner.objects.filter(subscription_plan='basic').update(
        subscription_plan_new=starter_plan
    )
    
    print(f"Updated {owners_updated} owners from 'basic' to Starter Plan")


def migrate_subscription_plans_reverse(apps, schema_editor):
    """Reverse migration - set subscription_plan back to 'basic'"""
    Owner = apps.get_model('core', 'Owner')
    Owner.objects.all().update(subscription_plan='basic')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_tenantdocument'),
    ]

    operations = [
        # Step 1: Add new ForeignKey field
        migrations.AddField(
            model_name='owner',
            name='subscription_plan_new',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subscribed_owners', to='core.pricingplan'),
        ),
        
        # Step 2: Migrate the data
        migrations.RunPython(migrate_subscription_plans_forward, migrate_subscription_plans_reverse),
        
        # Step 3: Remove old field
        migrations.RemoveField(
            model_name='owner',
            name='subscription_plan',
        ),
        
        # Step 4: Rename new field to original name
        migrations.RenameField(
            model_name='owner',
            old_name='subscription_plan_new',
            new_name='subscription_plan',
        ),
    ]
