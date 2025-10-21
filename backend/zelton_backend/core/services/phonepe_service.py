import uuid
import hashlib
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from phonepe.sdk.pg.payments.v2.standard_checkout_client import StandardCheckoutClient
from phonepe.sdk.pg.payments.v2.models.request.standard_checkout_pay_request import StandardCheckoutPayRequest
from phonepe.sdk.pg.common.models.request.meta_info import MetaInfo
from phonepe.sdk.pg.env import Env
from phonepe.sdk.pg.common.exceptions import PhonePeException

from core.models import Payment, OwnerSubscriptionPayment, PaymentTransaction
from decimal import Decimal

logger = logging.getLogger(__name__)


class PhonePeService:
    """PhonePe Payment Gateway Service"""
    
    _client = None
    
    @classmethod
    def reset_client(cls):
        """Reset client instance (for debugging)"""
        cls._client = None
        logger.info("PhonePe client reset")
    
    @classmethod
    def get_client(cls):
        """Get PhonePe client instance (singleton)"""
        if cls._client is None:
            try:
                env = Env.SANDBOX if settings.PHONEPE_ENVIRONMENT == 'SANDBOX' else Env.PRODUCTION
                logger.info(f"Initializing PhonePe client with ID: {settings.PHONEPE_CLIENT_ID}, Environment: {settings.PHONEPE_ENVIRONMENT}")
                cls._client = StandardCheckoutClient.get_instance(
                    client_id=settings.PHONEPE_CLIENT_ID,
                    client_secret=settings.PHONEPE_CLIENT_SECRET,
                    client_version=settings.PHONEPE_CLIENT_VERSION,
                    env=env,
                    should_publish_events=False
                )
                logger.info("PhonePe client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize PhonePe client: {str(e)}")
                raise
        return cls._client
    
    @classmethod
    def generate_merchant_order_id(cls, prefix="TXN"):
        """Generate unique merchant order ID"""
        timestamp = int(timezone.now().timestamp())
        unique_id = str(uuid.uuid4())[:8]
        return f"{prefix}_{timestamp}_{unique_id}"
    
    @classmethod
    def calculate_expiry_seconds(cls, minutes=30):
        """Calculate order expiry in seconds (min 300, max 3600)"""
        seconds = minutes * 60
        return max(300, min(3600, seconds))
    
    @classmethod
    def initiate_tenant_rent_payment(cls, tenant, unit, amount):
        """Initiate rent payment for tenant"""
        try:
            client = cls.get_client()
            merchant_order_id = cls.generate_merchant_order_id("RENT")
            
            # Convert amount to paise
            amount_paise = int(float(amount) * 100)
            
            # Create redirect URL - using mobile app deep link with orderId parameter
            redirect_url = f"ZeltonLivings://payment/callback?orderId={merchant_order_id}"
            
            # Create meta info
            meta_info = MetaInfo(
                udf1=f"tenant_{tenant.id}",
                udf2=f"unit_{unit.id}",
                udf3="rent_payment"
            )
            
            # Create payment request
            pay_request = StandardCheckoutPayRequest.build_request(
                merchant_order_id=merchant_order_id,
                amount=amount_paise,
                redirect_url=redirect_url,
                meta_info=meta_info
            )
            
            # Initiate payment
            response = client.pay(pay_request)
            
            logger.info(f"Rent payment initiated for tenant {tenant.id}, order {merchant_order_id}")
            
            return {
                'success': True,
                'merchant_order_id': merchant_order_id,
                'order_id': response.order_id,
                'redirect_url': response.redirect_url,
                'expire_at': response.expire_at,
                'state': response.state
            }
            
        except PhonePeException as e:
            logger.error(f"PhonePe error in rent payment initiation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'UNKNOWN')
            }
        except Exception as e:
            logger.error(f"Unexpected error in rent payment initiation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNEXPECTED_ERROR'
            }
    
    @classmethod
    def initiate_owner_subscription_payment(cls, owner, pricing_plan, period):
        """Initiate subscription payment for owner"""
        try:
            logger.info(f"Starting subscription payment for owner {owner.id}, plan {pricing_plan.name}, period {period}")
            client = cls.get_client()
            merchant_order_id = cls.generate_merchant_order_id("SUB")
            logger.info(f"Generated merchant order ID: {merchant_order_id}")
            
            # Calculate amount based on period
            if period == 'yearly':
                base_amount = pricing_plan.yearly_price
            else:
                base_amount = pricing_plan.monthly_price
            
            # Apply 18% GST
            try:
                base_decimal = Decimal(str(base_amount))
            except Exception:
                base_decimal = Decimal(base_amount)
            gst_amount = (base_decimal * Decimal('0.18')).quantize(Decimal('0.01'))
            total_amount = (base_decimal + gst_amount).quantize(Decimal('0.01'))
            
            # Convert amount to paise
            amount_paise = int(float(total_amount) * 100)
            logger.info(f"Payment amount: Base={base_decimal}, GST={gst_amount}, Total={total_amount}, Amount in paise={amount_paise}")
            
            # Create redirect URL - using mobile app deep link with orderId parameter
            redirect_url = f"ZeltonLivings://payment/callback?orderId={merchant_order_id}"
            logger.info(f"Redirect URL: {redirect_url}")
            
            # Create detailed breakdown in meta info
            plan_name = pricing_plan.name or f"{pricing_plan.plan_type.title()} Plan"
            
            # Create meta info with payment breakdown
            meta_info = MetaInfo(
                udf1=f"Plan: {plan_name} ({period.title()})",
                udf2=f"Base Amount: ₹{base_decimal}",
                udf3=f"GST (18%): ₹{gst_amount}",
                udf4=f"Total: ₹{total_amount}"
            )
            
            # Create payment request
            pay_request = StandardCheckoutPayRequest.build_request(
                merchant_order_id=merchant_order_id,
                amount=amount_paise,
                redirect_url=redirect_url,
                meta_info=meta_info
            )
            
            logger.info(f"Making PhonePe payment request for order {merchant_order_id}")
            # Initiate payment
            response = client.pay(pay_request)
            
            logger.info(f"Subscription payment initiated for owner {owner.id}, order {merchant_order_id}, PhonePe order ID: {response.order_id}")
            
            return {
                'success': True,
                'merchant_order_id': merchant_order_id,
                'order_id': response.order_id,
                'redirect_url': response.redirect_url,
                'expire_at': response.expire_at,
                'state': response.state
            }
            
        except PhonePeException as e:
            logger.error(f"PhonePe error in subscription payment initiation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'UNKNOWN')
            }
        except Exception as e:
            logger.error(f"Unexpected error in subscription payment initiation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNEXPECTED_ERROR'
            }
    
    @classmethod
    def verify_payment_status(cls, merchant_order_id, max_retries=3):
        """Check payment status via PhonePe SDK with retry logic"""
        import time
        
        for attempt in range(max_retries):
            try:
                client = cls.get_client()
                response = client.get_order_status(merchant_order_id, details=True)
                
                logger.info(f"Payment status checked for order {merchant_order_id}: {response.state}")
                
                return {
                    'success': True,
                    'state': response.state,
                    'amount': response.amount,
                    'order_id': response.order_id,
                    'expire_at': response.expire_at,
                    'payment_details': response.payment_details if hasattr(response, 'payment_details') else [],
                    'meta_info': response.meta_info if hasattr(response, 'meta_info') else None
                }
                
            except PhonePeException as e:
                error_code = getattr(e, 'code', 'UNKNOWN')
                
                # Handle rate limiting (429) with exponential backoff
                if error_code == 429 or 'Too Many Requests' in str(e):
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) + 1  # Exponential backoff: 2s, 4s, 8s
                        logger.warning(f"Rate limited, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"PhonePe rate limit exceeded after {max_retries} attempts: {str(e)}")
                        return {
                            'success': False,
                            'error': 'Rate limit exceeded. Please try again later.',
                            'error_code': 'RATE_LIMIT_EXCEEDED'
                        }
                
                # Handle other PhonePe errors
                logger.error(f"PhonePe error in payment verification: {str(e)}")
                return {
                    'success': False,
                    'error': str(e),
                    'error_code': error_code
                }
                
            except Exception as e:
                error_str = str(e)
                
                # Handle timeout errors with retry
                if 'timeout' in error_str.lower() or 'timed out' in error_str.lower():
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) + 1  # Exponential backoff
                        logger.warning(f"Timeout error, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries}): {error_str}")
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"Timeout error after {max_retries} attempts: {error_str}")
                        return {
                            'success': False,
                            'error': 'Payment verification timed out. Please try again.',
                            'error_code': 'TIMEOUT_ERROR'
                        }
                
                # Handle other unexpected errors
                logger.error(f"Unexpected error in payment verification: {error_str}")
                return {
                    'success': False,
                    'error': error_str,
                    'error_code': 'UNEXPECTED_ERROR'
                }
        
        # This should never be reached, but just in case
        return {
            'success': False,
            'error': 'Maximum retry attempts exceeded',
            'error_code': 'MAX_RETRIES_EXCEEDED'
        }
    
    @classmethod
    def handle_payment_completed(cls, merchant_order_id):
        """Mark payment as completed and update records"""
        try:
            # Find payment record
            payment = Payment.objects.filter(merchant_order_id=merchant_order_id).first()
            subscription_payment = OwnerSubscriptionPayment.objects.filter(merchant_order_id=merchant_order_id).first()
            
            if payment:
                payment.status = 'completed'
                payment.payment_date = timezone.now()
                payment.save()
                
                # Update transaction record
                transaction = PaymentTransaction.objects.filter(merchant_order_id=merchant_order_id).first()
                if transaction:
                    transaction.status = 'success'
                    transaction.reconciliation_status = 'completed'
                    transaction.save()
                
                logger.info(f"Tenant payment {payment.id} marked as completed")
                return {'success': True, 'payment_type': 'tenant', 'payment_id': payment.id}
            
            elif subscription_payment:
                subscription_payment.status = 'completed'
                subscription_payment.payment_date = timezone.now()
                
                # Set subscription dates
                now = timezone.now()
                subscription_payment.subscription_start_date = now
                
                if subscription_payment.subscription_period == 'yearly':
                    subscription_payment.subscription_end_date = now + timedelta(days=365)
                else:
                    subscription_payment.subscription_end_date = now + timedelta(days=30)
                
                subscription_payment.save()
                
                # Update owner subscription status
                owner = subscription_payment.owner
                owner.subscription_status = 'active'
                owner.subscription_plan = subscription_payment.pricing_plan  # Update to new plan
                owner.subscription_start_date = now
                owner.subscription_end_date = subscription_payment.subscription_end_date
                owner.save()
                
                logger.info(f"Subscription payment {subscription_payment.id} marked as completed")
                return {'success': True, 'payment_type': 'subscription', 'payment_id': subscription_payment.id}
            
            else:
                logger.warning(f"No payment record found for merchant_order_id: {merchant_order_id}")
                return {'success': False, 'error': 'Payment record not found'}
                
        except Exception as e:
            logger.error(f"Error handling payment completion: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def handle_payment_failed(cls, merchant_order_id):
        """Mark payment as failed"""
        try:
            # Find payment record
            payment = Payment.objects.filter(merchant_order_id=merchant_order_id).first()
            subscription_payment = OwnerSubscriptionPayment.objects.filter(merchant_order_id=merchant_order_id).first()
            
            if payment:
                payment.status = 'failed'
                payment.save()
                
                # Update transaction record
                transaction = PaymentTransaction.objects.filter(merchant_order_id=merchant_order_id).first()
                if transaction:
                    transaction.status = 'failed'
                    transaction.reconciliation_status = 'completed'
                    transaction.save()
                
                logger.info(f"Tenant payment {payment.id} marked as failed")
                return {'success': True, 'payment_type': 'tenant', 'payment_id': payment.id}
            
            elif subscription_payment:
                subscription_payment.status = 'failed'
                subscription_payment.save()
                
                logger.info(f"Subscription payment {subscription_payment.id} marked as failed")
                return {'success': True, 'payment_type': 'subscription', 'payment_id': subscription_payment.id}
            
            else:
                logger.warning(f"No payment record found for merchant_order_id: {merchant_order_id}")
                return {'success': False, 'error': 'Payment record not found'}
                
        except Exception as e:
            logger.error(f"Error handling payment failure: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def reconcile_pending_payment(cls, merchant_order_id):
        """Handle PENDING payment status per PhonePe reconciliation schedule"""
        try:
            status_response = cls.verify_payment_status(merchant_order_id)
            
            if not status_response['success']:
                return status_response
            
            state = status_response['state']
            
            if state == 'COMPLETED':
                return cls.handle_payment_completed(merchant_order_id)
            elif state == 'FAILED':
                return cls.handle_payment_failed(merchant_order_id)
            elif state == 'PENDING':
                # Update attempt count
                transaction = PaymentTransaction.objects.filter(merchant_order_id=merchant_order_id).first()
                if transaction:
                    transaction.payment_attempt_count += 1
                    transaction.reconciliation_status = 'in_progress'
                    transaction.save()
                
                return {'success': True, 'state': 'PENDING', 'message': 'Payment still pending'}
            else:
                return {'success': False, 'error': f'Unknown payment state: {state}'}
                
        except Exception as e:
            logger.error(f"Error reconciling pending payment: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def initiate_refund(cls, original_merchant_order_id, amount=None):
        """Initiate refund for a payment"""
        try:
            client = cls.get_client()
            merchant_refund_id = cls.generate_merchant_order_id("REF")
            
            # Find original payment to get amount if not provided
            if not amount:
                payment = Payment.objects.filter(merchant_order_id=original_merchant_order_id).first()
                subscription_payment = OwnerSubscriptionPayment.objects.filter(merchant_order_id=original_merchant_order_id).first()
                
                if payment:
                    amount = payment.amount
                elif subscription_payment:
                    amount = subscription_payment.amount
                else:
                    return {'success': False, 'error': 'Original payment not found'}
            
            # Convert amount to paise
            amount_paise = int(float(amount) * 100)
            
            # Create refund request
            from phonepe.sdk.pg.common.models.request.refund_request import RefundRequest
            refund_request = RefundRequest.build_refund_request(
                merchant_refund_id=merchant_refund_id,
                original_merchant_order_id=original_merchant_order_id,
                amount=amount_paise
            )
            
            # Initiate refund
            response = client.refund(refund_request)
            
            logger.info(f"Refund initiated for order {original_merchant_order_id}, refund_id {merchant_refund_id}")
            
            return {
                'success': True,
                'merchant_refund_id': merchant_refund_id,
                'refund_id': response.refund_id,
                'state': response.state,
                'amount': response.amount
            }
            
        except PhonePeException as e:
            logger.error(f"PhonePe error in refund initiation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'UNKNOWN')
            }
        except Exception as e:
            logger.error(f"Unexpected error in refund initiation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNEXPECTED_ERROR'
            }
    
    @classmethod
    def check_refund_status(cls, merchant_refund_id):
        """Check refund status"""
        try:
            client = cls.get_client()
            response = client.get_refund_status(merchant_refund_id)
            
            logger.info(f"Refund status checked for {merchant_refund_id}: {response.state}")
            
            return {
                'success': True,
                'state': response.state,
                'amount': response.amount,
                'refund_id': response.refund_id,
                'original_merchant_order_id': response.original_merchant_order_id,
                'payment_details': response.payment_details if hasattr(response, 'payment_details') else []
            }
            
        except PhonePeException as e:
            logger.error(f"PhonePe error in refund status check: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'UNKNOWN')
            }
        except Exception as e:
            logger.error(f"Unexpected error in refund status check: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNEXPECTED_ERROR'
            }
    
    @classmethod
    def validate_webhook_signature(cls, username, password, callback_header, callback_body):
        """Validate webhook signature using SHA256"""
        try:
            client = cls.get_client()
            response = client.validate_callback(
                username=username,
                password=password,
                callback_header_data=callback_header,
                callback_response_data=callback_body
            )
            
            logger.info(f"Webhook validated successfully for callback type: {response.callback_type}")
            
            return {
                'success': True,
                'callback_type': response.callback_type,
                'callback_data': response.callback_data
            }
            
        except PhonePeException as e:
            logger.error(f"PhonePe error in webhook validation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'UNKNOWN')
            }
        except Exception as e:
            logger.error(f"Unexpected error in webhook validation: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNEXPECTED_ERROR'
            }
    
    @classmethod
    def process_webhook_callback(cls, validated_callback):
        """Process validated webhook callback"""
        try:
            callback_type = validated_callback['callback_type']
            callback_data = validated_callback['callback_data']
            
            merchant_order_id = None
            if hasattr(callback_data, 'original_merchant_order_id'):
                merchant_order_id = callback_data.original_merchant_order_id
            elif hasattr(callback_data, 'merchant_order_id'):
                merchant_order_id = callback_data.merchant_order_id
            
            if not merchant_order_id:
                logger.warning("No merchant order ID found in webhook callback")
                return {'success': False, 'error': 'No merchant order ID found'}
            
            state = callback_data.state
            
            if callback_type in ['CHECKOUT_ORDER_COMPLETED', 'CHECKOUT_ORDER_FAILED']:
                if state == 'COMPLETED':
                    result = cls.handle_payment_completed(merchant_order_id)
                elif state == 'FAILED':
                    result = cls.handle_payment_failed(merchant_order_id)
                else:
                    result = {'success': False, 'error': f'Unknown payment state: {state}'}
                
                logger.info(f"Webhook processed for payment {merchant_order_id}: {state}")
                return result
            
            elif callback_type in ['PG_REFUND_COMPLETED', 'PG_REFUND_FAILED']:
                # Handle refund webhooks
                logger.info(f"Refund webhook received for {merchant_order_id}: {state}")
                return {'success': True, 'message': 'Refund webhook processed'}
            
            else:
                logger.warning(f"Unknown webhook callback type: {callback_type}")
                return {'success': False, 'error': f'Unknown callback type: {callback_type}'}
                
        except Exception as e:
            logger.error(f"Error processing webhook callback: {str(e)}")
            return {'success': False, 'error': str(e)}
