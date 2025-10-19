import time
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from core.models import PaymentTransaction, Payment, OwnerSubscriptionPayment
from core.services.phonepe_service import PhonePeService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Reconcile pending payments according to PhonePe schedule'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making actual changes',
        )
        parser.add_argument(
            '--max-age-seconds',
            type=int,
            default=20,
            help='Minimum age in seconds before reconciliation starts (default: 20)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        max_age_seconds = options['max_age_seconds']
        
        self.stdout.write(f"Starting payment reconciliation (dry_run={dry_run})")
        
        # Find all pending transactions older than max_age_seconds
        cutoff_time = timezone.now() - timezone.timedelta(seconds=max_age_seconds)
        
        pending_transactions = PaymentTransaction.objects.filter(
            status='initiated',
            reconciliation_status__in=['not_started', 'in_progress'],
            created_at__lt=cutoff_time
        ).exclude(merchant_order_id__isnull=True)
        
        self.stdout.write(f"Found {pending_transactions.count()} pending transactions to reconcile")
        
        for transaction in pending_transactions:
            self.reconcile_transaction(transaction, dry_run)
        
        self.stdout.write(self.style.SUCCESS('Payment reconciliation completed'))

    def reconcile_transaction(self, transaction, dry_run):
        """Reconcile a single transaction according to PhonePe schedule"""
        merchant_order_id = transaction.merchant_order_id
        
        if not merchant_order_id:
            self.stdout.write(f"Skipping transaction {transaction.id} - no merchant_order_id")
            return
        
        # Calculate reconciliation interval based on PhonePe schedule
        age_seconds = (timezone.now() - transaction.created_at).total_seconds()
        
        if age_seconds < 20:
            # Too early to start reconciliation
            return
        
        # Determine reconciliation interval based on age
        if age_seconds <= 50:  # First 30 seconds after 20 seconds
            interval_seconds = 3
        elif age_seconds <= 110:  # Next 60 seconds
            interval_seconds = 6
        elif age_seconds <= 170:  # Next 60 seconds
            interval_seconds = 10
        elif age_seconds <= 230:  # Next 60 seconds
            interval_seconds = 30
        else:
            interval_seconds = 60  # Every minute thereafter
        
        # Check if enough time has passed since last attempt
        last_attempt_time = transaction.updated_at
        time_since_last_attempt = (timezone.now() - last_attempt_time).total_seconds()
        
        if time_since_last_attempt < interval_seconds:
            return  # Not time for next attempt yet
        
        self.stdout.write(f"Reconciling transaction {transaction.id} (attempt {transaction.payment_attempt_count + 1})")
        
        if dry_run:
            self.stdout.write(f"DRY RUN: Would reconcile transaction {transaction.id}")
            return
        
        try:
            # Update attempt count
            transaction.payment_attempt_count += 1
            transaction.reconciliation_status = 'in_progress'
            transaction.save()
            
            # Check payment status with PhonePe
            phonepe_response = PhonePeService.verify_payment_status(merchant_order_id)
            
            if not phonepe_response['success']:
                self.stdout.write(f"Error checking status for {merchant_order_id}: {phonepe_response['error']}")
                return
            
            state = phonepe_response['state']
            
            if state == 'COMPLETED':
                # Payment completed
                result = PhonePeService.handle_payment_completed(merchant_order_id)
                if result['success']:
                    transaction.status = 'success'
                    transaction.reconciliation_status = 'completed'
                    transaction.save()
                    self.stdout.write(f"Payment {merchant_order_id} completed successfully")
                else:
                    self.stdout.write(f"Error handling completed payment: {result['error']}")
            
            elif state == 'FAILED':
                # Payment failed
                result = PhonePeService.handle_payment_failed(merchant_order_id)
                if result['success']:
                    transaction.status = 'failed'
                    transaction.reconciliation_status = 'completed'
                    transaction.save()
                    self.stdout.write(f"Payment {merchant_order_id} failed")
                else:
                    self.stdout.write(f"Error handling failed payment: {result['error']}")
            
            elif state == 'PENDING':
                # Still pending, continue reconciliation
                self.stdout.write(f"Payment {merchant_order_id} still pending")
            
            else:
                self.stdout.write(f"Unknown payment state for {merchant_order_id}: {state}")
                
        except Exception as e:
            self.stdout.write(f"Error reconciling transaction {transaction.id}: {str(e)}")
            logger.error(f"Error reconciling transaction {transaction.id}: {str(e)}")


