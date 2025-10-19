# PhonePe UAT Testing Documentation

## Overview

This document provides comprehensive testing procedures for PhonePe payment gateway integration in the Zelton App. The testing covers both tenant rent payments and owner subscription payments.

## Prerequisites

### Test Environment Setup

1. **PhonePe Test Credentials**

   - Client ID: `TEST-M23CV7N4N1CL1_25100`
   - Client Secret: `ZDE3ZTk3YTEtNzk5OS00OTFhLWIzYzctM2Q2M2EyYjQ5NGRl`
   - Environment: SANDBOX

2. **PhonePe Test App Installation**

   - **Android**: Download from [PhonePe Test App](https://phonepe.mycloudrepo.io/public/repositories/phonepe-pg-sdk-python)
   - **iOS**: Contact PhonePe Integration Team for Firebase invite
   - Package Name: `com.phonepe.simulator`

3. **Backend Configuration**
   - Ensure `.env` file contains test credentials
   - Backend running on `http://localhost:8000`
   - Mobile app configured to connect to backend

## Test Cases

### 1. Tenant Rent Payment Testing

#### 1.1 UPI Intent Flow Testing

**Test VPAs:**

- Success: `success@ybl`
- Failure: `failed@ybl`
- Pending: `pending@ybl`

**Steps:**

1. Open Zelton mobile app
2. Login as tenant
3. Navigate to Payment screen
4. Enter rent amount
5. Select UPI payment method
6. Click "Pay Now"
7. App should redirect to PhonePe payment page
8. Use test VPA based on desired outcome
9. Complete payment flow
10. Verify payment status in app

**Expected Results:**

- Success: Payment marked as completed, invoice generated
- Failure: Payment marked as failed, retry option available
- Pending: Payment status shows pending, polling continues

#### 1.2 UPI Collect Flow Testing

**Test Steps:**

1. Initiate payment from tenant app
2. Select UPI Collect option
3. Enter test VPA (`success@ybl`, `failed@ybl`, or `pending@ybl`)
4. Complete payment
5. Verify status update

#### 1.3 Card Payment Testing

**Test Card Details:**

**Credit Card:**

- Card Number: `4208 5851 9011 6667`
- Expiry: `06/2027`
- CVV: `508`

**Debit Card:**

- Card Number: `4242 4242 4242 4242`
- Expiry: `12/2023`
- CVV: `936`

**Test OTP:** `123456`

**Steps:**

1. Initiate payment
2. Select card payment
3. Enter test card details
4. Use test OTP `123456`
5. Verify payment completion

#### 1.4 Net Banking Testing

**Steps:**

1. Initiate payment
2. Select Net Banking
3. Choose any test bank
4. Complete authentication
5. Verify payment status

### 2. Owner Subscription Payment Testing

#### 2.1 Monthly Subscription Testing

**Steps:**

1. Login as owner
2. Navigate to subscription/pricing screen
3. Select monthly plan
4. Initiate payment
5. Complete PhonePe payment flow
6. Verify subscription activation

#### 2.2 Yearly Subscription Testing

**Steps:**

1. Select yearly subscription plan
2. Initiate payment
3. Complete payment flow
4. Verify subscription dates (365 days from payment)

### 3. Payment Status Verification

#### 3.1 Real-time Status Updates

**Test Scenarios:**

1. **Completed Payment**

   - Verify payment marked as completed
   - Check invoice generation
   - Confirm tenant/owner dashboard updates

2. **Failed Payment**

   - Verify payment marked as failed
   - Check retry mechanism
   - Confirm error handling

3. **Pending Payment**
   - Verify polling mechanism
   - Check status updates every 10 seconds
   - Confirm timeout handling (5 minutes)

#### 3.2 Webhook Testing

**Steps:**

1. Configure webhook URL in PhonePe dashboard
2. Initiate test payment
3. Monitor webhook callbacks
4. Verify webhook signature validation
5. Check payment status updates via webhook

### 4. Refund Testing

#### 4.1 Full Refund Testing

**Steps:**

1. Complete a successful payment
2. Initiate refund from admin/owner panel
3. Verify refund status
4. Check refund completion

#### 4.2 Partial Refund Testing

**Steps:**

1. Complete payment for ₹1000
2. Initiate partial refund for ₹500
3. Verify refund amount
4. Check remaining balance

### 5. Error Handling Testing

#### 5.1 Network Error Testing

**Steps:**

1. Disable internet connection
2. Initiate payment
3. Verify error handling
4. Re-enable internet
5. Test retry mechanism

#### 5.2 Invalid Amount Testing

**Steps:**

1. Enter invalid amount (negative, zero, too large)
2. Verify validation
3. Check error messages

#### 5.3 Duplicate Payment Testing

**Steps:**

1. Complete a payment
2. Try to make same payment again
3. Verify duplicate prevention
4. Check error handling

### 6. Reconciliation Testing

#### 6.1 Pending Payment Reconciliation

**Steps:**

1. Initiate payment with `pending@ybl` VPA
2. Run reconciliation command:
   ```bash
   python manage.py reconcile_pending_payments
   ```
3. Verify reconciliation schedule:
   - Every 3s for first 30s
   - Every 6s for next 60s
   - Every 10s for next 60s
   - Every 30s for next 60s
   - Every 1 minute thereafter

#### 6.2 Refund Reconciliation

**Steps:**

1. Initiate refund
2. Run refund reconciliation:
   ```bash
   python manage.py reconcile_pending_refunds
   ```
3. Verify refund status updates

## Test Data

### Sample Tenant Data

```json
{
  "email": "tenant@test.com",
  "password": "test123",
  "phone": "9876543210",
  "property_key": "ABC12345"
}
```

### Sample Owner Data

```json
{
  "email": "owner@test.com",
  "password": "test123",
  "phone": "9876543210",
  "properties": [
    {
      "name": "Test Property",
      "address": "123 Test Street",
      "city": "Test City",
      "units": [
        {
          "unit_number": "A-101",
          "rent_amount": 15000,
          "unit_type": "2BHK"
        }
      ]
    }
  ]
}
```

## Test Scenarios Checklist

### Payment Initiation

- [ ] Tenant rent payment initiation
- [ ] Owner subscription payment initiation
- [ ] Amount validation
- [ ] Payment method selection
- [ ] Redirect to PhonePe

### Payment Processing

- [ ] UPI Intent success flow
- [ ] UPI Intent failure flow
- [ ] UPI Intent pending flow
- [ ] UPI Collect flow
- [ ] Card payment flow
- [ ] Net banking flow

### Payment Verification

- [ ] Real-time status updates
- [ ] Webhook processing
- [ ] Payment completion handling
- [ ] Payment failure handling
- [ ] Pending payment polling

### Error Handling

- [ ] Network error handling
- [ ] Invalid amount handling
- [ ] Duplicate payment prevention
- [ ] Timeout handling
- [ ] Webhook validation

### Reconciliation

- [ ] Pending payment reconciliation
- [ ] Refund reconciliation
- [ ] Status update accuracy
- [ ] Database consistency

### Mobile App Integration

- [ ] Payment screen integration
- [ ] Status screen functionality
- [ ] Navigation flow
- [ ] Error display
- [ ] Success confirmation

## Troubleshooting

### Common Issues

1. **Payment Not Redirecting**

   - Check redirect URL configuration
   - Verify PhonePe credentials
   - Check network connectivity

2. **Status Not Updating**

   - Check webhook configuration
   - Verify polling mechanism
   - Check backend logs

3. **Webhook Validation Failing**

   - Verify webhook credentials
   - Check signature validation
   - Review webhook URL accessibility

4. **Reconciliation Not Working**
   - Check management command execution
   - Verify database connections
   - Review PhonePe API responses

### Debug Commands

```bash
# Check payment status
python manage.py shell
>>> from core.models import Payment
>>> Payment.objects.filter(status='pending').count()

# Check PhonePe client
>>> from core.services.phonepe_service import PhonePeService
>>> client = PhonePeService.get_client()

# Test webhook validation
>>> PhonePeService.validate_webhook_signature('username', 'password', 'header', 'body')
```

## Production Readiness Checklist

### Configuration

- [ ] Production PhonePe credentials
- [ ] Production webhook URLs
- [ ] SSL certificates
- [ ] Environment variables

### Security

- [ ] Webhook signature validation
- [ ] Secure credential storage
- [ ] HTTPS enforcement
- [ ] Rate limiting

### Monitoring

- [ ] Payment success rate monitoring
- [ ] Error rate tracking
- [ ] Performance metrics
- [ ] Alert configuration

### Backup & Recovery

- [ ] Database backups
- [ ] Payment data recovery
- [ ] Disaster recovery plan
- [ ] Data retention policy

## Support Contacts

- **PhonePe Integration Team**: integration@phonepe.com
- **Technical Support**: support@zelton.com
- **Emergency Contact**: +91-XXXXXXXXXX

## Version History

- **v1.0** - Initial UAT testing documentation
- **v1.1** - Added reconciliation testing
- **v1.2** - Added mobile app integration testing
