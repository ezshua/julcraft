CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`image` text,
	`workPrice` integer NOT NULL,
	`baseWorkDays` integer NOT NULL,
	`hasSlotTemplate` integer NOT NULL,
	`isActive` integer NOT NULL,
	`sortOrder` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`componentType` text NOT NULL,
	`price` integer NOT NULL,
	`processingPrice` integer NOT NULL,
	`processingDays` integer NOT NULL,
	`stockQty` integer NOT NULL,
	`isOrderable` integer NOT NULL,
	`deliveryDays` integer,
	`photo` text NOT NULL,
	`isActive` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`customerName` text NOT NULL,
	`contact` text NOT NULL,
	`message` text NOT NULL,
	`productId` integer,
	`configJson` text NOT NULL,
	`collagePath` text,
	`calcPrice` integer NOT NULL,
	`calcDays` integer NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoryId` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`images` text NOT NULL,
	`isNew` integer NOT NULL,
	`isFeatured` integer NOT NULL,
	`availability` text NOT NULL,
	`reserveUntil` integer,
	`orderDays` integer,
	`metaTitle` text,
	`metaDescription` text,
	`ogImage` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slotTemplates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoryId` integer NOT NULL,
	`name` text NOT NULL,
	`componentType` text NOT NULL,
	`minQty` integer NOT NULL,
	`maxQty` integer NOT NULL,
	`sortOrder` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
