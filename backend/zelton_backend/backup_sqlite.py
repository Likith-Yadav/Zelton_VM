#!/usr/bin/env python
"""
Backup SQLite database before migration to PostgreSQL
"""

import os
import sys
import shutil
from pathlib import Path
from datetime import datetime

def backup_sqlite_database():
    """
    Create a backup of the SQLite database and media files
    """
    project_dir = Path(__file__).resolve().parent
    backup_dir = project_dir / "backup" / f"sqlite_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    print(f"Creating backup in: {backup_dir}")
    
    try:
        # Create backup directory
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup SQLite database
        sqlite_db = project_dir / "db.sqlite3"
        if sqlite_db.exists():
            shutil.copy2(sqlite_db, backup_dir / "db.sqlite3")
            print(f"✓ SQLite database backed up")
        else:
            print("⚠ No SQLite database found")
        
        # Backup media files
        media_dir = project_dir / "media"
        if media_dir.exists():
            shutil.copytree(media_dir, backup_dir / "media")
            print(f"✓ Media files backed up")
        else:
            print("⚠ No media directory found")
        
        # Backup logs
        logs_dir = project_dir / "logs"
        if logs_dir.exists():
            shutil.copytree(logs_dir, backup_dir / "logs")
            print(f"✓ Logs backed up")
        else:
            print("⚠ No logs directory found")
        
        print(f"\n✅ Backup completed successfully!")
        print(f"Backup location: {backup_dir}")
        print(f"You can restore from this backup if needed.")
        
        return True
        
    except Exception as e:
        print(f"❌ Backup failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("SQLite Database Backup Script")
    print("=" * 50)
    
    if backup_sqlite_database():
        print("\nBackup completed successfully!")
    else:
        print("\nBackup failed!")
        sys.exit(1)
