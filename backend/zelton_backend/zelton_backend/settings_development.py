# Development settings for Zelton Backend
# This file contains development-specific settings with SSL disabled

import os
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Import base settings
from .settings import *

# Override for development
DEBUG = True

# Disable SSL settings for development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Session settings for development
SESSION_COOKIE_SAMESITE = 'None'  # Allow cross-origin requests for mobile apps
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Allow HTTP for development
ALLOWED_HOSTS = ['*']

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# CSRF settings for development
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.36:8000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://api.zelton.in',
]

# Disable CSRF for API endpoints in development
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_AGE = None

print("🔧 Development settings loaded - SSL disabled for local development")
