from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Owner, OwnerSubscriptionPayment, PricingPlan
from core.payment_utils import create_owner_payment_record
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process subscription renewals and check for expired subscriptions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making actual changes',
        )
        parser.add_argument(
            '--days-before-expiry',
            type=int,
            default=7,
            help='Days before expiry to send renewal reminders (default: 7)',
        )
        parser.add_argument(
            '--check-expired-only',
            action='store_true',
            help='Only check for expired subscriptions, skip renewal creation',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        days_before = options['days_before_expiry']
        check_expired_only = options['check_expired_only']
        
        self.stdout.write(f"Processing subscription renewals (dry_run={dry_run})")
        
        # Check for expired subscriptions
        expired_count = self.handle_expired_subscriptions(dry_run)
        
        # Check for subscriptions expiring soon (unless only checking expired)
        expiring_count = 0
        if not check_expired_only:
            expiring_count = self.handle_expiring_subscriptions(dry_run, days_before)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Renewal processing completed! '
                f'Expired: {expired_count}, Expiring soon: {expiring_count}'
            )
        )

    def handle_expired_subscriptions(self, dry_run):
        """Handle subscriptions that have expired"""
        today = timezone.now().date()
        
        expired_owners = Owner.objects.filter(
            subscription_status='active',
            subscription_end_date__lt=today
        )
        
        count = 0
        for owner in expired_owners:
            self.stdout.write(f"Owner {owner.id} ({owner.user.email}) subscription expired on {owner.subscription_end_date}")
            
            if not dry_run:
                # Mark subscription as expired
                owner.subscription_status = 'expired'
                owner.save()
                
                # Log the expiration
                logger.warning(f"Subscription expired for owner {owner.id} ({owner.user.email})")
            
            count += 1
        
        if count == 0:
            self.stdout.write("No expired subscriptions found")
        
        return count

    def handle_expiring_subscriptions(self, dry_run, days_before):
        """Handle subscriptions expiring soon and create renewal payments"""
        today = timezone.now().date()
        expiry_threshold = today + timedelta(days=days_before)
        
        expiring_owners = Owner.objects.filter(
            subscription_status='active',
            subscription_end_date__lte=expiry_threshold,
            subscription_end_date__gt=today
        )
        
        count = 0
        for owner in expiring_owners:
            if not owner.subscription_plan:
                self.stdout.write(f"Owner {owner.id} has no subscription plan, skipping")
                continue
                
            self.stdout.write(f"Owner {owner.id} ({owner.user.email}) subscription expiring on {owner.subscription_end_date}")
            
            # Check if renewal payment already exists
            existing_renewal = OwnerSubscriptionPayment.objects.filter(
                owner=owner,
                payment_type='renewal',
                status='pending'
            ).first()
            
            if existing_renewal:
                self.stdout.write(f"  Renewal payment already exists: {existing_renewal.id}")
                continue
            
            if not dry_run:
                # Create renewal payment
                self.create_renewal_payment(owner)
            
            count += 1
        
        if count == 0:
            self.stdout.write("No subscriptions expiring soon")
        
        return count

    def create_renewal_payment(self, owner):
        """Create a renewal payment for the owner"""
        pricing_plan = owner.subscription_plan
        
        # Determine subscription period based on current subscription duration
        period = self.determine_subscription_period(owner)
        
        # Calculate amount based on period
        if period == 'yearly':
            base_amount = pricing_plan.yearly_price
        else:
            base_amount = pricing_plan.monthly_price
        
        # Calculate total amount with GST
        base_decimal = Decimal(str(base_amount))
        gst_amount = (base_decimal * Decimal('0.18')).quantize(Decimal('0.01'))
        total_amount = (base_decimal + gst_amount).quantize(Decimal('0.01'))
        
        # Calculate due date (next billing cycle)
        today = timezone.now().date()
        if period == 'yearly':
            due_date = today + timedelta(days=365)
        else:
            due_date = today + timedelta(days=30)
        
        # Create renewal payment
        renewal_payment = OwnerSubscriptionPayment.objects.create(
            owner=owner,
            pricing_plan=pricing_plan,
            amount=total_amount,
            payment_type='renewal',
            status='pending',
            due_date=due_date,
            subscription_period=period,
            description=f"Subscription renewal for {pricing_plan.name} ({period})"
        )
        
        self.stdout.write(f"  Created renewal payment: {renewal_payment.id} (₹{total_amount})")
        logger.info(f"Created renewal payment {renewal_payment.id} for owner {owner.id} ({owner.user.email})")
        
        return renewal_payment

    def determine_subscription_period(self, owner):
        """Determine if the current subscription is monthly or yearly"""
        if not owner.subscription_start_date or not owner.subscription_end_date:
            # Default to monthly if we can't determine
            return 'monthly'
        
        duration = owner.subscription_end_date - owner.subscription_start_date
        
        # If duration is more than 10 months, consider it yearly
        if duration.days >= 300:
            return 'yearly'
        else:
            return 'monthly'
