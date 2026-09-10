# Задание агенту — i18n-2 · Шаг 1 из 8: Тип localizedString + lib/localize.ts

**Тип задачи:** инфраструктура данных
**Зависимости:** i18n-1 · Шаг 1 (тип Locale); таблицы БД не трогаем
**Связанные пункты плана:** `plan-3.md` §4 (i18n-2); `plan-3-i18n-options.md` §3 (подход 2 — JSON + helper)
**Предыдущая итерация:** i18n-1 (все 12 шагов) завершена

## Цель

Механизм JSON-локализации контента: тип `localizedString`, helper `L()` с фолбэком, zod-схема — без изменения БД и страниц (механически подключается следующими шагами).

## Шаги

1. `site/lib/localize.ts`:
   - `export type LocalizedString = string | Partial<Record<Locale, string>>` — старые данные (просто строка) валидны (= RU), новые — `{ru?, en?, uk?}`;
   - `export function L(text: LocalizedString | null | undefined, locale: Locale): string` — правила: строка → как есть; объект → `obj[locale] ?? obj.ru ?? первый непустой ?? ""`; null/undefined → `""`;
   - `firstLocale(text)` — извлечение RU из legacy-строки (для миграции шага 2);
   - Unit-мини-тесты правил (в отчёт): legacy-строка, полный объект, объект без ru, объект без запрошенной локали, null.
2. `lib/schemas.ts`: zod-схема `localizedStringSchema` — union: `z.string()` | `z.object({ru: z.string().optional(), en: …, uk: …})`. Пока никуда не подключается.
3. Комментарий в `drizzle/schema.ts` (не меняя полей): текстовые поля контента готовятся к хранению JSON — изменения в шаге 2.

## Критерии приёмки

1. Поведение `L()` на всех правилах подтверждено тестами/прогоном.
2. Ни одна страница, роут и таблица БД не изменились (дифф: только `lib/localize.ts` + схема + npm-скрипт, если тесты оформлены скриптом).
3. `npm run lint`, `npm run build`.

## Не делать (out of scope)

- Миграция данных (шаг 2), вывод на страницах (шаги 3–6), админка (шаг 7).
