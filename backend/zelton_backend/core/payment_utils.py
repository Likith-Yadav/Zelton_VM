"""
Utility functions for handling owner payments gracefully.
This module provides functions to handle old payments without errors.
"""

from django.utils import timezone
from django.db import transaction
from .models import OwnerPayment, Owner, PricingPlan
import logging

logger = logging.getLogger(__name__)


def create_owner_payment_record(owner, pricing_plan, amount, payment_type='subscription', **kwargs):
    """
    Create a new owner payment record with error handling.
    
    Args:
        owner: Owner instance
        pricing_plan: PricingPlan instance
        amount: Payment amount
        payment_type: Type of payment (subscription, upgrade, renewal, legacy)
        **kwargs: Additional payment data
    
    Returns:
        OwnerPayment instance or None if creation failed
    """
    try:
        with transaction.atomic():
            payment_data = {
                'owner': owner,
                'pricing_plan': pricing_plan,
                'amount': amount,
                'payment_type': payment_type,
                'status': kwargs.get('status', 'pending'),
                'payment_method': kwargs.get('payment_method', 'phonepe'),
                'payment_date': kwargs.get('payment_date'),
                'due_date': kwargs.get('due_date'),
                'subscription_start_date': kwargs.get('subscription_start_date'),
                'subscription_end_date': kwargs.get('subscription_end_date'),
                'merchant_order_id': kwargs.get('merchant_order_id'),
                'phonepe_order_id': kwargs.get('phonepe_order_id'),
                'phonepe_transaction_id': kwargs.get('phonepe_transaction_id'),
                'payment_gateway_response': kwargs.get('payment_gateway_response', {}),
                'description': kwargs.get('description', ''),
                'invoice_number': kwargs.get('invoice_number', ''),
                'receipt_number': kwargs.get('receipt_number', ''),
            }
            
            # Remove None values
            payment_data = {k: v for k, v in payment_data.items() if v is not None}
            
            payment = OwnerPayment.objects.create(**payment_data)
            logger.info(f"Created payment record {payment.id} for owner {owner.id}")
            return payment
            
    except Exception as e:
        logger.error(f"Failed to create payment record for owner {owner.id}: {str(e)}")
        return None


def handle_legacy_payment(owner, amount, description="Legacy payment", **kwargs):
    """
    Handle legacy payments gracefully without errors.
    
    Args:
        owner: Owner instance
        amount: Payment amount
        description: Description of the legacy payment
        **kwargs: Additional payment data
    
    Returns:
        OwnerPayment instance or None if creation failed
    """
    try:
        return OwnerPayment.create_legacy_payment(
            owner=owner,
            amount=amount,
            payment_date=kwargs.get('payment_date', timezone.now()),
            description=description,
            **kwargs
        )
    except Exception as e:
        logger.error(f"Failed to handle legacy payment for owner {owner.id}: {str(e)}")
        return None


def get_owner_payment_history(owner, include_legacy=True):
    """
    Get comprehensive payment history for an owner.
    
    Args:
        owner: Owner instance
        include_legacy: Whether to include legacy payments
    
    Returns:
        QuerySet of OwnerPayment records
    """
    try:
        queryset = OwnerPayment.objects.filter(owner=owner)
        
        if not include_legacy:
            queryset = queryset.filter(is_legacy_payment=False)
        
        return queryset.order_by('-created_at')
        
    except Exception as e:
        logger.error(f"Failed to get payment history for owner {owner.id}: {str(e)}")
        return OwnerPayment.objects.none()


def get_owner_total_paid(owner, include_legacy=True):
    """
    Get total amount paid by an owner.
    
    Args:
        owner: Owner instance
        include_legacy: Whether to include legacy payments
    
    Returns:
        Total amount paid
    """
    try:
        queryset = OwnerPayment.objects.filter(
            owner=owner,
            status='completed'
        )
        
        if not include_legacy:
            queryset = queryset.filter(is_legacy_payment=False)
        
        from django.db.models import Sum
        total = queryset.aggregate(total=Sum('amount'))['total'] or 0
        return total
        
    except Exception as e:
        logger.error(f"Failed to get total paid for owner {owner.id}: {str(e)}")
        return 0


def update_payment_status(payment_id, status, **kwargs):
    """
    Update payment status with error handling.
    
    Args:
        payment_id: Payment ID
        status: New status
        **kwargs: Additional fields to update
    
    Returns:
        Updated OwnerPayment instance or None if update failed
    """
    try:
        with transaction.atomic():
            payment = OwnerPayment.objects.get(id=payment_id)
            
            update_data = {'status': status}
            update_data.update(kwargs)
            
            for field, value in update_data.items():
                if hasattr(payment, field):
                    setattr(payment, field, value)
            
            payment.save()
            logger.info(f"Updated payment {payment_id} status to {status}")
            return payment
            
    except OwnerPayment.DoesNotExist:
        logger.error(f"Payment {payment_id} not found")
        return None
    except Exception as e:
        logger.error(f"Failed to update payment {payment_id}: {str(e)}")
        return None


def migrate_old_payments_safely():
    """
    Safely migrate old payments to the new system.
    This function handles errors gracefully and logs issues.
    
    Returns:
        Dictionary with migration results
    """
    try:
        results = {
            'migrated_count': 0,
            'legacy_count': 0,
            'errors': []
        }
        
        # Migrate existing subscription payments
        migrated_count = OwnerPayment.migrate_old_subscription_payments()
        results['migrated_count'] = migrated_count
        
        # Create legacy payments for owners with active subscriptions but no payment records
        owners_with_subscriptions = Owner.objects.filter(
            subscription_plan__isnull=False,
            subscription_status='active'
        ).exclude(
            all_payments__isnull=False
        )
        
        legacy_count = 0
        for owner in owners_with_subscriptions:
            try:
                if owner.subscription_plan:
                    amount = owner.subscription_plan.monthly_price
                    legacy_payment = OwnerPayment.create_legacy_payment(
                        owner=owner,
                        amount=amount,
                        payment_date=owner.subscription_start_date or timezone.now(),
                        description=f"Legacy payment for {owner.subscription_plan.name} plan",
                        pricing_plan=owner.subscription_plan,
                        payment_type='legacy',
                        status='completed'
                    )
                    if legacy_payment:
                        legacy_count += 1
            except Exception as e:
                error_msg = f"Failed to create legacy payment for owner {owner.id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
        
        results['legacy_count'] = legacy_count
        
        return results
        
    except Exception as e:
        error_msg = f"Failed to migrate old payments: {str(e)}"
        logger.error(error_msg)
        results['errors'].append(error_msg)
        return results


def validate_payment_data(owner, pricing_plan, amount, **kwargs):
    """
    Validate payment data before creating a payment record.
    
    Args:
        owner: Owner instance
        pricing_plan: PricingPlan instance
        amount: Payment amount
        **kwargs: Additional payment data
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Validate owner
        if not owner or not isinstance(owner, Owner):
            return False, "Invalid owner"
        
        # Validate pricing plan
        if not pricing_plan or not isinstance(pricing_plan, PricingPlan):
            return False, "Invalid pricing plan"
        
        # Validate amount
        if not amount or amount <= 0:
            return False, "Invalid amount"
        
        # Validate payment type
        valid_payment_types = ['subscription', 'upgrade', 'renewal', 'legacy']
        payment_type = kwargs.get('payment_type', 'subscription')
        if payment_type not in valid_payment_types:
            return False, f"Invalid payment type. Must be one of: {valid_payment_types}"
        
        # Validate status
        valid_statuses = ['pending', 'completed', 'failed', 'cancelled', 'refunded']
        status = kwargs.get('status', 'pending')
        if status not in valid_statuses:
            return False, f"Invalid status. Must be one of: {valid_statuses}"
        
        return True, None
        
    except Exception as e:
        logger.error(f"Payment validation error: {str(e)}")
        return False, f"Validation error: {str(e)}"
