-- CreateTable
CREATE TABLE "public"."ip_assets" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL,
    "ipfsHash" TEXT,
    "owner" TEXT NOT NULL,
    "royaltyPercentage" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalRevenue" BIGINT NOT NULL DEFAULT 0,
    "licenseTokenId" BIGINT,
    "royaltyTokenId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."licenses" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "ipAssetId" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "encryptedTerms" TEXT,
    "price" BIGINT NOT NULL,
    "maxMints" BIGINT NOT NULL,
    "currentMints" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "licenseType" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."license_mints" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "price" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_mints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."royalties" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "ipAssetId" TEXT NOT NULL,
    "totalRevenue" BIGINT NOT NULL DEFAULT 0,
    "totalRoyaltyTokens" BIGINT NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "royalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."royalty_shares" (
    "id" TEXT NOT NULL,
    "royaltyId" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "shares" BIGINT NOT NULL,
    "lastClaimed" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "royalty_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."royalty_claims" (
    "id" TEXT NOT NULL,
    "royaltyId" TEXT NOT NULL,
    "claimant" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "royalty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "ipAssetId" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT,
    "transactionHash" TEXT NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ip_asset_transactions" (
    "id" TEXT NOT NULL,
    "ipAssetId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT,
    "type" TEXT NOT NULL,
    "amount" BIGINT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_asset_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_config" (
    "id" TEXT NOT NULL,
    "platformFeePercentage" INTEGER NOT NULL DEFAULT 250,
    "platformFeeCollector" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "kycStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "public"."kyc" (
    "account" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "kyc_pkey" PRIMARY KEY ("account")
);

-- CreateIndex
CREATE UNIQUE INDEX "ip_assets_contractAddress_key" ON "public"."ip_assets"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ip_assets_tokenId_key" ON "public"."ip_assets"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_contractAddress_key" ON "public"."licenses"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_tokenId_key" ON "public"."licenses"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "royalties_contractAddress_key" ON "public"."royalties"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "royalties_tokenId_key" ON "public"."royalties"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "royalty_shares_royaltyId_holder_key" ON "public"."royalty_shares"("royaltyId", "holder");

-- CreateIndex
CREATE UNIQUE INDEX "ip_asset_transactions_transactionHash_key" ON "public"."ip_asset_transactions"("transactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "public"."users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "assets_token_key" ON "public"."assets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "assets_name_key" ON "public"."assets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "public"."assets"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_account_key" ON "public"."kyc"("account");

-- AddForeignKey
ALTER TABLE "public"."ip_assets" ADD CONSTRAINT "ip_assets_owner_fkey" FOREIGN KEY ("owner") REFERENCES "public"."users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."licenses" ADD CONSTRAINT "licenses_ipAssetId_fkey" FOREIGN KEY ("ipAssetId") REFERENCES "public"."ip_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."license_mints" ADD CONSTRAINT "license_mints_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "public"."licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."royalties" ADD CONSTRAINT "royalties_ipAssetId_fkey" FOREIGN KEY ("ipAssetId") REFERENCES "public"."ip_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."royalty_shares" ADD CONSTRAINT "royalty_shares_royaltyId_fkey" FOREIGN KEY ("royaltyId") REFERENCES "public"."royalties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."royalty_claims" ADD CONSTRAINT "royalty_claims_royaltyId_fkey" FOREIGN KEY ("royaltyId") REFERENCES "public"."royalties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_ipAssetId_fkey" FOREIGN KEY ("ipAssetId") REFERENCES "public"."ip_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ip_asset_transactions" ADD CONSTRAINT "ip_asset_transactions_ipAssetId_fkey" FOREIGN KEY ("ipAssetId") REFERENCES "public"."ip_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
