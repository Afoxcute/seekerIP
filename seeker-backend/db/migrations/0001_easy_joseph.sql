CREATE TABLE `ipAssetTransfers` (
	`id` text PRIMARY KEY NOT NULL,
	`ipAssetId` text NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`ipAssetId`) REFERENCES `ipAssets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipAssetTransfers_id_unique` ON `ipAssetTransfers` (`id`);--> statement-breakpoint
CREATE TABLE `ipAssets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`metadataURI` text NOT NULL,
	`ipfsHash` text NOT NULL,
	`owner` text NOT NULL,
	`royaltyPercentage` real NOT NULL,
	`isActive` integer NOT NULL,
	`totalRevenue` real NOT NULL,
	`licenseTokenId` text,
	`royaltyTokenId` text NOT NULL,
	`createdAt` real NOT NULL,
	`lastModified` real NOT NULL,
	`timestamp` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipAssets_id_unique` ON `ipAssets` (`id`);--> statement-breakpoint
CREATE TABLE `ipLicenseMints` (
	`id` text PRIMARY KEY NOT NULL,
	`licenseId` text NOT NULL,
	`to` text NOT NULL,
	`amount` real NOT NULL,
	`price` real NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`licenseId`) REFERENCES `ipLicenses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipLicenseMints_id_unique` ON `ipLicenseMints` (`id`);--> statement-breakpoint
CREATE TABLE `ipLicenses` (
	`id` text PRIMARY KEY NOT NULL,
	`ipAssetId` text NOT NULL,
	`terms` text NOT NULL,
	`encryptedTerms` text NOT NULL,
	`price` real NOT NULL,
	`maxMints` real NOT NULL,
	`currentMints` real NOT NULL,
	`isActive` integer NOT NULL,
	`validFrom` real NOT NULL,
	`validUntil` real NOT NULL,
	`licenseType` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`ipAssetId`) REFERENCES `ipAssets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipLicenses_id_unique` ON `ipLicenses` (`id`);--> statement-breakpoint
CREATE TABLE `ipPayments` (
	`id` text PRIMARY KEY NOT NULL,
	`ipAssetId` text NOT NULL,
	`payer` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`isProcessed` integer NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`ipAssetId`) REFERENCES `ipAssets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipPayments_id_unique` ON `ipPayments` (`id`);--> statement-breakpoint
CREATE TABLE `ipRevenueClaims` (
	`id` text PRIMARY KEY NOT NULL,
	`ipAssetId` text NOT NULL,
	`claimant` text NOT NULL,
	`amount` real NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`ipAssetId`) REFERENCES `ipAssets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipRevenueClaims_id_unique` ON `ipRevenueClaims` (`id`);--> statement-breakpoint
CREATE TABLE `ipRoyalties` (
	`id` text PRIMARY KEY NOT NULL,
	`ipAssetId` text NOT NULL,
	`totalRevenue` real NOT NULL,
	`totalRoyaltyTokens` real NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`ipAssetId`) REFERENCES `ipAssets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipRoyalties_id_unique` ON `ipRoyalties` (`id`);--> statement-breakpoint
CREATE TABLE `ipRoyaltyShares` (
	`id` text PRIMARY KEY NOT NULL,
	`royaltyId` text NOT NULL,
	`account` text NOT NULL,
	`shares` real NOT NULL,
	`lastClaimed` real NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`royaltyId`) REFERENCES `ipRoyalties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ipRoyaltyShares_id_unique` ON `ipRoyaltyShares` (`id`);