# 📄 Manual Payment Proof Upload Feature

## 🎯 Overview

This feature allows tenants to upload payment proof receipts for verification by property owners. Once verified, the payment amount is automatically deducted from the tenant's outstanding balance.

## 🏗️ Architecture

### **Models:**
- **ManualPaymentProof**: Stores payment proof uploads with verification status

### **API Endpoints:**
- **POST** `/api/manual-payment-proofs/` - Upload payment proof (Tenant)
- **GET** `/api/manual-payment-proofs/` - List payment proofs (Role-based)
- **GET** `/api/manual-payment-proofs/pending/` - Get pending proofs (Owner)
- **GET** `/api/manual-payment-proofs/my_proofs/` - Get my proofs (Tenant)
- **POST** `/api/manual-payment-proofs/{id}/verify/` - Verify payment proof (Owner)

### **File Storage:**
- **Location**: `/ZeltonLivings/dbdata/media/manual_payment_proofs/`
- **Format**: Images (JPG, PNG, etc.)

## 🔄 Workflow

### **1. Tenant Uploads Payment Proof:**
```json
POST /api/manual-payment-proofs/
{
    "unit": 123,
    "amount": 15000.00,
    "payment_proof_image": <file>,
    "description": "Rent payment for October 2025"
}
```

### **2. Owner Reviews Pending Proofs:**
```json
GET /api/manual-payment-proofs/pending/
```

### **3. Owner Verifies Payment:**
```json
POST /api/manual-payment-proofs/{id}/verify/
{
    "verification_status": "verified",
    "verification_notes": "Payment confirmed, receipt valid"
}
```

### **4. System Creates Payment Record:**
- If verified: Creates completed payment record
- If rejected: Marks proof as rejected (no payment record)

## 📊 Database Schema

### **ManualPaymentProof Model:**
```python
{
    "id": "Auto-generated ID",
    "tenant": "ForeignKey to Tenant",
    "unit": "ForeignKey to Unit", 
    "amount": "DecimalField - Amount paid",
    "payment_proof_image": "ImageField - Receipt/screenshot",
    "description": "TextField - Additional notes",
    "verification_status": "CharField - pending/verified/rejected",
    "verified_by": "ForeignKey to User (Owner)",
    "verification_notes": "TextField - Owner's notes",
    "verified_at": "DateTimeField - When verified",
    "uploaded_at": "DateTimeField - When uploaded",
    "updated_at": "DateTimeField - Last updated"
}
```

## 🔐 Security Features

### **Access Control:**
- **Tenants**: Can only upload/view their own proofs
- **Owners**: Can only verify proofs for their own units
- **Authentication**: Required for all endpoints

### **Validation:**
- Amount must be positive
- Unit must belong to the tenant
- Only pending proofs can be verified
- File upload validation

## 📱 Frontend Integration

### **Tenant Dashboard:**
```javascript
// Upload payment proof
const uploadPaymentProof = async (formData) => {
    const response = await fetch('/api/manual-payment-proofs/', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${token}`
        },
        body: formData
    });
    return response.json();
};

// View my payment proofs
const getMyPaymentProofs = async () => {
    const response = await fetch('/api/manual-payment-proofs/my_proofs/', {
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    return response.json();
};
```

### **Owner Dashboard:**
```javascript
// Get pending payment proofs
const getPendingPaymentProofs = async () => {
    const response = await fetch('/api/manual-payment-proofs/pending/', {
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    return response.json();
};

// Verify payment proof
const verifyPaymentProof = async (proofId, status, notes) => {
    const response = await fetch(`/api/manual-payment-proofs/${proofId}/verify/`, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            verification_status: status,
            verification_notes: notes
        })
    });
    return response.json();
};
```

## 🎨 UI Components Needed

### **Tenant Side:**
1. **Upload Button**: "Upload Payment Proof"
2. **Amount Input**: Custom amount or total due
3. **File Upload**: Image picker for receipt
4. **Description Field**: Optional notes
5. **Status Display**: Show verification status

### **Owner Side:**
1. **Pending Proofs List**: Show all pending uploads
2. **Proof Viewer**: Display uploaded images
3. **Verification Actions**: Accept/Reject buttons
4. **Notes Field**: Add verification notes

## 📋 API Response Examples

### **Upload Payment Proof (Success):**
```json
{
    "success": true,
    "message": "Payment proof uploaded successfully",
    "payment_proof": {
        "id": 1,
        "tenant": 123,
        "unit": 456,
        "amount": "15000.00",
        "payment_proof_image_url": "http://localhost:8000/media/manual_payment_proofs/receipt.jpg",
        "description": "Rent payment for October 2025",
        "verification_status": "pending",
        "uploaded_at": "2025-10-23T14:40:00Z"
    }
}
```

### **Get Pending Proofs (Owner):**
```json
{
    "success": true,
    "pending_payment_proofs": [
        {
            "id": 1,
            "tenant_name": "John Doe",
            "tenant_email": "john@example.com",
            "unit_number": "A101",
            "property_name": "Sunrise Apartments",
            "amount": "15000.00",
            "payment_proof_image_url": "http://localhost:8000/media/manual_payment_proofs/receipt.jpg",
            "description": "Rent payment for October 2025",
            "verification_status": "pending",
            "uploaded_at": "2025-10-23T14:40:00Z"
        }
    ],
    "count": 1
}
```

### **Verify Payment Proof (Success):**
```json
{
    "success": true,
    "message": "Payment proof verified successfully. Payment record created.",
    "payment_proof": {
        "id": 1,
        "verification_status": "verified",
        "verified_by_name": "Property Owner",
        "verification_notes": "Payment confirmed, receipt valid",
        "verified_at": "2025-10-23T14:45:00Z"
    }
}
```

## 🗄️ Django Admin

### **Manual Payment Proof Admin:**
- **List View**: Shows all payment proofs with key details
- **Filters**: By verification status, date, owner
- **Search**: By tenant name, unit number, property name
- **Actions**: View, edit verification status

### **Admin Features:**
- View uploaded payment proof images
- Edit verification status and notes
- Track verification history
- Export payment proof data

## 🔧 Configuration

### **Media Settings:**
```python
MEDIA_URL = '/backend/media/'
MEDIA_ROOT = '/ZeltonLivings/dbdata/media'
```

### **File Upload Settings:**
```python
# In settings.py
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
```

## 🚀 Usage Instructions

### **For Tenants:**
1. Go to your dashboard
2. Click "Upload Payment Proof"
3. Select the unit you're paying for
4. Enter the payment amount
5. Upload the payment receipt/screenshot
6. Add optional description
7. Submit for owner verification

### **For Owners:**
1. Go to your dashboard
2. Check "Pending Payment Proofs" section
3. Review uploaded receipts
4. Verify or reject each proof
5. Add verification notes
6. Submit verification

## 🔍 Testing

### **Test Scenarios:**
1. **Upload Payment Proof**: Test file upload and validation
2. **View Pending Proofs**: Test owner access to pending proofs
3. **Verify Payment**: Test verification workflow
4. **Reject Payment**: Test rejection workflow
5. **Payment Record Creation**: Test automatic payment record creation

### **Test Commands:**
```bash
# Test API endpoints
curl -X POST http://localhost:8000/api/manual-payment-proofs/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "unit=123" \
  -F "amount=15000" \
  -F "payment_proof_image=@receipt.jpg"

# Test verification
curl -X POST http://localhost:8000/api/manual-payment-proofs/1/verify/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verification_status": "verified", "verification_notes": "Valid payment"}'
```

## 📈 Benefits

1. **Flexible Payment**: Tenants can pay through any method and upload proof
2. **Owner Control**: Owners can verify payments before marking as complete
3. **Audit Trail**: Complete history of payment proofs and verifications
4. **Automated Processing**: Verified payments automatically create payment records
5. **File Management**: Secure storage of payment proof images
6. **Admin Access**: Easy management through Django admin interface

---

## 🎉 Feature Complete!

The manual payment proof upload feature is now fully implemented and ready for use. Tenants can upload payment receipts, and owners can verify them through the API or Django admin interface.
