from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import OwnerPayout
from core.services.cashfree_payout_service import CashfreePayoutService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process scheduled payout retries'
    
    def handle(self, *args, **options):
        now = timezone.now()
        
        # Get payouts scheduled for retry
        scheduled_payouts = OwnerPayout.objects.filter(
            status='retry_scheduled',
            next_retry_at__lte=now
        )
        
        self.stdout.write(f"Found {scheduled_payouts.count()} payouts to retry")
        
        for payout in scheduled_payouts:
            self.stdout.write(f"Retrying payout {payout.id}...")
            result = CashfreePayoutService.retry_failed_payout(payout.id)
            
            if result['success']:
                self.stdout.write(self.style.SUCCESS(f"Payout {payout.id} retry successful"))
            else:
                self.stdout.write(self.style.ERROR(f"Payout {payout.id} retry failed: {result['error']}"))

