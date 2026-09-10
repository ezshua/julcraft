# Задание агенту — i18n-1 · Шаг 1 из 12: Ядро i18n (словари + lib/i18n.ts)

**Тип задачи:** инфраструктура
**Зависимости:** нет (первый шаг направления 3)
**Связанные пункты плана:** `plan-3.md` §4 (i18n-1), §5 (D-i18n-1, D-i18n-5); `plan-3-i18n-options.md` §1 (вариант B)
**Версия плана:** plan-3.md (2026-09-07)

## Цель

Создать инфраструктуру cookie-based i18n по варианту B (0 новых зависимостей), не трогая страницы витрины: типы, чтение locale, словари трёх языков, `plural()` per-locale, интерполяция, скрипт синхронности словарей.

## Правила

- §0 (макет — источник истины) без изменений: на этом шаге витрина вообще не меняется.
- 0 новых зависимостей. Коммиты — только по команде руководителя.
- Блокер → остановиться и записать вопрос в отчёт.

## Шаги

1. `site/lib/i18n.ts`:
   - `export type Locale = "ru" | "en" | "uk"`, `export const LOCALES`, `export const LOCALE_STORAGE_KEY = "julcraft-locale"` (по образцу `CURRENCY_STORAGE_KEY` в `lib/currency.ts`).
   - `getLocale()` — серверная async-функция: cookie `julcraft-locale` через `cookies()` (как `getDisplayCurrency` в `lib/currency-server.ts`) → валидация по `LOCALES` → `"ru"`. Цепочка: cookie → `ru`; место для слоя `.env` (DEFAULT_LOCALE, появится в i18n-3) предусмотреть комментарием.
   - `getDictionary(locale)` — статические импорты `lib/dictionaries/ru|en|uk.ts`.
   - `t(dict, key, params?)` — типобезопасный доступ + интерполяция плейсхолдеров `{name}` (простая замена).
   - `plural(n, forms, locale)` — ru/uk: правило one/few/many (как `plural` в `lib/format.ts`), en: one/other (n === 1 → one). Формы приходят из словаря.
2. `site/lib/dictionaries/ru.ts` — стартовое содержимое: namespace `common` (можно пустой; зоны `layout`, `home`, `catalog`, `product`, `configurator`, `contacts`, `about`, `orderSuccess`, `errors`, `meta`, `api`, `admin` добавляются своими шагами). `export type Dictionary = typeof ru`.
   - `en.ts` / `uk.ts`: `satisfies Dictionary` — тип заставляет держать наборы ключей трёх словарей синхронными.
3. `site/scripts/check-i18n.ts` + npm-скрипт `check:i18n`: рекурсивно сравнивает деревья ключей ru/en/uk (падает при расхождении). Используется на всех следующих шагах.
4. Мини-проверки `plural` для 1/2/5/11/21/101 × ru/en/uk — прогон в отчёт.

## Критерии приёмки

1. `npm run lint`, `npm run build`, `npm run check:i18n` — зелёные.
2. Витрина не изменилась: в диффе только новые файлы `lib/dictionaries/*`, `lib/i18n.ts`, `scripts/check-i18n.ts` + строка в `package.json`.

## Не делать (out of scope)

- Переключатель языка, `<html lang>`, вынос строк — следующие шаги. Правка существующих страниц запрещена.
