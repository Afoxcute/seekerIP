-- Drop all old tables
DROP TABLE IF EXISTS "assets";
DROP TABLE IF EXISTS "kyc";
DROP TABLE IF EXISTS "transactions";
DROP TABLE IF EXISTS "prices";
DROP TABLE IF EXISTS "lendingReserves";
DROP TABLE IF EXISTS "loans";
DROP TABLE IF EXISTS "liquidations";
DROP TABLE IF EXISTS "loanRepayment";
DROP TABLE IF EXISTS "providedLiquidity";
DROP TABLE IF EXISTS "withdrawnLiquidity";
DROP TABLE IF EXISTS "realwordAssetTimeseries";

-- Drop old IP asset tables if they exist
DROP TABLE IF EXISTS "ipAssetTransfers";
DROP TABLE IF EXISTS "ipLicenseMints";
DROP TABLE IF EXISTS "ipRevenueClaims";

-- Create new IP Asset Management Tables
CREATE TABLE "ipAssets" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "description" text NOT NULL,
    "metadataURI" text NOT NULL,
    "ipfsHash" text NOT NULL,
    "owner" text NOT NULL,
    "royaltyPercentage" integer NOT NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "totalRevenue" real NOT NULL DEFAULT 0,
    "licenseTokenId" text,
    "royaltyTokenId" text NOT NULL,
    "createdAt" timestamp NOT NULL,
    "lastModified" timestamp NOT NULL,
    "tokenId" integer NOT NULL
);

CREATE TABLE "licenses" (
    "id" text PRIMARY KEY,
    "ipAssetId" text NOT NULL,
    "terms" text NOT NULL,
    "encryptedTerms" text NOT NULL,
    "price" real NOT NULL,
    "maxMints" integer NOT NULL,
    "currentMints" integer NOT NULL DEFAULT 0,
    "isActive" boolean NOT NULL DEFAULT true,
    "validFrom" timestamp NOT NULL,
    "validUntil" timestamp NOT NULL,
    "licenseType" text NOT NULL,
    "tokenId" integer NOT NULL,
    FOREIGN KEY ("ipAssetId") REFERENCES "ipAssets"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "royalties" (
    "id" text PRIMARY KEY,
    "ipAssetId" text NOT NULL,
    "totalRevenue" real NOT NULL DEFAULT 0,
    "totalRoyaltyTokens" integer NOT NULL DEFAULT 10000,
    "tokenId" integer NOT NULL,
    FOREIGN KEY ("ipAssetId") REFERENCES "ipAssets"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "royaltyShares" (
    "id" text PRIMARY KEY,
    "royaltyId" text NOT NULL,
    "account" text NOT NULL,
    "shares" integer NOT NULL,
    "lastClaimed" real NOT NULL DEFAULT 0,
    FOREIGN KEY ("royaltyId") REFERENCES "royalties"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "payments" (
    "id" text PRIMARY KEY,
    "ipAssetId" text NOT NULL,
    "payer" text NOT NULL,
    "amount" real NOT NULL,
    "description" text NOT NULL,
    "timestamp" timestamp NOT NULL,
    "isProcessed" boolean NOT NULL DEFAULT true,
    FOREIGN KEY ("ipAssetId") REFERENCES "ipAssets"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "userIPAssets" (
    "id" text PRIMARY KEY,
    "user" text NOT NULL,
    "ipAssetId" text NOT NULL,
    FOREIGN KEY ("ipAssetId") REFERENCES "ipAssets"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "usedSignatures" (
    "id" text PRIMARY KEY,
    "signatureHash" text NOT NULL UNIQUE,
    "isUsed" boolean NOT NULL DEFAULT true
);

CREATE TABLE "tokenBalances" (
    "id" text PRIMARY KEY,
    "account" text NOT NULL,
    "tokenId" integer NOT NULL,
    "balance" integer NOT NULL DEFAULT 0,
    "lastUpdated" timestamp NOT NULL
);

CREATE TABLE "platformConfig" (
    "id" text PRIMARY KEY,
    "platformFeePercentage" integer NOT NULL DEFAULT 250,
    "platformFeeCollector" text NOT NULL,
    "lastUpdated" timestamp NOT NULL
);

CREATE TABLE "contractAddresses" (
    "id" text PRIMARY KEY,
    "network" text NOT NULL,
    "chainId" integer NOT NULL,
    "ipAssetManagerEnhanced" text NOT NULL,
    "ipAssetManager" text NOT NULL,
    "deployer" text NOT NULL,
    "deploymentTime" timestamp NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX "ipAssets_id_unique" ON "ipAssets" ("id");
CREATE UNIQUE INDEX "licenses_id_unique" ON "licenses" ("id");
CREATE UNIQUE INDEX "royalties_id_unique" ON "royalties" ("id");
CREATE UNIQUE INDEX "royaltyShares_id_unique" ON "royaltyShares" ("id");
CREATE UNIQUE INDEX "payments_id_unique" ON "payments" ("id");
CREATE UNIQUE INDEX "userIPAssets_id_unique" ON "userIPAssets" ("id");
CREATE UNIQUE INDEX "usedSignatures_id_unique" ON "usedSignatures" ("id");
CREATE UNIQUE INDEX "tokenBalances_id_unique" ON "tokenBalances" ("id");
CREATE UNIQUE INDEX "platformConfig_id_unique" ON "platformConfig" ("id");
CREATE UNIQUE INDEX "contractAddresses_id_unique" ON "contractAddresses" ("id");
CREATE UNIQUE INDEX "usedSignatures_signatureHash_unique" ON "usedSignatures" ("signatureHash");

-- Insert default platform configuration
INSERT INTO "platformConfig" ("id", "platformFeePercentage", "platformFeeCollector", "lastUpdated") 
VALUES ('current', 250, '0x9404966338eB27aF420a952574d777598Bbb58c4', NOW());

-- Insert contract addresses
INSERT INTO "contractAddresses" ("id", "network", "chainId", "ipAssetManagerEnhanced", "ipAssetManager", "deployer", "deploymentTime") 
VALUES ('current', 'testnet', 296, '0x77A7aB9f54b2132B51acF6f36A624b9dcf264ce3', '0x30BD264110f71916f338B132EdD4d35C38138468', '0x9404966338eB27aF420a952574d777598Bbb58c4', NOW()); 