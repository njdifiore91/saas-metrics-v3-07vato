#!/bin/bash

# Startup Metrics Benchmarking Platform - Database Initialization Script
# Version: 1.0.0
# PostgreSQL Version: 14
# Dependencies: postgresql-client-14

# Set strict error handling
set -euo pipefail
IFS=$'\n\t'

# Default configuration
PGHOST=${PGHOST:-"localhost"}
PGPORT=${PGPORT:-"5432"}
PGDATABASE=${PGDATABASE:-"startup_metrics"}
PGUSER=${PGUSER:-"postgres"}
MAX_RETRIES=${MAX_RETRIES:-3}
TIMEOUT_SECONDS=${TIMEOUT_SECONDS:-30}
LOG_LEVEL=${LOG_LEVEL:-"INFO"}

# Logging utilities
log() {
    local level=$1
    shift
    if [[ $LOG_LEVEL == "DEBUG" || $level != "DEBUG" ]]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*"
    fi
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# PostgreSQL version compatibility check
check_postgres() {
    local retry_count=$1
    local timeout=$2
    local attempt=1

    while [ $attempt -le $retry_count ]; do
        log "INFO" "Attempting PostgreSQL connection (attempt $attempt/$retry_count)"
        
        if PGCONNECT_TIMEOUT=$timeout psql -V >/dev/null 2>&1; then
            local version=$(psql -V | grep -oP 'psql \(PostgreSQL\) \K[0-9]+')
            if [ "$version" -lt 14 ]; then
                error_exit "PostgreSQL version $version detected. Version 14 or higher required."
            fi
            
            if psql -c '\conninfo' >/dev/null 2>&1; then
                log "INFO" "Successfully connected to PostgreSQL server"
                return 0
            fi
        fi

        log "WARN" "Connection attempt $attempt failed. Retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done

    error_exit "Failed to connect to PostgreSQL server after $retry_count attempts"
}

# Database creation and configuration
create_database() {
    log "INFO" "Creating database $PGDATABASE if not exists"
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw "$PGDATABASE"; then
        log "INFO" "Database $PGDATABASE already exists"
        return 0
    fi

    # Create database with proper encoding and collation
    psql -c "CREATE DATABASE $PGDATABASE
             WITH ENCODING = 'UTF8'
             LC_COLLATE = 'en_US.UTF-8'
             LC_CTYPE = 'en_US.UTF-8'
             TEMPLATE = template0;" || error_exit "Failed to create database"

    # Enable required extensions
    psql -d "$PGDATABASE" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    psql -d "$PGDATABASE" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
    psql -d "$PGDATABASE" -c "CREATE EXTENSION IF NOT EXISTS \"timescaledb\";"

    # Configure WAL archiving
    psql -c "ALTER SYSTEM SET wal_level = replica;"
    psql -c "ALTER SYSTEM SET archive_mode = on;"
    psql -c "ALTER SYSTEM SET archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f';"
    
    log "INFO" "Database created and configured successfully"
}

# Execute database migrations
run_migrations() {
    log "INFO" "Running database migrations"
    
    # Create migrations backup
    local backup_dir="/var/lib/postgresql/backups/migrations"
    mkdir -p "$backup_dir"
    local backup_file="$backup_dir/pre_migration_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump -d "$PGDATABASE" -f "$backup_file" || log "WARN" "Failed to create pre-migration backup"

    # Execute migrations in transaction
    local migration_files=(
        "0000_initial_setup.sql"
        "0001_user_schema.sql"
        "0002_metrics_schema.sql"
    )

    for migration in "${migration_files[@]}"; do
        log "INFO" "Applying migration: $migration"
        if ! psql -d "$PGDATABASE" -f "$migration" -v ON_ERROR_STOP=1; then
            log "ERROR" "Migration $migration failed"
            log "INFO" "Attempting to restore from backup"
            psql -d "$PGDATABASE" -f "$backup_file"
            error_exit "Migration failed and rollback completed"
        fi
    done

    log "INFO" "Migrations completed successfully"
}

# Setup database permissions and security
setup_permissions() {
    log "INFO" "Configuring database permissions and security"

    # Create application roles
    psql -d "$PGDATABASE" <<-EOSQL
        -- Create application roles
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'startup_metrics_admin') THEN
                CREATE ROLE startup_metrics_admin;
            END IF;
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'startup_metrics_user') THEN
                CREATE ROLE startup_metrics_user;
            END IF;
        END
        \$\$;

        -- Configure role permissions
        GRANT CONNECT ON DATABASE $PGDATABASE TO startup_metrics_user;
        GRANT USAGE ON SCHEMA startup_metrics TO startup_metrics_user;
        GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA startup_metrics TO startup_metrics_user;
        
        -- Setup row level security
        ALTER TABLE startup_metrics.companies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE startup_metrics.users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE startup_metrics.company_metrics ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY company_access ON startup_metrics.companies
            FOR ALL
            TO startup_metrics_user
            USING (id IN (SELECT company_id FROM startup_metrics.users WHERE email = current_user));

        -- Configure connection pooling
        ALTER SYSTEM SET max_connections = '200';
        ALTER SYSTEM SET shared_buffers = '1GB';
        ALTER SYSTEM SET work_mem = '32MB';
EOSQL

    log "INFO" "Permissions and security configuration completed"
}

# Main execution flow
main() {
    log "INFO" "Starting database initialization"
    
    # Check PostgreSQL connection
    check_postgres "$MAX_RETRIES" "$TIMEOUT_SECONDS"
    
    # Create and configure database
    create_database
    
    # Run migrations
    run_migrations
    
    # Setup permissions
    setup_permissions
    
    log "INFO" "Database initialization completed successfully"
}

# Execute main function
main "$@"