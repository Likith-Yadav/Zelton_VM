# PhonePe Production Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from PhonePe UAT/SANDBOX environment to production environment.

## Prerequisites

### 1. UAT Sign-off Requirements

Before proceeding to production, ensure:

- [ ] All UAT test cases pass successfully
- [ ] PhonePe UAT sign-off received
- [ ] Production credentials received from PhonePe
- [ ] Webhook URLs tested and verified
- [ ] All payment flows tested end-to-end

### 2. Production Environment Setup

- [ ] Production server configured
- [ ] SSL certificates installed
- [ ] Domain name configured
- [ ] Database migrated to production
- [ ] Environment variables configured

## Migration Steps

### Step 1: Update Environment Configuration

#### 1.1 Update .env File

Replace UAT credentials with production credentials:

```bash
# Production PhonePe Configuration
PHONEPE_CLIENT_ID=PROD_CLIENT_ID_FROM_PHONEPE
PHONEPE_CLIENT_SECRET=PROD_CLIENT_SECRET_FROM_PHONEPE
PHONEPE_CLIENT_VERSION=1
PHONEPE_ENVIRONMENT=PRODUCTION
PHONEPE_WEBHOOK_USERNAME=prod_webhook_user
PHONEPE_WEBHOOK_PASSWORD=prod_webhook_pass_2024
PHONEPE_REDIRECT_BASE_URL=https://yourdomain.com

# Production Django Configuration
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

#### 1.2 Update Django Settings

Ensure production settings are configured:

```python
# settings.py
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### Step 2: Update PhonePe Configuration

#### 2.1 PhonePe Service Configuration

The PhonePe service will automatically use production environment based on the `PHONEPE_ENVIRONMENT` setting:

```python
# core/services/phonepe_service.py
env = Env.PRODUCTION if settings.PHONEPE_ENVIRONMENT == 'PRODUCTION' else Env.SANDBOX
```

#### 2.2 Webhook Configuration

Update webhook URLs in PhonePe dashboard:

- **Production Webhook URL**: `https://yourdomain.com/api/webhooks/phonepe-webhook/`
- **Redirect URLs**: Update all redirect URLs to use production domain

### Step 3: Database Migration

#### 3.1 Backup UAT Database

```bash
# Create backup
python manage.py dumpdata > uat_backup.json

# Or for PostgreSQL
pg_dump -h localhost -U username -d database_name > uat_backup.sql
```

#### 3.2 Migrate to Production Database

```bash
# Apply migrations
python manage.py migrate

# Load initial data if needed
python manage.py loaddata initial_data.json
```

### Step 4: Update Mobile App Configuration

#### 4.1 Update API Base URL

```javascript
// zelton_mobile/src/constants/constants.js
export const API_BASE_URL = "https://yourdomain.com/api";
```

#### 4.2 Update Payment Redirect URLs

Ensure all payment redirect URLs point to production domain.

### Step 5: SSL and Security Configuration

#### 5.1 SSL Certificate Setup

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 5.2 Security Headers

```python
# settings.py
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### Step 6: Monitoring and Logging

#### 6.1 Production Logging

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/zelton/django.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'phonepe_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/zelton/phonepe.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'core.services.phonepe_service': {
            'handlers': ['phonepe_file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

#### 6.2 Monitoring Setup

```python
# Install monitoring packages
pip install django-health-check
pip install sentry-sdk

# settings.py
INSTALLED_APPS = [
    # ... other apps
    'health_check',
    'health_check.db',
    'health_check.cache',
]

# Sentry configuration
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    integrations=[DjangoIntegration()],
    traces_sample_rate=1.0,
    send_default_pii=True
)
```

### Step 7: Cron Jobs for Reconciliation

#### 7.1 Setup Cron Jobs

```bash
# crontab -e
# Run payment reconciliation every 5 minutes
*/5 * * * * cd /path/to/zelton_backend && python manage.py reconcile_pending_payments

# Run refund reconciliation every 10 minutes
*/10 * * * * cd /path/to/zelton_backend && python manage.py reconcile_pending_refunds

# Log rotation
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/zelton
```

#### 7.2 Logrotate Configuration

```bash
# /etc/logrotate.d/zelton
/var/log/zelton/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        /bin/kill -USR1 `cat /var/run/zelton.pid 2> /dev/null` 2> /dev/null || true
    endscript
}
```

### Step 8: Performance Optimization

#### 8.1 Database Optimization

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'zelton_production',
        'USER': 'zelton_user',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
        'OPTIONS': {
            'MAX_CONNS': 20,
        },
    }
}

# Connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 600
```

#### 8.2 Caching Configuration

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

### Step 9: Testing Production Setup

#### 9.1 Health Check Endpoints

```python
# urls.py
from django.urls import path, include
from health_check import urls as health_check_urls

urlpatterns = [
    path('health/', include(health_check_urls)),
    # ... other URLs
]
```

#### 9.2 Production Testing Checklist

- [ ] SSL certificate valid and working
- [ ] All API endpoints accessible
- [ ] Payment initiation working
- [ ] Webhook callbacks received
- [ ] Database connections stable
- [ ] Logging working correctly
- [ ] Cron jobs executing
- [ ] Monitoring alerts configured

### Step 10: Go-Live Checklist

#### 10.1 Pre-Launch

- [ ] All UAT tests passed
- [ ] Production environment configured
- [ ] SSL certificates installed
- [ ] Database migrated
- [ ] Monitoring setup
- [ ] Backup procedures tested
- [ ] Team trained on production procedures

#### 10.2 Launch Day

- [ ] Deploy to production
- [ ] Update DNS records
- [ ] Test critical payment flows
- [ ] Monitor system performance
- [ ] Verify webhook callbacks
- [ ] Check error logs

#### 10.3 Post-Launch

- [ ] Monitor payment success rates
- [ ] Check error rates
- [ ] Verify reconciliation processes
- [ ] Monitor system performance
- [ ] Review logs for issues
- [ ] Gather user feedback

## Rollback Plan

### Emergency Rollback Procedure

1. **Immediate Actions**

   ```bash
   # Switch DNS back to UAT
   # Disable production environment
   # Notify users of temporary service interruption
   ```

2. **Database Rollback**

   ```bash
   # Restore from backup
   pg_restore -h localhost -U username -d database_name uat_backup.sql
   ```

3. **Application Rollback**
   ```bash
   # Revert to previous version
   git checkout previous-stable-version
   # Restart services
   systemctl restart zelton-backend
   ```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Payment Metrics**

   - Payment success rate
   - Payment failure rate
   - Average payment processing time
   - Webhook callback success rate

2. **System Metrics**

   - Server CPU usage
   - Memory usage
   - Database connection pool
   - Response times

3. **Business Metrics**
   - Daily payment volume
   - Revenue tracking
   - User activity

### Alert Configuration

```python
# Example alert configuration
ALERT_THRESHOLDS = {
    'payment_failure_rate': 0.05,  # 5%
    'response_time': 5.0,  # 5 seconds
    'error_rate': 0.01,  # 1%
    'cpu_usage': 0.80,  # 80%
    'memory_usage': 0.85,  # 85%
}
```

## Support and Maintenance

### Daily Tasks

- [ ] Check payment success rates
- [ ] Review error logs
- [ ] Monitor system performance
- [ ] Verify reconciliation processes

### Weekly Tasks

- [ ] Review payment trends
- [ ] Check for failed payments
- [ ] Update monitoring dashboards
- [ ] Review security logs

### Monthly Tasks

- [ ] Performance optimization review
- [ ] Security audit
- [ ] Backup verification
- [ ] Capacity planning

## Contact Information

### Production Support Team

- **Technical Lead**: tech-lead@zelton.com
- **DevOps Engineer**: devops@zelton.com
- **PhonePe Support**: integration@phonepe.com
- **Emergency Contact**: +91-XXXXXXXXXX

### Escalation Matrix

1. **Level 1**: Development Team
2. **Level 2**: Technical Lead
3. **Level 3**: CTO
4. **Level 4**: PhonePe Escalation

## Documentation Updates

After successful production migration:

- [ ] Update API documentation
- [ ] Update user guides
- [ ] Update troubleshooting guides
- [ ] Update monitoring procedures
- [ ] Update backup procedures

## Version History

- **v1.0** - Initial production migration guide
- **v1.1** - Added monitoring and alerting
- **v1.2** - Added rollback procedures
- **v1.3** - Added performance optimization
