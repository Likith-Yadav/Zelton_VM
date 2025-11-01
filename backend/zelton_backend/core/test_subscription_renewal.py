from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from core.models import User, Property, Unit, Tenant, TenantKey, Payment, Owner, PricingPlan, OwnerSubscriptionPayment
from core.management.commands.process_subscription_renewals import Command as RenewalCommand
from django.core.management import call_command
from io import StringIO


class SubscriptionRenewalTestCase(TestCase):
    def setUp(self):
        # Create test data
        self.owner_user = User.objects.create_user(
            username='owner@test.com',
            email='owner@test.com',
            password='testpass123',
            first_name='Owner',
            last_name='Test'
        )
        
        self.owner = Owner.objects.create(
            user=self.owner_user,
            phone='9876543210',
            address='Test Address',
            city='Test City',
            state='Test State',
            pincode='123456'
        )
        
        # Create pricing plans
        self.starter_plan = PricingPlan.objects.create(
            name='1-20 Houses',
            min_units=1,
            max_units=20,
            monthly_price=Decimal('2000.00'),
            yearly_price=Decimal('22000.00'),
            is_active=True
        )
        
        self.growth_plan = PricingPlan.objects.create(
            name='21-40 Houses',
            min_units=21,
            max_units=40,
            monthly_price=Decimal('4000.00'),
            yearly_price=Decimal('44000.00'),
            is_active=True
        )
        
        # Set up owner with active subscription
        self.owner.subscription_plan = self.starter_plan
        self.owner.subscription_status = 'active'
        self.owner.subscription_start_date = timezone.now() - timedelta(days=30)
        self.owner.subscription_end_date = timezone.now().date() + timedelta(days=5)  # Expires in 5 days
        self.owner.save()

    def test_subscription_expiration_properties(self):
        """Test the new subscription expiration properties"""
        # Test is_subscription_active
        self.assertTrue(self.owner.is_subscription_active)
        
        # Test days_until_expiry
        days_left = self.owner.days_until_expiry
        self.assertEqual(days_left, 5)
        
        # Test subscription_expiry_status
        status = self.owner.subscription_expiry_status
        self.assertEqual(status, 'expiring_soon')
        
        # Test expired subscription
        self.owner.subscription_end_date = timezone.now().date() - timedelta(days=1)
        self.owner.save()
        
        self.assertFalse(self.owner.is_subscription_active)
        self.assertTrue(self.owner.is_subscription_expired)
        self.assertEqual(self.owner.subscription_expiry_status, 'expired')

    def test_renewal_command_expired_subscriptions(self):
        """Test the renewal command handles expired subscriptions"""
        # Make subscription expired
        self.owner.subscription_end_date = timezone.now().date() - timedelta(days=1)
        self.owner.save()
        
        # Run the command
        out = StringIO()
        call_command('process_subscription_renewals', '--check-expired-only', stdout=out)
        
        # Check that subscription status was updated
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.subscription_status, 'expired')

    def test_renewal_command_expiring_subscriptions(self):
        """Test the renewal command creates renewal payments for expiring subscriptions"""
        # Run the command
        out = StringIO()
        call_command('process_subscription_renewals', '--days-before-expiry', '7', stdout=out)
        
        # Check that renewal payment was created
        renewal_payments = OwnerSubscriptionPayment.objects.filter(
            owner=self.owner,
            payment_type='renewal',
            status='pending'
        )
        
        self.assertEqual(renewal_payments.count(), 1)
        
        renewal_payment = renewal_payments.first()
        self.assertEqual(renewal_payment.pricing_plan, self.starter_plan)
        self.assertEqual(renewal_payment.subscription_period, 'monthly')

    def test_renewal_command_dry_run(self):
        """Test the renewal command dry run mode"""
        # Run the command in dry run mode
        out = StringIO()
        call_command('process_subscription_renewals', '--dry-run', stdout=out)
        
        # Check that no renewal payment was created
        renewal_payments = OwnerSubscriptionPayment.objects.filter(
            owner=self.owner,
            payment_type='renewal'
        )
        
        self.assertEqual(renewal_payments.count(), 0)
        
        # Check output contains dry run message
        output = out.getvalue()
        self.assertIn('dry_run=True', output)

    def test_renewal_command_no_duplicate_payments(self):
        """Test that renewal command doesn't create duplicate payments"""
        # Create an existing renewal payment
        OwnerSubscriptionPayment.objects.create(
            owner=self.owner,
            pricing_plan=self.starter_plan,
            amount=Decimal('2360.00'),  # 2000 + 18% GST
            payment_type='renewal',
            status='pending',
            subscription_period='monthly'
        )
        
        # Run the command
        out = StringIO()
        call_command('process_subscription_renewals', stdout=out)
        
        # Check that only one renewal payment exists
        renewal_payments = OwnerSubscriptionPayment.objects.filter(
            owner=self.owner,
            payment_type='renewal'
        )
        
        self.assertEqual(renewal_payments.count(), 1)

    def test_subscription_period_detection(self):
        """Test that the command correctly detects monthly vs yearly subscriptions"""
        # Test yearly subscription
        self.owner.subscription_start_date = timezone.now() - timedelta(days=300)
        self.owner.subscription_end_date = timezone.now().date() + timedelta(days=65)
        self.owner.save()
        
        # Run the command
        out = StringIO()
        call_command('process_subscription_renewals', stdout=out)
        
        # Check that yearly renewal payment was created
        renewal_payment = OwnerSubscriptionPayment.objects.filter(
            owner=self.owner,
            payment_type='renewal'
        ).first()
        
        self.assertEqual(renewal_payment.subscription_period, 'yearly')
        self.assertEqual(renewal_payment.amount, Decimal('51920.00'))  # 44000 + 18% GST


class DowngradePreventionTestCase(TestCase):
    def setUp(self):
        # Create test data
        self.owner_user = User.objects.create_user(
            username='owner@test.com',
            email='owner@test.com',
            password='testpass123',
            first_name='Owner',
            last_name='Test'
        )
        
        self.owner = Owner.objects.create(
            user=self.owner_user,
            phone='9876543210',
            address='Test Address',
            city='Test City',
            state='Test State',
            pincode='123456'
        )
        
        # Create pricing plans
        self.starter_plan = PricingPlan.objects.create(
            name='1-20 Houses',
            min_units=1,
            max_units=20,
            monthly_price=Decimal('2000.00'),
            yearly_price=Decimal('22000.00'),
            is_active=True
        )
        
        self.growth_plan = PricingPlan.objects.create(
            name='21-40 Houses',
            min_units=21,
            max_units=40,
            monthly_price=Decimal('4000.00'),
            yearly_price=Decimal('44000.00'),
            is_active=True
        )
        
        # Set up owner with growth plan
        self.owner.subscription_plan = self.growth_plan
        self.owner.subscription_status = 'active'
        self.owner.save()

    def test_downgrade_prevention_api(self):
        """Test that the API prevents downgrades"""
        from django.test import Client
        from django.contrib.auth import get_user_model
        
        client = Client()
        
        # Login the user
        client.force_login(self.owner_user)
        
        # Try to downgrade to starter plan
        response = client.post('/api/owner-subscriptions/initiate_payment/', {
            'pricing_plan_id': self.starter_plan.id,
            'period': 'monthly'
        })
        
        # Should return error
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertEqual(response_data['error'], 'Downgrade not allowed')
        self.assertIn('sales@zelton.in', response_data['message'])
        self.assertEqual(response_data['contact_email'], 'sales@zelton.in')

    def test_upgrade_allowed(self):
        """Test that upgrades are still allowed"""
        from django.test import Client
        
        client = Client()
        client.force_login(self.owner_user)
        
        # Try to upgrade to growth plan (same plan, should be allowed)
        response = client.post('/api/owner-subscriptions/initiate_payment/', {
            'pricing_plan_id': self.growth_plan.id,
            'period': 'monthly'
        })
        
        # Should not return downgrade error (might return other errors, but not downgrade)
        if response.status_code == 400:
            response_data = response.json()
            self.assertNotEqual(response_data.get('error'), 'Downgrade not allowed')

    def test_no_current_plan_allows_any_selection(self):
        """Test that owners without current plan can select any plan"""
        from django.test import Client
        
        # Remove current plan
        self.owner.subscription_plan = None
        self.owner.save()
        
        client = Client()
        client.force_login(self.owner_user)
        
        # Try to select starter plan
        response = client.post('/api/owner-subscriptions/initiate_payment/', {
            'pricing_plan_id': self.starter_plan.id,
            'period': 'monthly'
        })
        
        # Should not return downgrade error
        if response.status_code == 400:
            response_data = response.json()
            self.assertNotEqual(response_data.get('error'), 'Downgrade not allowed')
