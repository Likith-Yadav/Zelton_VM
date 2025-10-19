# Zelton Backend Production Setup

This guide provides complete instructions for setting up a production-ready Django backend server using **Nginx + Gunicorn** architecture.

## 🏗️ Architecture Overview

```
Internet → Nginx (Port 80/443) → Gunicorn (Port 8000) → Django App
```

### Components:
- **Nginx**: Reverse proxy, SSL termination, static file serving, rate limiting
- **Gunicorn**: WSGI server for Django application
- **PostgreSQL**: Production database
- **Redis**: Caching and Celery message broker
- **Systemd**: Service management

## 📋 Prerequisites

- Ubuntu 20.04+ server
- Domain name pointing to your server
- Root or sudo access
- Basic knowledge of Linux commands

## 🚀 Quick Deployment

### 1. Run the Deployment Script

```bash
cd /ZeltonLivings/appsdata/backend/zelton_backend
./deploy.sh
```

This script will:
- Install all system dependencies
- Set up PostgreSQL and Redis
- Configure Nginx and Gunicorn
- Set up systemd services
- Configure firewall
- Set up log rotation

### 2. Configure Environment Variables

```bash
# Copy the template and update with your values
cp production.env.template .env.production
nano .env.production
```

Update the following critical values:
- `SECRET_KEY`: Generate a strong secret key
- `ALLOWED_HOSTS`: Your domain names
- `DB_PASSWORD`: Secure database password
- `PHONEPE_*`: Production PhonePe credentials
- `EMAIL_*`: Email service configuration

### 3. Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 4. Start Services

```bash
./manage.sh start
```

## 🔧 Configuration Files

### Gunicorn Configuration (`gunicorn.conf.py`)
- Worker processes: CPU cores × 2 + 1
- Worker timeout: 30 seconds
- Logging: `/var/log/zelton/`
- Process management and security settings

### Nginx Configuration (`nginx.conf`)
- SSL/TLS termination
- Static file serving
- Rate limiting for API endpoints
- Security headers
- Gzip compression
- Proxy settings for Django

### Production Settings (`settings_production.py`)
- Security hardening
- Database optimization
- Logging configuration
- Cache settings
- Email configuration
- Sentry integration

### Systemd Service (`zelton-backend.service`)
- Automatic startup
- Process management
- Security restrictions
- Resource limits

## 🛠️ Management Commands

Use the management script for easy operations:

```bash
# Service management
./manage.sh start          # Start services
./manage.sh stop           # Stop services
./manage.sh restart        # Restart services
./manage.sh status         # Show service status

# Deployment
./manage.sh deploy         # Deploy latest code
./manage.sh migrate        # Run database migrations
./manage.sh collect        # Collect static files

# Monitoring
./manage.sh logs           # Show service logs
./manage.sh monitor        # Show system monitoring
./manage.sh health         # Check application health

# Database
./manage.sh backup         # Backup database
./manage.sh restore <file> # Restore database

# Development
./manage.sh shell          # Open Django shell
./manage.sh test           # Run tests
```

## 🔒 Security Features

### SSL/TLS Security
- TLS 1.2+ only
- Strong cipher suites
- HSTS headers
- Perfect Forward Secrecy

### Application Security
- CSRF protection
- XSS protection
- Content Security Policy
- Secure cookies
- Rate limiting

### Server Security
- Firewall configuration
- Process isolation
- File permissions
- Log monitoring

## 📊 Monitoring & Logging

### Log Files
- `/var/log/zelton/django.log` - Django application logs
- `/var/log/zelton/phonepe.log` - PhonePe payment logs
- `/var/log/zelton/gunicorn_*.log` - Gunicorn logs
- `/var/log/nginx/zelton_*.log` - Nginx logs

### Health Checks
- Application health: `curl https://yourdomain.com/health/`
- Service status: `./manage.sh health`
- System monitoring: `./manage.sh monitor`

### Automated Monitoring
- Health checks every 5 minutes
- Log rotation and cleanup
- Error alerting (with Sentry)

## 🔄 Backup & Recovery

### Database Backup
```bash
# Manual backup
./manage.sh backup

# Automated backup (add to crontab)
0 2 * * * /ZeltonLivings/appsdata/backend/zelton_backend/manage.sh backup
```

### Recovery
```bash
# Restore from backup
./manage.sh restore /var/backups/zelton_backup_20240101_120000.sql
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status zelton-backend

# Check logs
sudo journalctl -u zelton-backend -f

# Check configuration
sudo nginx -t
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -c "SELECT 1;"
```

#### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

#### Performance Issues
```bash
# Check system resources
./manage.sh monitor

# Check application logs
./manage.sh logs

# Restart services
./manage.sh restart
```

### Log Analysis
```bash
# Check for errors
sudo journalctl -u zelton-backend | grep -i error

# Monitor real-time logs
sudo journalctl -u zelton-backend -f

# Check Nginx logs
sudo tail -f /var/log/nginx/zelton_error.log
```

## 📈 Performance Optimization

### Database Optimization
- Connection pooling enabled
- Query optimization
- Index optimization
- Regular maintenance

### Caching
- Redis for session storage
- Redis for application cache
- Static file caching in Nginx

### Load Balancing
- Multiple Gunicorn workers
- Nginx upstream configuration
- Health checks

## 🔧 Maintenance

### Regular Tasks
- Monitor logs for errors
- Check disk space
- Update system packages
- Renew SSL certificates
- Backup database

### Weekly Tasks
- Review performance metrics
- Check security logs
- Update application dependencies
- Test backup restoration

### Monthly Tasks
- Security updates
- Performance optimization review
- Capacity planning
- Documentation updates

## 📞 Support

### Emergency Contacts
- Technical Lead: tech-lead@zelton.com
- DevOps Engineer: devops@zelton.com
- PhonePe Support: integration@phonepe.com

### Escalation Process
1. Check logs and basic troubleshooting
2. Contact development team
3. Escalate to technical lead
4. Contact PhonePe support if payment-related

## 📚 Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Gunicorn Configuration](https://docs.gunicorn.org/en/stable/configure.html)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [PhonePe Integration Guide](./docs/phonepe_integration_summary.md)
- [Production Migration Guide](./docs/production_migration_guide.md)

## 🔄 Updates

To update the application:

```bash
# Pull latest code
git pull origin main

# Deploy updates
./manage.sh deploy

# Check health
./manage.sh health
```

## 📝 Notes

- Always test changes in a staging environment first
- Keep backups before major updates
- Monitor logs after deployments
- Update documentation when making changes
- Follow security best practices

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Maintainer**: Zelton Development Team
