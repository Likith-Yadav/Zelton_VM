from django.core.management.base import BaseCommand
from django.utils import timezone
from core.services.phonepe_service import PhonePeService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Reconcile pending refunds according to PhonePe schedule'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making actual changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(f"Starting refund reconciliation (dry_run={dry_run})")
        
        # Note: Refund reconciliation requires tracking refund IDs
        # This would typically be stored in a separate Refund model
        # For now, we'll implement the structure for future use
        
        # Find all pending refunds
        # pending_refunds = Refund.objects.filter(
        #     status__in=['PENDING', 'CONFIRMED'],
        #     created_at__lt=timezone.now() - timezone.timedelta(minutes=5)
        # )
        
        self.stdout.write("Refund reconciliation structure implemented")
        self.stdout.write("Note: Requires Refund model to be implemented for full functionality")
        
        # Example implementation structure:
        # for refund in pending_refunds:
        #     self.reconcile_refund(refund, dry_run)
        
        self.stdout.write(self.style.SUCCESS('Refund reconciliation completed'))

    def reconcile_refund(self, refund, dry_run):
        """Reconcile a single refund according to PhonePe schedule"""
        merchant_refund_id = refund.merchant_refund_id
        
        if not merchant_refund_id:
            self.stdout.write(f"Skipping refund {refund.id} - no merchant_refund_id")
            return
        
        self.stdout.write(f"Reconciling refund {refund.id} (merchant_refund_id: {merchant_refund_id})")
        
        if dry_run:
            self.stdout.write(f"DRY RUN: Would reconcile refund {refund.id}")
            return
        
        try:
            # Check refund status with PhonePe
            phonepe_response = PhonePeService.check_refund_status(merchant_refund_id)
            
            if not phonepe_response['success']:
                self.stdout.write(f"Error checking refund status for {merchant_refund_id}: {phonepe_response['error']}")
                return
            
            state = phonepe_response['state']
            
            if state == 'COMPLETED':
                # Refund completed
                refund.status = 'COMPLETED'
                refund.save()
                self.stdout.write(f"Refund {merchant_refund_id} completed successfully")
            
            elif state == 'FAILED':
                # Refund failed
                refund.status = 'FAILED'
                refund.save()
                self.stdout.write(f"Refund {merchant_refund_id} failed")
            
            elif state in ['PENDING', 'CONFIRMED']:
                # Still processing, continue reconciliation
                self.stdout.write(f"Refund {merchant_refund_id} still processing (state: {state})")
            
            else:
                self.stdout.write(f"Unknown refund state for {merchant_refund_id}: {state}")
                
        except Exception as e:
            self.stdout.write(f"Error reconciling refund {refund.id}: {str(e)}")
            logger.error(f"Error reconciling refund {refund.id}: {str(e)}")
