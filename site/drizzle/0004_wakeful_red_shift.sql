CREATE TABLE `blogPostTags` (
	`postId` integer NOT NULL,
	`tagId` integer NOT NULL,
	PRIMARY KEY(`postId`, `tagId`),
	FOREIGN KEY (`postId`) REFERENCES `blogPosts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tagId`) REFERENCES `blogTags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `blogPosts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`coverImage` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`publishedAt` integer,
	`metaTitle` text,
	`metaDescription` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blogPosts_slug_unique` ON `blogPosts` (`slug`);--> statement-breakpoint
CREATE INDEX `blogPosts_status_publishedAt_idx` ON `blogPosts` (`status`,`publishedAt`);--> statement-breakpoint
CREATE TABLE `blogTags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`isActive` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blogTags_slug_unique` ON `blogTags` (`slug`);