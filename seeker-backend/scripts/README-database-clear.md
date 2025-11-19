# Database Clearing Scripts

This directory contains scripts to clear data from the PostgreSQL database.

## Available Scripts

### 1. `clear-database.cjs` - Simple Clear All
**Usage:** `pnpm run db:clear`

This script clears ALL tables in the database without any prompts or options.

**What it clears:**
- All IP assets, licenses, royalties, and payments
- All user data
- All contract-related data (locks, HBAR tokens, arbitration)
- All legacy data (KYC, assets)
- All event queue and contract state data

### 2. `advanced-clear-database.cjs` - Interactive Clear
**Usage:** `pnpm run db:clear-advanced`

This script provides an interactive menu with options:

1. **Clear ALL tables** - Complete database reset
2. **Clear contract data only** - Keeps users and platform config
3. **Clear legacy data only** - Only clears KYC and legacy assets
4. **Show table counts only** - Displays current data without clearing
5. **Exit** - Quit without changes

**Features:**
- Shows current table counts before and after operations
- Requires confirmation for destructive operations
- Handles foreign key constraints properly
- Provides detailed progress feedback

## Safety Features

- **Foreign Key Handling**: Tables are cleared in the correct order to avoid constraint violations
- **Confirmation Prompts**: Destructive operations require explicit confirmation
- **Progress Feedback**: Shows which tables are being cleared
- **Error Handling**: Graceful error handling with detailed error messages

## Usage Examples

```bash
# Clear all data (simple)
pnpm run db:clear

# Interactive clearing with options
pnpm run db:clear-advanced

# Show current database state
pnpm run db:clear-advanced
# Then select option 4
```

## Table Clearing Order

The scripts clear tables in this order to respect foreign key constraints:

1. **Dependent Tables First:**
   - arbitration_evidence
   - arbitration_votes
   - arbitration_cases
   - tokenized_asset_transfers
   - tokenized_assets
   - event_queue
   - contract_states
   - hbar_token_transactions
   - hbar_token_balances
   - ip_asset_unlock_events
   - ip_asset_locks
   - ip_asset_transactions
   - payments
   - royalty_claims
   - royalty_shares
   - royalties
   - license_mints
   - licenses
   - ip_assets

2. **Independent Tables:**
   - users
   - platform_config

3. **Legacy Tables:**
   - kyc
   - assets

## Warning

⚠️ **These scripts will permanently delete data from your database. Make sure you have backups if needed.**

## Prerequisites

- PostgreSQL database must be running
- `DATABASE_URL` environment variable must be set
- Prisma client must be generated (`pnpm run db:generate`)
