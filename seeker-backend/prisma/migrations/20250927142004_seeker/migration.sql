-- CreateTable
CREATE TABLE "ip_asset_locks" (
    "id" TEXT NOT NULL,
    "ipAssetId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "hbarAmount" BIGINT NOT NULL,
    "lockTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "hbarTokenAmount" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_asset_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_asset_unlock_events" (
    "id" TEXT NOT NULL,
    "lockId" TEXT NOT NULL,
    "hbarAmount" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_asset_unlock_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hbar_token_balances" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "totalMinted" BIGINT NOT NULL DEFAULT 0,
    "totalBurned" BIGINT NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hbar_token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hbar_token_transactions" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hbar_token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbitration_cases" (
    "id" TEXT NOT NULL,
    "ipAssetId" TEXT NOT NULL,
    "disputeId" BIGINT NOT NULL,
    "complainant" TEXT NOT NULL,
    "respondent" TEXT NOT NULL,
    "disputeBond" BIGINT NOT NULL,
    "votingPeriod" BIGINT NOT NULL,
    "challengePeriod" BIGINT NOT NULL,
    "minStakeToVote" BIGINT NOT NULL,
    "arbitratorFee" BIGINT NOT NULL,
    "arbitrationToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "result" TEXT,

    CONSTRAINT "arbitration_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbitration_votes" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "voter" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "stake" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arbitration_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbitration_evidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "submitter" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "evidenceData" TEXT NOT NULL,
    "description" TEXT,
    "transactionHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arbitration_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokenized_assets" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "totalSupply" BIGINT NOT NULL DEFAULT 0,
    "decimals" INTEGER NOT NULL DEFAULT 18,
    "owner" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokenized_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokenized_asset_transfers" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokenized_asset_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_states" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "lastProcessedBlock" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_queue" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "eventData" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "event_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ip_asset_locks_ipAssetId_key" ON "ip_asset_locks"("ipAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "hbar_token_balances_owner_key" ON "hbar_token_balances"("owner");

-- CreateIndex
CREATE UNIQUE INDEX "arbitration_cases_disputeId_key" ON "arbitration_cases"("disputeId");

-- CreateIndex
CREATE UNIQUE INDEX "arbitration_votes_caseId_voter_key" ON "arbitration_votes"("caseId", "voter");

-- CreateIndex
CREATE UNIQUE INDEX "tokenized_assets_contractAddress_key" ON "tokenized_assets"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "tokenized_assets_tokenId_key" ON "tokenized_assets"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_states_contractAddress_key" ON "contract_states"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "event_queue_transactionHash_logIndex_key" ON "event_queue"("transactionHash", "logIndex");

-- AddForeignKey
ALTER TABLE "ip_asset_locks" ADD CONSTRAINT "ip_asset_locks_ipAssetId_fkey" FOREIGN KEY ("ipAssetId") REFERENCES "ip_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_asset_unlock_events" ADD CONSTRAINT "ip_asset_unlock_events_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "ip_asset_locks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitration_cases" ADD CONSTRAINT "arbitration_cases_ipAssetId_fkey" FOREIGN KEY ("ipAssetId") REFERENCES "ip_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitration_votes" ADD CONSTRAINT "arbitration_votes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitration_evidence" ADD CONSTRAINT "arbitration_evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokenized_asset_transfers" ADD CONSTRAINT "tokenized_asset_transfers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "tokenized_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
