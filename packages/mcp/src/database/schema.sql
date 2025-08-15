-- Database schema for LedgerMind Payment Intents

-- Table for tracking payment intents
CREATE TABLE IF NOT EXISTS intents (
    address VARCHAR(42) PRIMARY KEY,
    payer VARCHAR(42) NOT NULL,
    agent VARCHAR(42) NOT NULL,
    token VARCHAR(42) NOT NULL,
    total_cap NUMERIC(78, 0) NOT NULL, -- Support up to 256-bit integers
    per_tx_cap NUMERIC(78, 0) NOT NULL,
    spent NUMERIC(78, 0) DEFAULT 0,
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    state INTEGER DEFAULT 0, -- 0=Active, 1=Revoked, 2=Expired
    metadata_uri TEXT,
    salt VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL
);

-- Table for tracking allowed merchants per intent
CREATE TABLE IF NOT EXISTS merchants (
    intent_address VARCHAR(42) NOT NULL,
    merchant VARCHAR(42) NOT NULL,
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (intent_address, merchant),
    FOREIGN KEY (intent_address) REFERENCES intents(address) ON DELETE CASCADE
);

-- Table for tracking payment receipts
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    intent_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    merchant VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    token VARCHAR(42) NOT NULL,
    receipt_hash VARCHAR(66) NOT NULL,
    receipt_uri TEXT,
    timestamp BIGINT NOT NULL,
    block_number BIGINT NOT NULL,
    gas_used BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intent_address) REFERENCES intents(address) ON DELETE CASCADE
);

-- Table for tracking intent revocations
CREATE TABLE IF NOT EXISTS revocations (
    id SERIAL PRIMARY KEY,
    intent_address VARCHAR(42) NOT NULL,
    revoked_by VARCHAR(42) NOT NULL,
    reason TEXT,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intent_address) REFERENCES intents(address) ON DELETE CASCADE
);

-- Table for tracking top-ups
CREATE TABLE IF NOT EXISTS top_ups (
    id SERIAL PRIMARY KEY,
    intent_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intent_address) REFERENCES intents(address) ON DELETE CASCADE
);

-- Table for tracking withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    intent_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intent_address) REFERENCES intents(address) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_intents_payer ON intents(payer);
CREATE INDEX IF NOT EXISTS idx_intents_agent ON intents(agent);
CREATE INDEX IF NOT EXISTS idx_intents_state ON intents(state);
CREATE INDEX IF NOT EXISTS idx_intents_created_at ON intents(created_at);
CREATE INDEX IF NOT EXISTS idx_intents_block_number ON intents(block_number);

CREATE INDEX IF NOT EXISTS idx_receipts_intent_address ON receipts(intent_address);
CREATE INDEX IF NOT EXISTS idx_receipts_merchant ON receipts(merchant);
CREATE INDEX IF NOT EXISTS idx_receipts_timestamp ON receipts(timestamp);
CREATE INDEX IF NOT EXISTS idx_receipts_block_number ON receipts(block_number);

CREATE INDEX IF NOT EXISTS idx_merchants_merchant ON merchants(merchant);
CREATE INDEX IF NOT EXISTS idx_merchants_allowed ON merchants(allowed);

CREATE INDEX IF NOT EXISTS idx_revocations_intent_address ON revocations(intent_address);
CREATE INDEX IF NOT EXISTS idx_revocations_revoked_by ON revocations(revoked_by);

CREATE INDEX IF NOT EXISTS idx_top_ups_intent_address ON top_ups(intent_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_intent_address ON withdrawals(intent_address);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_intents_updated_at
    BEFORE UPDATE ON intents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants  
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW intent_summary AS
SELECT 
    i.address,
    i.payer,
    i.agent,
    i.token,
    i.total_cap,
    i.per_tx_cap,
    i.spent,
    i.start_time,
    i.end_time,
    i.state,
    i.metadata_uri,
    i.created_at,
    i.updated_at,
    COUNT(r.id) as payment_count,
    COALESCE(SUM(r.amount), 0) as total_payments,
    MAX(r.timestamp) as last_payment_at
FROM intents i
LEFT JOIN receipts r ON i.address = r.intent_address
GROUP BY i.address, i.payer, i.agent, i.token, i.total_cap, i.per_tx_cap, 
         i.spent, i.start_time, i.end_time, i.state, i.metadata_uri, 
         i.created_at, i.updated_at;