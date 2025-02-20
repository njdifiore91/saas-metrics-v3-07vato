-- PostgreSQL 14 Migration Script for User Schema
-- Depends on: 0000_initial_setup.sql

-- Set search path to ensure proper schema resolution
SET search_path TO startup_metrics, public;

-- Create user role enumeration type for role-based access control
CREATE TYPE startup_metrics.user_role_enum AS ENUM (
    'COMPANY_USER',
    'ANALYST',
    'ADMIN'
);

-- Create users table with comprehensive user management capabilities
CREATE TABLE startup_metrics.users (
    -- Primary identifier using UUID for security and scalability
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core user information
    email VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    company_id UUID NOT NULL,
    
    -- User preferences stored as JSONB for flexibility
    preferences JSONB DEFAULT '{}',
    
    -- Authentication and audit timestamps
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint to ensure valid company references
    CONSTRAINT fk_users_company 
        FOREIGN KEY (company_id) 
        REFERENCES startup_metrics.companies(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    -- Ensure email uniqueness across the system
    CONSTRAINT users_email_unique UNIQUE (email),
    
    -- Data validation constraints
    CONSTRAINT users_email_not_empty CHECK (length(trim(email)) > 0),
    CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create optimized indexes for frequent query patterns
CREATE UNIQUE INDEX users_email_idx ON startup_metrics.users USING btree (email);
CREATE INDEX users_company_id_idx ON startup_metrics.users USING btree (company_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON startup_metrics.users
    FOR EACH ROW
    EXECUTE FUNCTION startup_metrics.trigger_set_timestamp();

-- Grant appropriate permissions (restrictive by default)
REVOKE ALL ON startup_metrics.users FROM PUBLIC;
REVOKE ALL ON TYPE startup_metrics.user_role_enum FROM PUBLIC;

-- Add table comment for documentation
COMMENT ON TABLE startup_metrics.users IS 'Core table for storing user information with role-based access control';

-- Add column comments for documentation
COMMENT ON COLUMN startup_metrics.users.id IS 'Unique identifier for user records';
COMMENT ON COLUMN startup_metrics.users.email IS 'User email address used for authentication';
COMMENT ON COLUMN startup_metrics.users.role IS 'User role determining system access permissions';
COMMENT ON COLUMN startup_metrics.users.company_id IS 'Reference to associated company';
COMMENT ON COLUMN startup_metrics.users.preferences IS 'User-specific preferences and settings';
COMMENT ON COLUMN startup_metrics.users.last_login IS 'Timestamp of most recent user login';
COMMENT ON COLUMN startup_metrics.users.created_at IS 'Timestamp of record creation';
COMMENT ON COLUMN startup_metrics.users.updated_at IS 'Timestamp of last record update';