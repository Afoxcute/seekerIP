/*
  Warnings:

  - A unique constraint covering the columns `[contractAddress,tokenId]` on the table `ip_assets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contractAddress,tokenId]` on the table `licenses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contractAddress,tokenId]` on the table `royalties` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ip_assets_contractAddress_key";

-- DropIndex
DROP INDEX "ip_assets_tokenId_key";

-- DropIndex
DROP INDEX "licenses_contractAddress_key";

-- DropIndex
DROP INDEX "licenses_tokenId_key";

-- DropIndex
DROP INDEX "royalties_contractAddress_key";

-- DropIndex
DROP INDEX "royalties_tokenId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ip_assets_contractAddress_tokenId_key" ON "ip_assets"("contractAddress", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_contractAddress_tokenId_key" ON "licenses"("contractAddress", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "royalties_contractAddress_tokenId_key" ON "royalties"("contractAddress", "tokenId");
