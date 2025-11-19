-- Migration: Add HTS KYC support to IP Assets
-- This migration adds KYC-related fields and tables for HTS KYC enforcement

-- Add HTS KYC fields to existing ip_assets table
ALTER TABLE ip_assets 
ADD COLUMN hts_token_address VARCHAR(42),
ADD COLUMN nft_token_id BIGINT,
ADD COLUMN kyc_required BOOLEAN DEFAULT true;

-- Create ip_asset_kyc_status table
CREATE TABLE ip_asset_kyc_status (
    id VARCHAR(25) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ip_asset_id VARCHAR(25) NOT NULL,
    account VARCHAR(42) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_ip_asset_kyc_status_ip_asset 
        FOREIGN KEY (ip_asset_id) REFERENCES ip_assets(id) ON DELETE CASCADE,
    
    CONSTRAINT unique_ip_asset_account 
        UNIQUE (ip_asset_id, account)
);

-- Create hts_kyc_keys table
CREATE TABLE hts_kyc_keys (
    id VARCHAR(25) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contract_address VARCHAR(42) NOT NULL,
    key_type VARCHAR(20) NOT NULL,
    key_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_contract_key_type 
        UNIQUE (contract_address, key_type)
);

-- Create hts_kyc_events table
CREATE TABLE hts_kyc_events (
    id VARCHAR(25) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contract_address VARCHAR(42) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    account VARCHAR(42),
    key_value TEXT,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_tx_log_index 
        UNIQUE (transaction_hash, log_index)
);

-- Create indexes for better performance
CREATE INDEX idx_ip_asset_kyc_status_account ON ip_asset_kyc_status(account);
CREATE INDEX idx_ip_asset_kyc_status_status ON ip_asset_kyc_status(status);
CREATE INDEX idx_hts_kyc_keys_contract ON hts_kyc_keys(contract_address);
CREATE INDEX idx_hts_kyc_keys_type ON hts_kyc_keys(key_type);
CREATE INDEX idx_hts_kyc_events_contract ON hts_kyc_events(contract_address);
CREATE INDEX idx_hts_kyc_events_type ON hts_kyc_events(event_type);
CREATE INDEX idx_hts_kyc_events_timestamp ON hts_kyc_events(timestamp);

-- Add comments for documentation
COMMENT ON TABLE ip_asset_kyc_status IS 'Tracks KYC status for accounts on specific IP assets';
COMMENT ON TABLE hts_kyc_keys IS 'Stores HTS KYC keys for contract management';
COMMENT ON TABLE hts_kyc_events IS 'Logs all KYC-related events from HTS contracts';

COMMENT ON COLUMN ip_assets.hts_token_address IS 'HTS token address for KYC enforcement';
COMMENT ON COLUMN ip_assets.nft_token_id IS 'HTS NFT token ID';
COMMENT ON COLUMN ip_assets.kyc_required IS 'Whether KYC is required for this asset';

COMMENT ON COLUMN ip_asset_kyc_status.status IS 'KYC status: pending, granted, revoked';
COMMENT ON COLUMN hts_kyc_keys.key_type IS 'Key type: SUPPLY, ADMIN, KYC';
COMMENT ON COLUMN hts_kyc_events.event_type IS 'Event type: KYCGranted, KYCRevoked, KYCKeyUpdated';

