# EmailJS Setup Instructions

## Overview

This app uses EmailJS to send OTP verification emails during user registration. Follow these steps to configure EmailJS for your app.

## Setup Steps

### 1. Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Create Email Service

1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions for your provider
5. Note down your **Service ID** (e.g., `service_5hv2s12`)

### 3. Create Email Template

1. Go to "Email Templates" in EmailJS dashboard
2. Click "Create New Template"
3. Use this template content:

**Subject:** `ZeltonLivings - Email Verification`

**Content:**

```
Hello {{to_name}},

Welcome to ZeltonLivings! Please use the following verification code to complete your registration:

Verification Code: {{verification_code}}

This code will expire in 10 minutes.

If you didn't request this verification, please ignore this email.

Best regards,
ZeltonLivings Team
```

4. Save the template and note down your **Template ID** (e.g., `template_51likw8`)

### 4. Get Public Key

1. Go to "Account" → "General"
2. Find your **Public Key** (starts with `user_`)

### 5. Update App Configuration

1. Open `/zelton_mobile/src/services/emailService.js`
2. Update the configuration:

```javascript
class EmailService {
  constructor() {
    // Update these values with your EmailJS credentials
    this.serviceId = "service_5hv2s12";
    this.templateId = "template_51likw8";
    this.publicKey = "aPHpCTGGPnv_SVUyl"; // Your EmailJS public key
  }
  // ... rest of the code
}
```

**Note**: The app is already configured with your EmailJS credentials and ready for production use.

### 6. Test the Setup

1. Run the app
2. Try registering a new user
3. Check if the OTP email is received
4. Verify the OTP verification works

## Template Variables

The EmailJS template uses these variables:

- `{{to_name}}` - User's full name
- `{{to_email}}` - User's email address
- `{{verification_code}}` - 6-digit OTP code

## Security Notes

- The current implementation generates OTP client-side for simplicity
- In production, consider generating OTP server-side and storing it securely
- Add rate limiting to prevent OTP spam
- Consider adding OTP expiration (currently handled by timer in the app)

## Troubleshooting

- Check EmailJS dashboard for delivery logs
- Verify service and template IDs are correct
- Ensure public key is properly set
- Check spam folder for test emails
- Verify email provider settings in EmailJS

## Free Tier Limits

EmailJS free tier includes:

- 200 emails per month
- Basic templates
- Standard support

For higher volumes, consider upgrading to a paid plan.
