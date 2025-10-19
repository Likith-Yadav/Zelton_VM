# Email Configuration for ZeltonLivings

## Gmail SMTP Setup

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. This is required to generate app passwords

### Step 2: Generate App Password

1. Go to Google Account → Security → App passwords
2. Select "Mail" and "Other (Custom name)"
3. Enter "ZeltonLivings" as the name
4. Copy the generated 16-character password

### Step 3: Update Settings

In `zelton_backend/settings.py`, update these values:

```python
EMAIL_HOST_USER = 'your-actual-email@gmail.com'  # Your Gmail address
EMAIL_HOST_PASSWORD = 'your-16-char-app-password'  # The app password from step 2
```

### Step 4: Test Configuration

Run this command to test your email setup:

```bash
cd zelton_backend
source venv/bin/activate
python manage.py shell
```

Then run:

```python
from django.core.mail import send_mail
from django.conf import settings

send_mail(
    'Test Email',
    'This is a test email from ZeltonLivings.',
    settings.DEFAULT_FROM_EMAIL,
    ['your-test-email@gmail.com'],
    fail_silently=False,
)
```

## Alternative SMTP Providers

### Outlook/Hotmail

```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
```

### Yahoo

```python
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
```

### Custom SMTP Server

```python
EMAIL_HOST = 'your-smtp-server.com'
EMAIL_PORT = 587  # or 465 for SSL
EMAIL_USE_TLS = True  # or EMAIL_USE_SSL = True for SSL
```

## Development Testing

For development, you can use console backend to see emails in terminal:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

This will print emails to the console instead of sending them.

## Security Notes

1. **Never commit email credentials** to version control
2. **Use environment variables** for production:
   ```python
   import os
   EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
   EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
   ```
3. **Use app passwords** instead of your main Gmail password
4. **Enable 2FA** on your email account
