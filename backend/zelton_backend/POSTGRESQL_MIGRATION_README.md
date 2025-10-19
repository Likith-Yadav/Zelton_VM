# PostgreSQL Migration Guide for ZeltonLivings

This guide will help you migrate your ZeltonLivings application from SQLite to PostgreSQL and set up the database files in the `/ZeltonLivings/dbdata` directory.

## 🗄️ Database Configuration

- **Database Name**: `zelton_db`
- **Username**: `zelton_user`
- **Password**: `Zelton@12345`
- **Host**: `localhost`
- **Port**: `5432`
- **Data Directory**: `/ZeltonLivings/dbdata`

## 📁 Directory Structure

After migration, your data will be organized as follows:

```
/ZeltonLivings/dbdata/
├── media/                 # User uploaded files
├── logs/                  # Application logs
│   ├── django.log
│   └── phonepe.log
└── postgresql_data/       # PostgreSQL data files (if using local data directory)
```

## 🚀 Migration Steps

### Step 1: Prerequisites

Make sure you have the following installed:
- PostgreSQL 12 or higher
- Python 3.8 or higher
- pip (Python package manager)

### Step 2: Backup Current Data (Recommended)

Before starting the migration, create a backup of your current SQLite data:

```bash
cd /ZeltonLivings/appsdata/backend/zelton_backend
python backup_sqlite.py
```

This will create a timestamped backup in the `backup/` directory.

### Step 3: Run the Migration Script

Execute the automated setup script:

```bash
cd /ZeltonLivings/appsdata/backend/zelton_backend
./setup_postgresql.sh
```

This script will:
1. Install PostgreSQL dependencies
2. Create the database and user
3. Run Django migrations
4. Migrate data from SQLite to PostgreSQL
5. Move media files to the new directory
6. Set up proper permissions

### Step 4: Manual Migration (Alternative)

If the automated script doesn't work, you can run the migration manually:

#### 4.1: Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE USER zelton_user WITH PASSWORD 'Zelton@12345';
CREATE DATABASE zelton_db OWNER zelton_user;
GRANT ALL PRIVILEGES ON DATABASE zelton_db TO zelton_user;
ALTER USER zelton_user CREATEDB;
\q
```

#### 4.2: Run Django Migrations

```bash
cd /ZeltonLivings/appsdata/backend/zelton_backend
python manage.py migrate
```

#### 4.3: Migrate Data

```bash
python migrate_to_postgresql.py
```

### Step 5: Verify Migration

Test that everything is working:

```bash
# Test database connection
python manage.py dbshell

# Run the development server
python manage.py runserver
```

## 🔧 Configuration Changes Made

The following files have been updated to use PostgreSQL:

### 1. Database Configuration (`settings.py`)

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "zelton_db",
        "USER": "zelton_user",
        "PASSWORD": "Zelton@12345",
        "HOST": "localhost",
        "PORT": "5432",
        "OPTIONS": {
            'MAX_CONNS': 20,
        },
        'CONN_MAX_AGE': 600,
    }
}
```

### 2. Media Files Configuration

```python
MEDIA_URL = "/media/"
MEDIA_ROOT = "/ZeltonLivings/dbdata/media"
```

### 3. Logging Configuration

```python
# Logs are now stored in /ZeltonLivings/dbdata/logs/
'filename': '/ZeltonLivings/dbdata/logs/django.log'
'filename': '/ZeltonLivings/dbdata/logs/phonepe.log'
```

## 🛠️ Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   sudo chown -R postgres:postgres /ZeltonLivings/dbdata
   sudo chmod -R 700 /ZeltonLivings/dbdata
   ```

2. **Database Connection Failed**
   - Check if PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify database credentials
   - Check firewall settings

3. **Migration Errors**
   - Check Django logs in `/ZeltonLivings/dbdata/logs/`
   - Verify all dependencies are installed
   - Run `python manage.py check` to validate configuration

4. **Media Files Not Loading**
   - Check file permissions on `/ZeltonLivings/dbdata/media/`
   - Verify Django can access the directory

### Rollback to SQLite

If you need to rollback to SQLite:

1. Restore from backup:
   ```bash
   cp backup/sqlite_backup_*/db.sqlite3 ./
   cp -r backup/sqlite_backup_*/media ./
   ```

2. Update `settings.py` to use SQLite:
   ```python
   DATABASES = {
       "default": {
           "ENGINE": "django.db.backends.sqlite3",
           "NAME": BASE_DIR / "db.sqlite3",
       }
   }
   ```

## 📊 Performance Benefits

PostgreSQL offers several advantages over SQLite:

- **Concurrent Access**: Multiple users can access the database simultaneously
- **Better Performance**: Optimized for larger datasets
- **Advanced Features**: Full-text search, JSON fields, custom functions
- **Scalability**: Can handle production workloads
- **Data Integrity**: ACID compliance and advanced constraints

## 🔒 Security Considerations

- Change default passwords in production
- Use environment variables for sensitive data
- Enable SSL connections for production
- Regular database backups
- Monitor database logs

## 📝 Next Steps

After successful migration:

1. **Test all functionality** to ensure everything works
2. **Update your deployment scripts** to use PostgreSQL
3. **Set up regular backups** of the PostgreSQL database
4. **Monitor performance** and optimize as needed
5. **Consider using a connection pooler** for production

## 🆘 Support

If you encounter issues during migration:

1. Check the logs in `/ZeltonLivings/dbdata/logs/`
2. Verify all configuration changes
3. Test database connectivity manually
4. Review Django error messages

---

**Note**: This migration preserves all your existing data while moving to a more robust database system. The SQLite database file (`db.sqlite3`) can be safely removed after verifying the migration was successful.
