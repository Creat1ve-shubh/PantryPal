-- Migration: Add missing organization columns for Drizzle/Neon alignment
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS owner_name text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS owner_phone text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS owner_email text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS msme_number text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS business_address text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS business_city text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS business_state text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS business_pin text;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS kyc_status text DEFAULT 'pending';
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS verified_at timestamptz;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS verified_by integer;
ALTER TABLE organizations ADD COLUMN
IF NOT EXISTS verification_notes text;
