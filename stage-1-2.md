# Этап 1.2 — Слой данных (Drizzle ORM + SQLite)

**Тип задачи:** backend / схема БД и миграции
**Зависимости:** `stage-1-1.md` (проект создан, `.env.example` и скрипты `db:*` присутствуют)
**Связанные пункты плана:** `plan-1.md` §4 (модель данных), §7 T-1.2, решение D-2a

---

## Цель
Настроить Drizzle ORM поверх SQLite (better-sqlite3) и описать полную схему БД из §4 с учётом решения **D-2a**. Сгенерировать и применить миграцию, чтобы файл БД и таблицы создавались командой `npm run db:migrate`.

## Решения, которые нельзя нарушать
- **D-2a (модель наличия `Product`):** вместо `inStock: boolean` используем:
  - `availability` — `text` с допустимыми значениями `'in_stock' | 'reserve' | 'made_to_order' | 'out_of_stock'`
  - `reserveUntil` — `timestamp` (nullable)
  - `orderDays` — `integer` (nullable)
  - Поле `inStock` **не создавать**.
- Переход SQLite→PostgreSQL в будущем должен быть лёгким (типы — portabelные; enum через `text` + TS-union, не нативный sqlite-enum).
- Цены/сроки храним в копейках/днях как `integer` (см. §4).

## Шаги
1. **Зависимости:** `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `dotenv`, `tsx` (для скриптов).
2. **`lib/db.ts`:** подключение `better-sqlite3` по `DATABASE_URL` (формат `file:./julcraft.db` → путь к файлу). Экспортировать `db`. При импорте (dev) БД должна автоматически инициализироваться.
3. **`drizzle/schema.ts`:** описать таблицы (имена/поля/типы — строго по §4):
   - `categories` (Category)
   - `slotTemplates` (SlotTemplate)
   - `products` (Product) — **с `availability`/`reserveUntil`/`orderDays`, без `inStock`**
   - `components` (Component)
   - `orders` (Order)
   - `settings` (key-value: `key` text PK, `value` text)
   - `productComponents` (ProductComponent) — **опционально, вне MVP**: создать таблицу `productId, componentId, qty`, но НЕ использовать в коде этапа 1.
   - Связи: FK `product.categoryId→categories.id`, `slotTemplate.categoryId→categories.id`, `order.productId→products.id` (nullable).
4. **`drizzle.config.ts`:** `dialect: 'sqlite'`, `schema: './drizzle/schema.ts'`, `out: './drizzle'`, `dbCredentials: { url: process.env.DATABASE_URL }` (через `dotenv`).
5. **Миграция:** `npm run db:generate` → сгенерировать SQL в `drizzle/`. Проверить, что в миграции `products` содержит `availability/reserveUntil/orderDays` и НЕТ `in_stock`.
6. **Применение:** `npm run db:migrate` создаёт `julcraft.db` с таблицами.
7. **TS-типы:** экспортировать инференные типы (напр. `export type Product = typeof products.$inferSelect`) из `drizzle/schema.ts` — пригодятся на этапах 2+.
8. **`.gitignore`:** добавить `julcraft.db` и `*.db` (база не в репозиторий; бэкап — этап 8).

## Критерии приёмки
- `npm run db:migrate` создаёт `julcraft.db` со всеми таблицами из §4.
- В схеме `products` присутствуют `availability` (text), `reserveUntil` (timestamp null), `orderDays` (integer null); поля `inStock` нет.
- Миграция воспроизводима с нуля (удалить db → migrate → все таблицы на месте).
- `lib/db.ts` экспортирует рабочий `db`, пригодный для запросов на следующих этапах.

## Не делать (out of scope)
- Seed-данные (категории/изделия/комплектующие) — **этап 2 (T-2.1)**.
- Auth.js и защиту админки — **этап 4**.
- Логику заявок/коллажа — **этап 5/6**.
