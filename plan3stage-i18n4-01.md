# Задание агенту — i18n-4: Локализация админки (8 мини-шагов)

**Тип задачи:** вынос строк в словарь (массовая, но механическая)
**Зависимости:** i18n-1 · Шаг 1 (ядро), i18n-2 · Шаг 7 (поля EN/UK уже в модалках)
**Связанные пункты плана:** `plan-3.md` §4 (i18n-4), §5 D-i18n-3 (админка локализуется полностью, язык — по тому же cookie)
**Размер:** ~530 строк UI + ~100 строк API-ошибок; namespaces `admin.*` / `api.admin.*`

## Общие правила для всех мини-шагов

- Язык админки = cookie `julcraft-locale` (переключатель тот же — панель «Вид»; отдельного переключателя в админке не делаем, D-i18n-3).
- RU-админка визуально и текстово не меняется — только замена хардкода на `t()`.
- Client-компоненты получают срез `dict.admin` пропсами из server-страниц админки.
- API-ошибки админ-роутов читают locale из cookie (`getLocale()`) как в i18n-1 шаг 12.
- EN/UK — черновой перевод; статусы/коды/валюты (USD, new, stone) не переводятся.

## Мини-шаги (каждый — отдельная сессия, свой дифф и приёмка)

- **4a. Обвязка + логин:** `components/admin/AdminHeader.tsx`, `app/admin/login/page.tsx` + `LoginForm.tsx`, `app/admin/login/actions.ts`, `lib/auth.ts` (labels), `app/admin/(panel)/layout.tsx`, `error.tsx`.
- **4b. Дашборд:** `app/admin/(panel)/page.tsx` — дни недели, «сегодня/вчера HH:MM», типы заявок, все карточки и таблица.
- **4c. Заявки:** `app/admin/(panel)/orders/page.tsx`, `components/admin/OrderRow.tsx`, `OrderModal.tsx`, `CollageLightbox.tsx`, статус-лейблы (уже per-locale из i18n-1 шаг 12 — подключить).
- **4d. Товары:** `app/admin/(panel)/products/page.tsx`, `components/admin/ProductModal.tsx`, `PhotoGrid.tsx`, `CatFilter.tsx` (общий фильтр категорий, если используется тут).
- **4e. Склад:** `app/admin/(panel)/components/page.tsx`, `components/admin/ComponentModal.tsx`, `ComponentTypesManager.tsx`, `StockFilter.tsx`.
- **4f. Категории:** `app/admin/(panel)/categories/page.tsx`, `components/admin/CategoryList.tsx`, `CategoryEditor.tsx`, `NewCategoryModal.tsx`.
- **4g. Настройки:** `app/admin/(panel)/settings/page.tsx`, `components/admin/SettingsPanel.tsx` (81 строка — самый большой файл, можно разбить по табам: Контакты/Тексты/Финансы), `TelegramTestButton.tsx`, `ImageUploader.tsx`, `DeleteButton.tsx`.
- **4h. Админ-API-ошибки:** 21 файл `api/admin/**` (~100 строк, единообразный набор: «Не авторизован», «…не найден», «Slug уже занят», «Min не может быть больше Max» и т.д.) + админская часть `lib/schemas.ts`. Механизм — как в i18n-1 шаг 12.

## Критерии приёмки (per мини-шаг)

1. RU-админка зоны: текстово идентична (сверка страниц/модалок/ошибок).
2. EN/UK: переключение панели «Вид» переводит зону.
3. Grep зоны — 0 кириллицы вне комментариев; `npm run check:i18n`, `npm run lint`, `npm run build`.

## Не делать (out of scope)

- Telegram-шаблоны (язык мастера — не трогать), консольные логи скриптов, переводы контента БД (i18n-5).
