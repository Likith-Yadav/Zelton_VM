from django.core.management.base import BaseCommand
from core.models import PricingPlan
from decimal import Decimal


class Command(BaseCommand):
    help = 'Populate pricing plans in the database'

    def handle(self, *args, **options):
        # Clear existing pricing plans
        PricingPlan.objects.all().delete()
        self.stdout.write('Cleared existing pricing plans...')

        # Define pricing plans based on the provided structure
        pricing_plans = [
            {
                'name': 'Starter Plan',
                'min_properties': 1,
                'max_properties': 20,
                'monthly_price': Decimal('2000.00'),
                'yearly_price': Decimal('22000.00'),
                'features': [
                    'Up to 20 properties',
                    'Basic property management',
                    'Tenant management',
                    'Payment tracking',
                    'Email support'
                ]
            },
            {
                'name': 'Growth Plan',
                'min_properties': 21,
                'max_properties': 40,
                'monthly_price': Decimal('4000.00'),
                'yearly_price': Decimal('44000.00'),
                'features': [
                    'Up to 40 properties',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Priority support'
                ]
            },
            {
                'name': 'Business Plan',
                'min_properties': 41,
                'max_properties': 60,
                'monthly_price': Decimal('6000.00'),
                'yearly_price': Decimal('66000.00'),
                'features': [
                    'Up to 60 properties',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'Priority support'
                ]
            },
            {
                'name': 'Enterprise Plan',
                'min_properties': 61,
                'max_properties': 80,
                'monthly_price': Decimal('8000.00'),
                'yearly_price': Decimal('88000.00'),
                'features': [
                    'Up to 80 properties',
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
                'name': 'Professional Plan',
                'min_properties': 81,
                'max_properties': 100,
                'monthly_price': Decimal('10000.00'),
                'yearly_price': Decimal('110000.00'),
                'features': [
                    'Up to 100 properties',
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
                'name': 'Premium Plan',
                'min_properties': 101,
                'max_properties': 120,
                'monthly_price': Decimal('12000.00'),
                'yearly_price': Decimal('132000.00'),
                'features': [
                    'Up to 120 properties',
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
                'name': 'Ultimate Plan',
                'min_properties': 121,
                'max_properties': 999999,  # Unlimited
                'monthly_price': Decimal('14000.00'),
                'yearly_price': Decimal('154000.00'),
                'features': [
                    'Unlimited properties',
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
                    self.style.SUCCESS(f'Created: {plan.name} - {plan.min_properties}-{plan.max_properties} properties')
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
        for plan in PricingPlan.objects.all().order_by('min_properties'):
            savings = plan.monthly_price * 12 - plan.yearly_price
            self.stdout.write(
                f'{plan.name}: {plan.min_properties}-{plan.max_properties} properties'
            )
            self.stdout.write(f'  Monthly: Rs.{plan.monthly_price}')
            self.stdout.write(f'  Yearly: Rs.{plan.yearly_price} (Save Rs.{savings})')
            self.stdout.write('')