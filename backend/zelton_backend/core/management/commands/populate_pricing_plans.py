from django.core.management.base import BaseCommand
from core.models import PricingPlan
from decimal import Decimal


class Command(BaseCommand):
    help = 'Populate pricing plans in the database'

    def handle(self, *args, **options):
        # Clear existing pricing plans
        PricingPlan.objects.all().delete()
        self.stdout.write('Cleared existing pricing plans...')

        # Define pricing plans based on units (not properties)
        pricing_plans = [
            {
                'name': '1-20 Houses',
                'min_units': 1,
                'max_units': 20,
                'monthly_price': Decimal('2000.00'),
                'yearly_price': Decimal('22000.00'),
                'features': [
                    'Up to 20 houses',
                    'Perfect for small to medium property owners',
                    'Basic property management',
                    'Tenant management',
                    'Payment tracking',
                    'Email support'
                ]
            },
            {
                'name': '21-40 Houses',
                'min_units': 21,
                'max_units': 40,
                'monthly_price': Decimal('4000.00'),
                'yearly_price': Decimal('44000.00'),
                'features': [
                    'Up to 40 houses',
                    'For growing property businesses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Priority support'
                ]
            },
            {
                'name': '41-60 Houses',
                'min_units': 41,
                'max_units': 60,
                'monthly_price': Decimal('6000.00'),
                'yearly_price': Decimal('66000.00'),
                'features': [
                    'Up to 60 houses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'Priority support'
                ]
            },
            {
                'name': '61-80 Houses',
                'min_units': 61,
                'max_units': 80,
                'monthly_price': Decimal('8000.00'),
                'yearly_price': Decimal('88000.00'),
                'features': [
                    'Up to 80 houses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'API access',
                    'Priority support'
                ]
            },
            {
                'name': '81-100 Houses',
                'min_units': 81,
                'max_units': 100,
                'monthly_price': Decimal('10000.00'),
                'yearly_price': Decimal('110000.00'),
                'features': [
                    'Up to 100 houses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'API access',
                    'Custom integrations',
                    'Priority support'
                ]
            },
            {
                'name': '101-120 Houses',
                'min_units': 101,
                'max_units': 120,
                'monthly_price': Decimal('12000.00'),
                'yearly_price': Decimal('132000.00'),
                'features': [
                    'Up to 120 houses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'API access',
                    'Custom integrations',
                    'Dedicated account manager',
                    'Priority support'
                ]
            },
            {
                'name': '121+ Houses',
                'min_units': 121,
                'max_units': 999999,  # Unlimited
                'monthly_price': Decimal('14000.00'),
                'yearly_price': Decimal('154000.00'),
                'features': [
                    'Unlimited houses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'API access',
                    'Custom integrations',
                    'Dedicated account manager',
                    'White-label options',
                    'Priority support'
                ]
            }
        ]

        # Create pricing plans
        created_count = 0
        for plan_data in pricing_plans:
            plan, created = PricingPlan.objects.get_or_create(
                name=plan_data['name'],
                defaults=plan_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created: {plan.name} - {plan.min_units}-{plan.max_units} units')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Already exists: {plan.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully created {created_count} pricing plans!')
        )
        
        # Display summary
        self.stdout.write('\nPricing Plans Summary:')
        self.stdout.write('=' * 50)
        for plan in PricingPlan.objects.all().order_by('min_units'):
            savings = plan.monthly_price * 12 - plan.yearly_price
            self.stdout.write(
                f'{plan.name}: {plan.min_units}-{plan.max_units} units'
            )
            self.stdout.write(f'  Monthly: Rs.{plan.monthly_price}')
            self.stdout.write(f'  Yearly: Rs.{plan.yearly_price} (Save Rs.{savings})')
            self.stdout.write('')