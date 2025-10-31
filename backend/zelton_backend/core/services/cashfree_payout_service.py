import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from cashfree_payout.api_client import Cashfree, CFEnvironment
from cashfree_payout import CreateTransferRequest, CreateTransferRequestBeneficiaryDetails
from cashfree_payout import CreateTransferRequestBeneficiaryDetailsBeneficiaryInstrumentDetails
from core.models import OwnerPayout

logger = logging.getLogger(__name__)


class CashfreePayoutService:
    """Cashfree Payout Service for automatic transfers to property owners"""
    
    _client_initialized = False
    _cashfree_client = None
    
    @classmethod
    def initialize_client(cls):
        """Initialize Cashfree client (call once)"""
        if not cls._client_initialized:
            Cashfree.XClientId = settings.CASHFREE_CLIENT_ID
            Cashfree.XClientSecret = settings.CASHFREE_CLIENT_SECRET
            Cashfree.XEnvironment = CFEnvironment.PRODUCTION if settings.CASHFREE_ENVIRONMENT == 'PRODUCTION' else CFEnvironment.SANDBOX
            cls._cashfree_client = Cashfree()
            cls._client_initialized = True
            logger.info(f"Cashfree client initialized: {settings.CASHFREE_ENVIRONMENT}")
    
    @classmethod
    def initiate_owner_payout(cls, payment, x_api_version="2024-01-01"):
        """
        Transfer rent amount to owner's bank/UPI account
        Args:
            payment: Payment object (tenant rent payment)
        Returns:
            dict with success status and payout_record
        """
        try:
            cls.initialize_client()
            
            unit = payment.unit
            owner = unit.property.owner
            
            # Validate owner has payment details
            validation = cls.validate_owner_payment_details(owner)
            if not validation['success']:
                logger.warning(f"Owner {owner.id} payment validation failed: {validation['error']}")
                return validation
            
            # Check if payout already exists
            existing_payout = OwnerPayout.objects.filter(payment=payment).first()
            if existing_payout:
                logger.info(f"Payout already exists for payment {payment.id}: {existing_payout.id}")
                return {'success': True, 'payout_record': existing_payout, 'already_exists': True}
            
            # Create payout record
            payout_amount = Decimal(str(payment.amount))
            payout_record = OwnerPayout.objects.create(
                payment=payment,
                owner=owner,
                amount=payout_amount,
                status='pending',
                beneficiary_type=owner.payment_method
            )
            
            # Execute payout
            result = cls.execute_payout(payout_record, x_api_version)
            
            if result['success']:
                logger.info(f"Payout initiated successfully for payment {payment.id}")
                return {'success': True, 'payout_record': payout_record}
            else:
                logger.error(f"Payout failed for payment {payment.id}: {result['error']}")
                return {'success': False, 'error': result['error'], 'payout_record': payout_record}
                
        except Exception as e:
            logger.error(f"Exception in initiate_owner_payout: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def create_or_get_beneficiary(cls, owner, x_api_version="2024-01-01"):
        """Create or get beneficiary in Cashfree"""
        from cashfree_payout import CreateBeneficiaryRequest, CreateBeneficiaryRequestBeneficiaryInstrumentDetails
        
        try:
            cls.initialize_client()
            beneficiary_id = f"OWNER_{owner.id}"
            
            # Try to fetch existing beneficiary first
            try:
                response = cls._cashfree_client.PayoutFetchBeneficiary(
                    x_api_version=x_api_version,
                    beneficiary_id=beneficiary_id
                )
                logger.info(f"Beneficiary {beneficiary_id} already exists")
                return {'success': True, 'beneficiary_id': beneficiary_id, 'exists': True}
            except Exception as fetch_error:
                # Beneficiary doesn't exist, create it
                if '404' not in str(fetch_error):
                    raise fetch_error
            
            # Prepare beneficiary instrument details
            instrument_details = CreateBeneficiaryRequestBeneficiaryInstrumentDetails()
            
            if owner.payment_method == 'bank':
                instrument_details.bank_account_number = str(owner.account_number or '')
                instrument_details.bank_ifsc = str(owner.ifsc_code or '')
            else:  # UPI
                instrument_details.vpa = str(owner.upi_id or '')
            
            # Prepare owner name
            first_name = owner.user.first_name or 'Owner'
            last_name = owner.user.last_name or ''
            owner_name = f"{first_name} {last_name}".strip()
            
            # Create beneficiary request
            beneficiary_request = CreateBeneficiaryRequest(
                beneficiary_id=beneficiary_id,
                beneficiary_name=owner_name,
                beneficiary_email=str(owner.user.email or ''),
                beneficiary_phone=str(owner.phone or ''),
                beneficiary_instrument_details=instrument_details
            )
            
            # Create beneficiary
            response = cls._cashfree_client.PayoutCreateBeneficiary(
                x_api_version=x_api_version,
                create_beneficiary_request=beneficiary_request
            )
            
            logger.info(f"Beneficiary {beneficiary_id} created successfully")
            return {'success': True, 'beneficiary_id': beneficiary_id, 'exists': False}
            
        except Exception as e:
            logger.error(f"Error creating/getting beneficiary: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def execute_payout(cls, payout_record, x_api_version="2024-01-01"):
        """Execute the actual Cashfree payout API call"""
        try:
            cls.initialize_client()
            owner = payout_record.owner
            transfer_id = f"PAYOUT_{payout_record.id}_{int(timezone.now().timestamp())}"
            
            # First, ensure beneficiary exists
            beneficiary_result = cls.create_or_get_beneficiary(owner, x_api_version)
            if not beneficiary_result['success']:
                raise Exception(f"Beneficiary creation failed: {beneficiary_result['error']}")
            
            beneficiary_id = beneficiary_result['beneficiary_id']
            
            # Prepare beneficiary instrument details
            instrument_details = CreateTransferRequestBeneficiaryDetailsBeneficiaryInstrumentDetails()
            
            if owner.payment_method == 'bank':
                instrument_details.bank_account_number = str(owner.account_number or '')
                instrument_details.bank_ifsc = str(owner.ifsc_code or '')
            else:  # UPI
                instrument_details.vpa = str(owner.upi_id or '')
            
            # Prepare owner name safely
            first_name = owner.user.first_name or 'Owner'
            last_name = owner.user.last_name or ''
            owner_name = f"{first_name} {last_name}".strip()
            
            # Prepare beneficiary details
            beneficiary_details = CreateTransferRequestBeneficiaryDetails(
                beneficiary_id=beneficiary_id,
                beneficiary_name=owner_name,
                beneficiary_instrument_details=instrument_details
            )
            
            # Prepare transfer request
            # Determine transfer_mode based on payment method
            transfer_mode = 'upi' if owner.payment_method == 'upi' else 'banktransfer'
            
            transfer_request = CreateTransferRequest(
                transfer_id=transfer_id,
                transfer_amount=float(payout_record.amount),
                transfer_mode=transfer_mode,
                remarks=f"Rent payment for unit {payout_record.payment.unit.unit_number}",
                beneficiary_details=beneficiary_details
            )
            
            # Make API call
            logger.info(f"Initiating Cashfree payout: {transfer_id}, Amount: {payout_record.amount}")
            response = cls._cashfree_client.PayoutInitiateTransfer(
                x_api_version=x_api_version,
                create_transfer_request=transfer_request
            )
            
            # Update payout record
            payout_record.cashfree_transfer_id = transfer_id
            payout_record.status = 'processing'
            
            # Extract response data safely
            try:
                if hasattr(response, 'data'):
                    response_dict = response.data if isinstance(response.data, dict) else response.data.dict() if hasattr(response.data, 'dict') else {}
                else:
                    response_dict = {}
                payout_record.cashfree_response = response_dict
            except:
                payout_record.cashfree_response = {'status': 'processing', 'transfer_id': transfer_id}
            
            payout_record.save()
            
            logger.info(f"Cashfree transfer initiated: {transfer_id}")
            return {'success': True, 'transfer_id': transfer_id}
            
        except Exception as e:
            import traceback
            error_msg = str(e)
            error_traceback = traceback.format_exc()
            
            payout_record.status = 'failed'
            payout_record.error_message = error_msg
            payout_record.save()
            
            # Schedule retry
            cls.schedule_retry(payout_record)
            
            logger.error(f"Cashfree payout execution failed: {error_msg}\n{error_traceback}")
            return {'success': False, 'error': error_msg}
    
    @classmethod
    def prepare_beneficiary_data(cls, owner, transfer_id):
        """Prepare beneficiary data for Cashfree"""
        bene_id = f"OWNER_{owner.id}"
        
        if owner.payment_method == 'bank':
            return {
                "beneId": bene_id,
                "name": f"{owner.user.first_name} {owner.user.last_name}",
                "email": owner.user.email,
                "phone": owner.phone,
                "bankAccount": owner.account_number,
                "ifsc": owner.ifsc_code,
                "address1": owner.address[:100] if owner.address else "NA",
                "city": owner.city,
                "state": owner.state,
                "pincode": owner.pincode
            }
        else:  # UPI
            return {
                "beneId": bene_id,
                "name": f"{owner.user.first_name} {owner.user.last_name}",
                "email": owner.user.email,
                "phone": owner.phone,
                "vpa": owner.upi_id,
                "address1": owner.address[:100] if owner.address else "NA",
                "city": owner.city,
                "state": owner.state,
                "pincode": owner.pincode
            }
    
    @classmethod
    def validate_owner_payment_details(cls, owner):
        """Validate owner has complete payment details"""
        if not owner.payment_method:
            return {'success': False, 'error': 'Payment method not configured'}
        
        if owner.payment_method == 'bank':
            if not all([owner.bank_name, owner.ifsc_code, owner.account_number]):
                return {'success': False, 'error': 'Incomplete bank account details'}
        elif owner.payment_method == 'upi':
            if not owner.upi_id:
                return {'success': False, 'error': 'UPI ID not configured'}
        
        return {'success': True}
    
    @classmethod
    def schedule_retry(cls, payout_record):
        """Schedule automatic retry for failed payout"""
        if payout_record.retry_count < payout_record.max_retries:
            payout_record.retry_count += 1
            payout_record.status = 'retry_scheduled'
            
            # Exponential backoff: 5min, 15min, 45min
            delay_minutes = 5 * (3 ** (payout_record.retry_count - 1))
            payout_record.next_retry_at = timezone.now() + timedelta(minutes=delay_minutes)
            payout_record.save()
            
            logger.info(f"Retry scheduled for payout {payout_record.id} at {payout_record.next_retry_at}")
    
    @classmethod
    def retry_failed_payout(cls, payout_id, x_api_version="2024-01-01"):
        """Manually or automatically retry a failed payout"""
        try:
            payout_record = OwnerPayout.objects.get(id=payout_id)
            
            if payout_record.status not in ['failed', 'retry_scheduled']:
                return {'success': False, 'error': 'Payout is not in failed/retry state'}
            
            payout_record.last_retry_at = timezone.now()
            payout_record.status = 'pending'
            payout_record.save()
            
            result = cls.execute_payout(payout_record, x_api_version)
            return result
            
        except Exception as e:
            logger.error(f"Error retrying payout {payout_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def check_payout_status(cls, payout_id, x_api_version="2024-01-01"):
        """Check status of a payout with Cashfree"""
        try:
            cls.initialize_client()
            payout_record = OwnerPayout.objects.get(id=payout_id)
            
            if not payout_record.cashfree_transfer_id:
                return {'success': False, 'error': 'No transfer ID found'}
            
            response = cls._cashfree_client.PayoutFetchTransfer(
                x_api_version=x_api_version,
                transfer_id=payout_record.cashfree_transfer_id
            )
            
            # Extract response data safely
            try:
                if hasattr(response, 'data'):
                    status_data = response.data if isinstance(response.data, dict) else response.data.dict() if hasattr(response.data, 'dict') else {}
                else:
                    status_data = {}
                
                # Handle response object attributes if dict is empty
                if not status_data and hasattr(response, '__dict__'):
                    status_data = {
                        'status': getattr(response, 'status', None),
                        'utr': getattr(response, 'utr', None),
                        'reason': getattr(response, 'reason', None) or getattr(response, 'message', None)
                    }
            except:
                status_data = {}
            
            cashfree_status = (status_data.get('status') or '').upper()
            
            if cashfree_status == 'SUCCESS':
                payout_record.status = 'completed'
                payout_record.completed_at = timezone.now()
                payout_record.cashfree_utr = status_data.get('utr', '') or status_data.get('transfer_utr', '')
            elif cashfree_status in ['FAILED', 'REJECTED', 'CANCELLED', 'CANCELLED']:
                payout_record.status = 'failed'
                payout_record.error_message = status_data.get('reason') or status_data.get('message') or 'Payout failed'
                if 'RECEIVED' in cashfree_status or 'PROCESSING' in cashfree_status:
                    # Check if it's actually failed by examining the response
                    if status_data.get('status') == 'REJECTED' or 'reject' in str(status_data).lower():
                        payout_record.status = 'failed'
            
            payout_record.cashfree_response = status_data
            payout_record.save()
            
            return {'success': True, 'status': payout_record.status}
            
        except Exception as e:
            logger.error(f"Error checking payout status: {str(e)}")
            return {'success': False, 'error': str(e)}

