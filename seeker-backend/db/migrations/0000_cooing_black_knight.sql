CREATE TABLE `assets` (
	`token` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`timestamp` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_token_unique` ON `assets` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_name_unique` ON `assets` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_symbol_unique` ON `assets` (`symbol`);--> statement-breakpoint
CREATE TABLE `kyc` (
	`account` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	FOREIGN KEY (`token`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kyc_account_unique` ON `kyc` (`account`);--> statement-breakpoint
CREATE TABLE `lendingReserves` (
	`token` text PRIMARY KEY NOT NULL,
	`asset` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`asset`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lendingReserves_token_unique` ON `lendingReserves` (`token`);--> statement-breakpoint
CREATE TABLE `liquidations` (
	`id` text PRIMARY KEY NOT NULL,
	`loanId` text NOT NULL,
	`account` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `liquidations_id_unique` ON `liquidations` (`id`);--> statement-breakpoint
CREATE TABLE `loanRepayment` (
	`id` text PRIMARY KEY NOT NULL,
	`loanId` text NOT NULL,
	`token` text NOT NULL,
	`account` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`token`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loanRepayment_id_unique` ON `loanRepayment` (`id`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`collateralAsset` text NOT NULL,
	`loanAmount` real NOT NULL,
	`collateralAmount` real NOT NULL,
	`liquidationPrice` real NOT NULL,
	`repaymentAmount` real NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`collateralAsset`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loans_id_unique` ON `loans` (`id`);--> statement-breakpoint
CREATE TABLE `prices` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`price` real NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`token`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prices_id_unique` ON `prices` (`id`);--> statement-breakpoint
CREATE TABLE `providedLiquidity` (
	`id` text PRIMARY KEY NOT NULL,
	`asset` text NOT NULL,
	`amount` real NOT NULL,
	`account` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`asset`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providedLiquidity_id_unique` ON `providedLiquidity` (`id`);--> statement-breakpoint
CREATE TABLE `realwordAssetTimeseries` (
	`id` text PRIMARY KEY NOT NULL,
	`open` real NOT NULL,
	`close` real NOT NULL,
	`high` real NOT NULL,
	`low` real NOT NULL,
	`net` real NOT NULL,
	`gross` real NOT NULL,
	`timestamp` real NOT NULL,
	`asset` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `realwordAssetTimeseries_id_unique` ON `realwordAssetTimeseries` (`id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`hash` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`token` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`timestamp` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_hash_unique` ON `transactions` (`hash`);--> statement-breakpoint
CREATE TABLE `withdrawnLiquidity` (
	`id` text PRIMARY KEY NOT NULL,
	`asset` text NOT NULL,
	`amount` real NOT NULL,
	`account` text NOT NULL,
	`timestamp` real NOT NULL,
	FOREIGN KEY (`asset`) REFERENCES `assets`(`token`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `withdrawnLiquidity_id_unique` ON `withdrawnLiquidity` (`id`);