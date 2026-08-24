-- План componentsExt: редактируемые типы комплектующих.
-- ВАЖНО: генератор также добавлял ALTER TABLE ... ADD *Currency, но колонки
-- валют управляются вне drizzle (scripts/migrate-currency-fields.ts,
-- npm run db:migrate-currency) и на существующих БД уже есть — поэтому
-- эти ALTER убраны вручную. Снапшот (meta/0002_snapshot.json) колонки знает.
CREATE TABLE `componentTypes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`isActive` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `componentTypes_code_unique` ON `componentTypes` (`code`);
