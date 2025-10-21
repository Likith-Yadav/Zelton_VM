# Subscription Renewal System - Implementation Guide

## Overview
This document describes the implementation of the subscription renewal system and downgrade prevention for the Zelton property management platform.

## Features Implemented

### 1. Subscription Renewal Management Command
**File**: `core/management/commands/process_subscription_renewals.py`

This command handles:
- Checking for expired subscriptions
- Creating renewal payments for expiring subscriptions
- Preventing duplicate renewal payments
- Automatic subscription period detection (monthly/yearly)

**Usage**:
```bash
# Check for renewals (default: 7 days before expiry)
python manage.py process_subscription_renewals

# Dry run mode (no changes made)
python manage.py process_subscription_renewals --dry-run

# Check for subscriptions expiring in 3 days
python manage.py process_subscription_renewals --days-before-expiry 3

# Only check for expired subscriptions
python manage.py process_subscription_renewals --check-expired-only
```

### 2. Enhanced Downgrade Prevention
**File**: `core/views.py` - `OwnerSubscriptionViewSet.initiate_payment()`

Features:
- Prevents owners from downgrading to plans with fewer units
- Provides clear error messages with sales contact information
- Allows upgrades and same-level plan renewals
- Includes detailed plan comparison in error response

**Error Response Example**:
```json
{
    "error": "Downgrade not allowed",
    "message": "You cannot downgrade to a plan with fewer units. Please contact our sales team at sales@zelton.in for assistance.",
    "contact_email": "sales@zelton.in",
    "current_plan": {
        "name": "Growth Plan",
        "max_units": 40
    },
    "requested_plan": {
        "name": "Starter Plan", 
        "max_units": 20
    }
}
```

### 3. Subscription Expiration Handling
**File**: `core/models.py` - `Owner` model

New properties added:
- `is_subscription_active`: Checks if subscription is active and not expired
- `is_subscription_expired`: Checks if subscription has expired
- `days_until_expiry`: Returns number of days until expiration
- `subscription_expiry_status`: Returns status ('active', 'expiring_soon', 'expiring_month', 'expired', 'no_plan')

### 4. Frontend Downgrade Prevention
**File**: `frontend/zelton_mobile/src/screens/PricingScreen.js`

Features:
- Prevents plan selection that would be a downgrade
- Shows alert with sales contact information
- Opens email client with pre-filled downgrade request
- Graceful error handling

## Cron Job Setup

### Production Deployment

Add these cron jobs to your production server:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Check for subscription renewals daily at 9 AM
0 9 * * * cd /path/to/zelton_backend && python manage.py process_subscription_renewals

# Check for expired subscriptions daily at 10 AM
0 10 * * * cd /path/to/zelton_backend && python manage.py process_subscription_renewals --check-expired-only

# Weekly audit of subscription status (Sundays at 11 AM)
0 11 * * 0 cd /path/to/zelton_backend && python manage.py process_subscription_renewals --days-before-expiry 14
```

### Docker/Container Deployment

If using Docker, add to your docker-compose.yml or deployment script:

```yaml
services:
  zelton-backend:
    # ... existing configuration
    command: >
      sh -c "
        python manage.py migrate &&
        python manage.py process_subscription_renewals --dry-run &&
        python manage.py runserver 0.0.0.0:8000
      "
```

Or create a separate cron container:

```yaml
services:
  zelton-cron:
    build: .
    command: >
      sh -c "
        while true; do
          python manage.py process_subscription_renewals
          sleep 86400  # 24 hours
        done
      "
    volumes:
      - .:/app
    environment:
      - DJANGO_SETTINGS_MODULE=zelton_backend.settings_production
```

## Testing

### Running Tests
```bash
# Run all subscription renewal tests
python manage.py test core.test_subscription_renewal -v 2

# Run specific test
python manage.py test core.test_subscription_renewal.SubscriptionRenewalTestCase.test_subscription_expiration_properties -v 2
```

### Test Coverage
The test suite covers:
- Subscription expiration properties
- Renewal command functionality
- Downgrade prevention API
- Dry run mode
- Duplicate payment prevention
- Subscription period detection

## Monitoring and Logging

### Log Files
The system logs important events to Django's logging system:

```python
# In settings.py
LOGGING = {
    'loggers': {
        'core.management.commands.process_subscription_renewals': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Key Log Events
- Subscription expiration notifications
- Renewal payment creation
- Downgrade attempt blocks
- Command execution results

## API Endpoints

### Subscription Management
- `POST /api/owner-subscriptions/initiate_payment/` - Initiate subscription payment (with downgrade prevention)
- `POST /api/owner-subscriptions/initiate_upgrade/` - Initiate upgrade payment
- `GET /api/owner-subscriptions/check_limits/` - Check current subscription limits
- `GET /api/owner-subscriptions/available_plans/` - Get available upgrade plans

### Error Handling
All endpoints return consistent error responses for downgrade attempts:
- HTTP 400 status code
- Clear error message
- Sales contact information
- Plan comparison details

## Security Considerations

### Downgrade Prevention
- Server-side validation prevents API bypass
- Frontend validation provides immediate feedback
- Clear error messages guide users to proper channels

### Subscription Status
- Automatic expiration handling prevents unauthorized access
- Renewal payments maintain service continuity
- Audit logging tracks all subscription changes

## Troubleshooting

### Common Issues

1. **Timezone Warnings**
   ```
   RuntimeWarning: DateTimeField Owner.subscription_end_date received a naive datetime
   ```
   **Solution**: Use `timezone.now().date()` instead of `date.today()`

2. **Cron Job Not Running**
   - Check cron service status: `systemctl status cron`
   - Verify file paths in cron jobs
   - Check cron logs: `tail -f /var/log/cron`

3. **Renewal Payments Not Created**
   - Verify subscription end dates are set correctly
   - Check if existing renewal payments exist
   - Run command with `--dry-run` to see what would happen

### Debug Commands
```bash
# Check subscription status for all owners
python manage.py shell -c "
from core.models import Owner
for owner in Owner.objects.all():
    print(f'{owner.user.email}: {owner.subscription_expiry_status} ({owner.days_until_expiry} days)')
"

# Check for pending renewal payments
python manage.py shell -c "
from core.models import OwnerSubscriptionPayment
renewals = OwnerSubscriptionPayment.objects.filter(payment_type='renewal', status='pending')
print(f'Pending renewals: {renewals.count()}')
for renewal in renewals:
    print(f'{renewal.owner.user.email}: {renewal.amount} ({renewal.subscription_period})')
"
```

## Future Enhancements

### Planned Features
1. **Email Notifications**: Send renewal reminders via email
2. **Automatic Renewal**: Auto-charge credit cards for renewals
3. **Grace Period**: Allow temporary access after expiration
4. **Bulk Operations**: Admin interface for managing multiple subscriptions

### Integration Points
- Email service integration for notifications
- Payment gateway integration for auto-renewal
- Admin dashboard for subscription management
- Analytics for subscription metrics
