# Задание агенту — i18n-3: Дефолты сервера из .env (DEFAULT_SKIN / DEFAULT_CURRENCY / DEFAULT_LOCALE)

**Тип задачи:** инфраструктура деплоя (один атомарный шаг)
**Зависимости:** i18n-1 · Шаги 1–3 (cookie `julcraft-locale` уже читается)
**Связанные пункты плана:** `plan-3.md` §4 (i18n-3), §5 D-i18n-6
**Файлы зоны:** `site/.env.example`, `site/lib/i18n.ts` (getLocale), `site/lib/currency-server.ts` (getDisplayCurrency), место чтения дефолтного скина (skin-switcher.js / layout), `README-deploy.md`

## Цель

Три переменные окружения, задающие стартовые значения для клиентов без сохранённого выбора (D-i18n-6):

- `DEFAULT_SKIN=memphis|handmade` — скин для новых клиентов (cookie клиента приоритетнее);
- `DEFAULT_CURRENCY=USD|UAH|...` — .env **перекрывает** Settings (если задан);
- `DEFAULT_LOCALE=ru|en|uk` — язык для новых клиентов.

В админку не выносятся; поле «валюта по умолчанию» в Settings остаётся для UI-валют.

## Шаги

1. `.env.example` + `README-deploy.md`: три переменные, допустимые значения, приоритеты (cookie → .env → встроенный RU/memphis/Settings-валюта), примеры.
2. `lib/i18n.ts` `getLocale()`: cookie → `process.env.DEFAULT_LOCALE` (валидация по LOCALES) → `ru`.
3. `lib/currency-server.ts` `getDisplayCurrency()`: cookie → (`DEFAULT_CURRENCY` в списке валют ? env : Settings-дефолт) → первый. При заданном env, отсутствующем в Settings-списке валют — игнорировать env + warning в консоль сервера (не падать).
4. Дефолтный скин: серверная часть (если есть) / начальное значение в layout + skin-switcher.js: при отсутствии localStorage — скин из `.env` (прокинуть через data-атрибут или inline-константу в layout; механизм выбрать по аналогии с существующим подключением скинов, зафиксировать в отчёте).
5. Влияние на статическую генерацию (`sitemap.ts` и др.): с новым env-зависимым рендером проверить `npm run build` (сайт динамический — ок; зафиксировать в отчёте).

## Критерии приёмки

1. Без переменных — поведение прежнее (RU, memphis, Settings-валюта).
2. `DEFAULT_LOCALE=en` + чистый профиль (нет cookie) → `lang="en"`, витрина EN; с cookie `ru` → RU (cookie приоритетнее).
3. `DEFAULT_CURRENCY=EUR` при EUR в Settings → цены нового клиента в EUR; невалидное значение — дефолт Settings + warning.
4. `DEFAULT_SKIN=handmade` + чистый профиль → скин «Тёплый»; выбор в localStorage приоритетнее.
5. README-deploy обновлён; `npm run lint`, `npm run build`.

## Не делать (out of scope)

- Вынос дефолтов в админку (решение D-i18n-6 — не делаем), Telegram, переводы.
