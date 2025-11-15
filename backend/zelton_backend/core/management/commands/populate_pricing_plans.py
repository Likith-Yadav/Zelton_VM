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
                'name': '1-10 Houses',
                'min_units': 1,
                'max_units': 10,
                'monthly_price': Decimal('2500.00'),
                'yearly_price': Decimal('27500.00'),
                'features': [
                    'Up to 10 houses',
                    'Perfect for small property owners',
                    'Basic property management',
                    'Tenant management',
                    'Payment tracking',
                    'Email support'
                ]
            },
            {
                'name': '11-20 Houses',
                'min_units': 11,
                'max_units': 20,
                'monthly_price': Decimal('5000.00'),
                'yearly_price': Decimal('55000.00'),
                'features': [
                    'Up to 20 houses',
                    'For growing property businesses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Priority support'
                ]
            },
            {
                'name': '21-30 Houses',
                'min_units': 21,
                'max_units': 30,
                'monthly_price': Decimal('7500.00'),
                'yearly_price': Decimal('82500.00'),
                'features': [
                    'Up to 30 houses',
                    'Advanced property management',
                    'Tenant management',
                    'Payment tracking',
                    'Analytics dashboard',
                    'Automated reports',
                    'Priority support'
                ]
            },
            {
                'name': '31-40 Houses',
                'min_units': 31,
                'max_units': 40,
                'monthly_price': Decimal('10000.00'),
                'yearly_price': Decimal('110000.00'),
                'features': [
                    'Up to 40 houses',
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
                'name': '41-50 Houses',
                'min_units': 41,
                'max_units': 50,
                'monthly_price': Decimal('12500.00'),
                'yearly_price': Decimal('137500.00'),
                'features': [
                    'Up to 50 houses',
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
                'name': '51-60 Houses',
                'min_units': 51,
                'max_units': 60,
                'monthly_price': Decimal('15000.00'),
                'yearly_price': Decimal('165000.00'),
                'features': [
                    'Up to 60 houses',
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
                'name': '61-70 Houses',
                'min_units': 61,
                'max_units': 70,
                'monthly_price': Decimal('17500.00'),
                'yearly_price': Decimal('192500.00'),
                'features': [
                    'Up to 70 houses',
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
                'name': '71-80 Houses',
                'min_units': 71,
                'max_units': 80,
                'monthly_price': Decimal('20000.00'),
                'yearly_price': Decimal('220000.00'),
                'features': [
                    'Up to 80 houses',
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
                'name': '81-90 Houses',
                'min_units': 81,
                'max_units': 90,
                'monthly_price': Decimal('22500.00'),
                'yearly_price': Decimal('247500.00'),
                'features': [
                    'Up to 90 houses',
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
                'name': '91-100 Houses',
                'min_units': 91,
                'max_units': 100,
                'monthly_price': Decimal('25000.00'),
                'yearly_price': Decimal('275000.00'),
                'features': [
                    'Up to 100 houses',
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
                'name': '101-110 Houses',
                'min_units': 101,
                'max_units': 110,
                'monthly_price': Decimal('27500.00'),
                'yearly_price': Decimal('302500.00'),
                'features': [
                    'Up to 110 houses',
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
                'name': '111-120 Houses',
                'min_units': 111,
                'max_units': 120,
                'monthly_price': Decimal('30000.00'),
                'yearly_price': Decimal('330000.00'),
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
                'monthly_price': Decimal('32500.00'),
                'yearly_price': Decimal('357500.00'),
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