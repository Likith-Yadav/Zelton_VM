-- Fix database permissions for zelton_user
-- Run this as postgres superuser

-- Drop and recreate user with proper privileges
DROP USER IF EXISTS zelton_user;
CREATE USER zelton_user WITH PASSWORD 'Zelton@12345' CREATEDB CREATEROLE;

-- Drop and recreate database
DROP DATABASE IF EXISTS zelton_db;
CREATE DATABASE zelton_db OWNER zelton_user;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE zelton_db TO zelton_user;

-- Connect to the database and grant schema privileges
\c zelton_db
GRANT ALL ON SCHEMA public TO zelton_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zelton_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zelton_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO zelton_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO zelton_user;
