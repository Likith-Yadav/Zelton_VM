# 🏦 Cashfree Owner Payout Tracking Guide

## Overview
Your system has **automatic Cashfree payouts** integrated. When a tenant completes a rent payment, the system automatically initiates a payout to the property owner.

---

## 📊 How to View Owner Payouts in Django Admin

### 1. **Access Django Admin**
```
URL: http://localhost:8000/admin/  or  https://api.zelton.in/admin/
Username: admin
Password: admin123
```

### 2. **Navigate to Owner Payouts**
- In the left sidebar, find **"CORE"** section
- Click on **"Owner Payouts"** 
- You'll see a list of all payout transactions

### 3. **Owner Payout List View Shows:**
- **ID**: Payout transaction ID
- **Owner**: Owner's name
- **Payment Info**: Original payment ID and unit number
- **Amount**: Payout amount (₹)
- **Status**: Current status of payout
- **Beneficiary Type**: bank or upi
- **Retry Count**: Number of retry attempts (if failed)
- **Initiated At**: When payout was created
- **Completed At**: When payout was successful

---

## 🔄 Payout Workflow

### When Does a Payout Happen?

```
Tenant Payment → PhonePe Payment → Payment Completed → Automatic Payout Triggered
```

**File: `core/services/phonepe_service.py`** (Lines 305-316)
```python
# When tenant payment is completed:
def handle_payment_completed(cls, merchant_order_id):
    payment.status = 'completed'
    payment.payment_date = timezone.now()
    payment.save()
    
    # AUTOMATIC PAYOUT TRIGGER
    from core.services.cashfree_payout_service import CashfreePayoutService
    payout_result = CashfreePayoutService.initiate_owner_payout(payment)
```

---

## 📋 Payout Status Meanings

| Status | Description | Action Needed |
|--------|-------------|---------------|
| **pending** | Payout record created, waiting to process | None - will process automatically |
| **processing** | Sent to Cashfree, transfer in progress | None - wait for completion |
| **completed** | ✅ Money successfully transferred to owner | None - all done! |
| **failed** | ❌ Payout failed (invalid bank details, etc.) | Check error message, retry manually |
| **retry_scheduled** | Failed payout queued for automatic retry | None - will retry automatically |

---

## 🔍 How to Check If Payout Was Created

### Method 1: Django Admin
1. Go to **Admin → Owner Payouts**
2. Search by:
   - Owner name (in search box)
   - Payment ID
   - Date range (use date filter)

### Method 2: Python Shell
```bash
cd /ZeltonLivings/appsdata/backend/zelton_backend
python manage.py shell
```

```python
from core.models import OwnerPayout, Payment

# Check payout for specific payment ID
payment_id = 123  # Replace with your payment ID
payout = OwnerPayout.objects.filter(payment_id=payment_id).first()

if payout:
    print(f"Payout exists: ID={payout.id}, Status={payout.status}, Amount=₹{payout.amount}")
else:
    print("No payout found for this payment")

# List all payouts for an owner
from core.models import Owner
owner = Owner.objects.get(user__email="owner@example.com")
payouts = OwnerPayout.objects.filter(owner=owner)
for p in payouts:
    print(f"ID: {p.id}, Amount: ₹{p.amount}, Status: {p.status}, Date: {p.initiated_at}")
```

### Method 3: Check Database Directly
```bash
echo 'Zelton@12345' | sudo -S -u postgres psql zelton_db
```

```sql
-- Set search path
SET search_path TO zelton_schema, public;

-- View all payouts
SELECT id, owner_id, amount, status, initiated_at, completed_at 
FROM core_ownerpayout 
ORDER BY initiated_at DESC 
LIMIT 10;

-- Check payout for specific payment
SELECT * FROM core_ownerpayout WHERE payment_id = 123;

-- Count payouts by status
SELECT status, COUNT(*) 
FROM core_ownerpayout 
GROUP BY status;
```

---

## ⚠️ Troubleshooting: Why Payout Might Not Be Created

### Common Issues:

1. **Owner Payment Details Missing**
   ```python
   # Check if owner has payment details configured
   owner = payment.unit.property.owner
   print(f"Payment Method: {owner.payment_method}")
   print(f"Bank Name: {owner.bank_name}")
   print(f"Account Number: {owner.account_number}")
   print(f"IFSC Code: {owner.ifsc_code}")
   print(f"UPI ID: {owner.upi_id}")
   ```

2. **Payment Not Completed**
   - Only payments with `status='completed'` trigger payouts
   - Check: `payment.status`

3. **Payout Already Exists**
   - System prevents duplicate payouts
   - Check if payout already exists for the payment

4. **Cashfree Configuration Missing**
   Check in `settings.py`:
   ```python
   CASHFREE_CLIENT_ID = "your_client_id"
   CASHFREE_CLIENT_SECRET = "your_secret"
   CASHFREE_ENVIRONMENT = "SANDBOX"  # or PRODUCTION
   ```

---

## 🔧 Admin Actions Available

### In Django Admin → Owner Payouts:

1. **Retry Failed Payouts**
   - Select failed payouts
   - From "Actions" dropdown → "Retry selected failed payouts"

2. **Check Payout Status**
   - Select payouts
   - From "Actions" dropdown → "Check status with Cashfree"
   - Fetches latest status from Cashfree API

---

## 📝 Checking Logs

### Django Logs
```bash
tail -100 /ZeltonLivings/dbdata/logs/django.log | grep -i payout
```

Look for:
- ✅ `"Owner payout initiated"`
- ✅ `"Cashfree transfer initiated"`
- ❌ `"Owner payout failed"`
- ❌ `"Payout validation failed"`

---

## 🎯 Quick Diagnosis Checklist

When a tenant payment is completed, check:

1. ✅ Payment record exists and `status='completed'`
2. ✅ OwnerPayout record was created
3. ✅ Owner has payment method configured
4. ✅ Payout status (pending/processing/completed)
5. ✅ Check logs for errors
6. ✅ If failed, check `error_message` field

---

## 📞 API Endpoints for Owner Payouts

### List All Payouts (Owner's View)
```
GET /api/owner-payouts/
```

### Get Payout Details
```
GET /api/owner-payouts/{id}/
```

### Retry Failed Payout (Admin)
```
POST /api/owner-payouts/{id}/manual_retry/
```

### Check Payout Status with Cashfree
```
GET /api/owner-payouts/{id}/check_status/
```

---

## 🔐 Owner Payment Configuration

Before payouts can work, owners must configure their payment details:

### Bank Account Method
```python
owner.payment_method = 'bank'
owner.bank_name = "State Bank of India"
owner.account_number = "1234567890"
owner.ifsc_code = "SBIN0001234"
owner.save()
```

### UPI Method
```python
owner.payment_method = 'upi'
owner.upi_id = "owner@paytm"
owner.save()
```

---

## 📊 Sample Payout Record

```python
{
    'id': 1,
    'payment_id': 123,
    'owner_id': 5,
    'amount': Decimal('15000.00'),
    'status': 'completed',
    'beneficiary_type': 'bank',
    'cashfree_transfer_id': 'PAYOUT_1_1698765432',
    'cashfree_utr': 'CF123456789',
    'retry_count': 0,
    'initiated_at': '2025-10-29T10:30:00Z',
    'completed_at': '2025-10-29T10:35:00Z',
    'error_message': ''
}
```

---

## 🚀 Testing the Flow

### Test a Complete Payment → Payout Flow:

1. Create a tenant rent payment
2. Complete the PhonePe payment
3. Check Django admin → Owner Payouts
4. Verify payout record was created
5. Check payout status
6. View logs for confirmation

---

## 📞 Need Help?

If you don't see payouts in the admin:

1. Verify the payment completed successfully
2. Check Django logs for errors
3. Verify owner has payment details configured
4. Check Cashfree credentials in settings
5. Look at the `OwnerPayout` table directly in database

---

**Created**: October 2025  
**Location**: `/ZeltonLivings/appsdata/backend/zelton_backend/`

