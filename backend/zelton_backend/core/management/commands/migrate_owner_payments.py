from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import OwnerPayment, OwnerSubscriptionPayment, Owner
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate old owner payments to the new OwnerPayment model and handle legacy payments gracefully'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually doing it',
        )
        parser.add_argument(
            '--create-legacy',
            action='store_true',
            help='Create legacy payment records for owners without any payment history',
        )
        parser.add_argument(
            '--owner-id',
            type=int,
            help='Migrate payments for a specific owner ID only',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        create_legacy = options['create_legacy']
        owner_id = options['owner_id']

        self.stdout.write(
            self.style.SUCCESS('Starting owner payment migration...')
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )

        # Migrate existing OwnerSubscriptionPayment records
        migrated_count = self.migrate_subscription_payments(dry_run, owner_id)
        
        # Create legacy payment records if requested
        legacy_count = 0
        if create_legacy:
            legacy_count = self.create_legacy_payments(dry_run, owner_id)

        self.stdout.write(
            self.style.SUCCESS(
                f'Migration completed! Migrated {migrated_count} subscription payments, '
                f'created {legacy_count} legacy payment records.'
            )
        )

    def migrate_subscription_payments(self, dry_run=False, owner_id=None):
        """Migrate OwnerSubscriptionPayment records to OwnerPayment"""
        try:
            # Get existing subscription payments
            if owner_id:
                old_payments = OwnerSubscriptionPayment.objects.filter(owner_id=owner_id)
            else:
                old_payments = OwnerSubscriptionPayment.objects.all()

            migrated_count = 0
            skipped_count = 0

            for old_payment in old_payments:
                try:
                    # Check if already migrated
                    if OwnerPayment.objects.filter(
                        owner=old_payment.owner,
                        amount=old_payment.amount,
                        payment_date=old_payment.payment_date,
                        migrated_from='OwnerSubscriptionPayment'
                    ).exists():
                        skipped_count += 1
                        continue

                    if not dry_run:
                        # Create new payment record
                        OwnerPayment.objects.create(
                            owner=old_payment.owner,
                            pricing_plan=old_payment.pricing_plan,
                            amount=old_payment.amount,
                            payment_type='subscription',
                            payment_method='phonepe',
                            status=old_payment.status,
                            payment_date=old_payment.payment_date,
                            due_date=old_payment.due_date,
                            subscription_start_date=old_payment.subscription_start_date,
                            subscription_end_date=old_payment.subscription_end_date,
                            merchant_order_id=old_payment.merchant_order_id,
                            phonepe_order_id=old_payment.phonepe_order_id,
                            phonepe_transaction_id=old_payment.phonepe_transaction_id,
                            payment_gateway_response=old_payment.payment_gateway_response,
                            migrated_from='OwnerSubscriptionPayment',
                            description=f"Migrated from OwnerSubscriptionPayment ID: {old_payment.id}"
                        )

                    migrated_count += 1
                    self.stdout.write(
                        f'{"Would migrate" if dry_run else "Migrated"} payment {old_payment.id} '
                        f'for owner {old_payment.owner.user.email} - ₹{old_payment.amount}'
                    )

                except Exception as e:
                    logger.error(f"Failed to migrate payment {old_payment.id}: {str(e)}")
                    self.stdout.write(
                        self.style.ERROR(f'Failed to migrate payment {old_payment.id}: {str(e)}')
                    )
                    continue

            if skipped_count > 0:
                self.stdout.write(
                    self.style.WARNING(f'Skipped {skipped_count} already migrated payments')
                )

            return migrated_count

        except Exception as e:
            logger.error(f"Failed to migrate subscription payments: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f'Failed to migrate subscription payments: {str(e)}')
            )
            return 0

    def create_legacy_payments(self, dry_run=False, owner_id=None):
        """Create legacy payment records for owners without payment history"""
        try:
            # Get owners without any payment records
            if owner_id:
                owners_without_payments = Owner.objects.filter(
                    id=owner_id
                ).exclude(
                    all_payments__isnull=False
                )
            else:
                owners_without_payments = Owner.objects.exclude(
                    all_payments__isnull=False
                )

            legacy_count = 0

            for owner in owners_without_payments:
                try:
                    # Check if owner has a subscription plan (indicating they might have paid)
                    if owner.subscription_plan and owner.subscription_status == 'active':
                        # Create a legacy payment record
                        amount = owner.subscription_plan.monthly_price  # Default to monthly
                        
                        if not dry_run:
                            OwnerPayment.create_legacy_payment(
                                owner=owner,
                                amount=amount,
                                payment_date=owner.subscription_start_date or timezone.now(),
                                description=f"Legacy payment for {owner.subscription_plan.name} plan",
                                pricing_plan=owner.subscription_plan,
                                payment_type='legacy',
                                status='completed'
                            )

                        legacy_count += 1
                        self.stdout.write(
                            f'{"Would create" if dry_run else "Created"} legacy payment '
                            f'for owner {owner.user.email} - ₹{amount}'
                        )

                except Exception as e:
                    logger.error(f"Failed to create legacy payment for owner {owner.id}: {str(e)}")
                    self.stdout.write(
                        self.style.ERROR(f'Failed to create legacy payment for owner {owner.id}: {str(e)}')
                    )
                    continue

            return legacy_count

        except Exception as e:
            logger.error(f"Failed to create legacy payments: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f'Failed to create legacy payments: {str(e)}')
            )
            return 0
