Работай в репозитории C:\alexx\Src\julcraft.

Нужно реализовать единый механизм пользовательских настроек сайта:
скин, язык и валюта.

## Цель

Убрать одновременное использование cookies и localStorage.

Пользовательские настройки должны храниться и выбираться ТОЛЬКО через cookies:

- julcraft-locale
- julcraft-currency
- julcraft-skin

localStorage не использовать вообще:

- не читать;
- не писать;
- не читать старые значения;
- не переносить старые localStorage-настройки в cookies;
- не добавлять legacy-миграцию;
- не оставлять новых обращений к localStorage для этих настроек.

Если старые значения остаются в браузере, просто игнорировать их. При первом запросе пользователь должен получить серверные значения по умолчанию.

Перед началом изучи текущие файлы и существующие соглашения проекта:

- site/AGENTS.md;
- site/app/layout.tsx;
- site/public/js/skin-switcher.js;
- site/lib/i18n.ts;
- site/lib/currency-server.ts;
- site/lib/use-currency.ts;
- site/lib/currency.ts;
- site/app/api/currency/route.ts;
- site/app/layout.tsx и связанные layout;
- site/.env.example;
- plan-3.md и соответствующие планы i18n.

Также проверь актуальные документы Next.js в node_modules/next/dist/docs/ перед изменением server boundary, cookies, proxy или middleware. В проекте используется Next.js 16.3.1, поэтому не переноси код из старой версии Next.js без проверки.

## Настройки по умолчанию

В .env.example добавить:

DEFAULT_COOKIESID=1

DEFAULT_COOKIESID — положительный целочисленный идентификатор версии пользовательских cookies.

Если переменная отсутствует или имеет некорректное значение, используй безопасный fallback 0 и выведи предупреждение в консоль сервера. Не добавляй новую зависимость для валидации.

DEFAULT_COOKIESID меняется только в .env. После изменения пользователь должен перезапустить сервер.

Не добавляй DEFAULT_COOKIESID в админку и не добавляй отдельный API для его изменения.

## Общая версия cookies

Добавить отдельную cookie:

julcraft-cookies-version

Значение — строка с числовым идентификатором, например:

julcraft-cookies-version=1

Использовать одну общую версию для всех трёх настроек.

Текущая ожидаемая версия берётся из:

process.env.DEFAULT_COOKIESID

## Правила обработки версии

На каждом входящем HTTP-запросе нужно определить состояние пользовательских настроек.

### Версия совпадает

Если:

- cookie julcraft-cookies-version существует;
- её значение числовое;
- значение равно DEFAULT_COOKIESID;

то пользовательские настройки считаются актуальными.

### Версия отсутствует

Отсутствие cookie версии считать несовпадением.

В этом случае:

- сбросить julcraft-locale;
- сбросить julcraft-currency;
- сбросить julcraft-skin;
- записать серверные значения по умолчанию;
- записать julcraft-cookies-version=DEFAULT_COOKIESID.

### Версия не совпадает

Если версия cookie:

- меньше DEFAULT_COOKIESID;
- больше DEFAULT_COOKIESID;
- не является числом;
- содержит некорректное значение;

то нужно выполнить полный сброс:

1. Удалить/перезаписать:
   - julcraft-locale;
   - julcraft-currency;
   - julcraft-skin.
2. Записать актуальные серверные значения по умолчанию.
3. Записать:
   - julcraft-cookies-version=DEFAULT_COOKIESID.

Полный сброс должен происходить при следующем HTTP-за запросе пользователя. Технически невозможно изменить cookies браузера пользователя, пока он не отправил запрос.

## Значения по умолчанию

### Язык

Серверный default:

1. process.env.DEFAULT_LOCALE, если значение входит в:
   - ru
   - en
   - uk
2. иначе ru.

### Скин

Серверный default:

1. process.env.DEFAULT_SKIN, если значение входит в:
   - memphis
   - handmade
2. иначе memphis.

Рекомендуемое значение cookie:

- memphis
- handmade

Не используй значения вроде style-memphis.css как основной формат cookie, если это не требуется текущим кодом. Выбери один канонический формат и используй его в серверной и клиентской частях.

### Валюта

Серверный default:

1. process.env.DEFAULT_CURRENCY, если код есть в списке finance.currencies из Settings;
2. иначе finance.defaultCurrency из Settings;
3. иначе первый доступный код валюты.

Если DEFAULT_CURRENCY задан, но отсутствует в Settings, выведи предупреждение и используй Settings fallback.

Валюта из cookie проверяется по списку валют Settings.

Если версия cookies совпадает, но одна пользовательская настройка отсутствует или невалидна:

- сбросить только эту настройку;
- записать ей соответствующее серверное значение по умолчанию;
- остальные пользовательские настройки не менять;
- версию cookies не менять, если она уже совпадает.

Например:

- версия совпадает;
- julcraft-locale=en;
- julcraft-currency=USD;
- julcraft-skin отсутствует.

В этом случае сбросить только skin на DEFAULT_SKIN.

Не сбрасывать все настройки из-за ошибки только в одной из них.

## Где выполнять нормализацию

Не пытайся вызывать cookies().set() из обычных Server Components или Server Pages.

Используй поддерживаемую Next.js 16 server boundary для обработки входящего запроса и установки response cookies. Проверь, должен ли в этом проекте использоваться proxy.ts вместо middleware.ts, с учётом актуальных документов Next.js.

Нужно обеспечить две вещи:

1. Текущий SSR-запрос должен видеть уже нормализованные значения, а не старые невалидные cookies.
2. В ответе HTTP должны отправляться Set-Cookie:
   - для сброшенных настроек;
   - для версии;
   - для исправленных значений.

Если proxy не может работать с better-sqlite3 или getSettings, выбери другую поддерживаемую архитектуру, но не оставляй ситуацию, когда:

- SSR отрендерил старое значение;
- а браузер только после ответа получил новый default.

Текущий запрос и последующие запросы должны использовать одинаковые значения.

Не помещай server-only код в клиентские компоненты.

## Изменения layout и первого рендера

В site/app/layout.tsx skin должен выбираться на основе cookie:

1. валидная julcraft-skin;
2. DEFAULT_SKIN;
3. встроенный fallback memphis.

При наличии сохранённого handmade первый SSR должен сразу содержать:

<link rel="stylesheet" href="/css/style.css" />

При memphis:

<link rel="stylesheet" href="/css/style-memphis.css" />

Не оставляй ситуацию, когда сервер всегда отдаёт DEFAULT_SKIN, а сохранённый скин подменяется только после загрузки JavaScript.

Удали или скорректируй комментарии, утверждающие, что localStorage является источником скина.

Проверь, нужен ли suppressHydrationWarning после того, как SSR будет учитывать skin-cookie. Если расхождения больше нет, удали его, если он действительно не нужен.

Не изменяй сами CSS-файлы скинов.

## skin-switcher.js

Переработай public/js/skin-switcher.js:

- читай julcraft-skin из document.cookie;
- читай julcraft-locale из document.cookie;
- читай julcraft-currency из document.cookie;
- полностью удали чтение и запись localStorage;
- не выполняй миграцию старых localStorage-значений.

При переключении скина:

- записывай julcraft-skin в cookie;
- сразу обменяй href stylesheet;
- не используй localStorage;
- сохрани текущую визуальную логику Memphis/Handmade.

Рекомендуемые параметры cookie:

Path=/
Max-Age=31536000
SameSite=Lax

Добавь Secure в production.

Cookie не должна быть HttpOnly, потому что skin-switcher.js должен записывать настройки из браузера.

Валидируй значения:

- locale: ru | en | uk;
- skin: memphis | handmade;
- currency: только код из списка валют.

Если в HTML есть data-default-* атрибуты, они могут использоваться только как безопасный fallback для первого рендера, но не как замена cookie и не как отдельный источник пользовательских настроек.

При выборе языка или валюты:

- записывай cookie;
- перезагружай страницу, чтобы SSR получил то же значение;
- не используй localStorage.

## useCurrency

Переработай site/lib/use-currency.ts.

Поскольку валюта теперь доступна серверу через cookie и приходит в initialCode:

- не читать localStorage;
- не подписываться на storage event;
- не использовать setTimeout для post-hydration переключения;
- не менять валюту после монтирования без изменения cookie.

Первый и последующий рендер клиентского компонента должны использовать initialCode, полученный от SSR.

Если current currency switching всегда перезагружает страницу, состояние useCurrency можно сделать простым вычислением через findCurrency без useState/useEffect.

Проверь всех пользователей хука:

- configurator;
- product order modal;
- contact/order-related components;
- admin components.

## Серверные locale/currency helpers

Сохрани текущую серверную валидацию:

- getLocale() читает cookie;
- getDisplayCurrency() читает cookie;
- невалидные значения не должны ломать страницу.

Убедись, что после нормализации proxy текущий SSR получает валидные значения.

Не читай localStorage ни в одном серверном файле.

Не добавляй отдельные параллельные механизмы выбора валюты.

## Настройки из БД

Не хардкодь редактируемые данные.

Список валют, finance.defaultCurrency и допустимые коды должны продолжать приходить из Settings/БД.

DEFAULT_CURRENCY остаётся только серверным fallback/deployment override.

Не переноси валюты или дефолты в статические словари.

## .env и документация

Добавить DEFAULT_COOKIESID в:

- site/.env.example;

Если найдено существующее deploy/readme-документание, добавить туда описание:

- DEFAULT_COOKIESID;
- DEFAULT_SKIN;
- DEFAULT_LOCALE;
- DEFAULT_CURRENCY;
- порядок приоритетов;
- что смена DEFAULT_COOKIESID сбрасывает пользовательские cookies при следующем запросе;
- что все пользовательские настройки находятся в cookies;
- localStorage больше не используется.

Не редактируй пользовательский site/.env с секретами или локальными настройками, если это не требуется для теста.

## Тесты и проверка

Добавь regression-проверки в соответствии с уже имеющимися conventions проекта.

В проекте нет полноценного test framework, поэтому:

- не добавляй новую тяжёлую зависимость без необходимости;
- можно добавить небольшой скрипт проверки или использовать Node/tsx;
- обязательно проверь реальные HTTP-сценарии.

Проверь минимум следующие случаи:

1. Чистый профиль, без cookies:
   - SSR использует DEFAULT_LOCALE;
   - SSR использует DEFAULT_CURRENCY;
   - SSR использует DEFAULT_SKIN;
   - ответ устанавливает julcraft-cookies-version;
   - ответ устанавливает все три пользовательские cookie на server defaults.

2. Версия совпадает:
   - cookie locale=en;
   - cookie currency=USD;
   - cookie skin=handmade;
   - SSR показывает lang="en";
   - цены показываются в USD;
   - первый stylesheet — style.css;
   - пользовательские cookies не сбрасываются.

3. Несовпадение версии:
   - версия пользователя старая;
   - пользователь ранее выбрал en/USD/handmade;
   - после запроса всё должно стать server defaults;
   - ответ должен содержать новые cookie;
   - старые значения не должны использоваться в текущем SSR.

4. Невалидная версия:
   - значение не является числом;
   - выполняется полный сброс.

5. Неполный набор при совпадающей версии:
   - locale валидна;
   - currency валидна;
   - skin отсутствует или невалиден;
   - сбрасывается только skin;
   - locale и currency сохраняются.

6. Невалидная валюта:
   - валюта отсутствует в Settings;
   - должна применяться server fallback;
   - не должна появляться в интерфейсе как выбранная несуществующая валюта.

7. Смена DEFAULT_COOKIESID:
   - после смены версии на сервере первый следующий запрос пользователя получает новые server defaults.

8. Убедись, что в актуальном коде нет обращений к:
   - localStorage.getItem("julcraft-locale");
   - localStorage.setItem("julcraft-locale", ...);
   - localStorage.getItem("julcraft-currency");
   - localStorage.setItem("julcraft-currency", ...);
   - localStorage.getItem("julcraft-skin");
   - localStorage.setItem("julcraft-skin", ...).

9. Проверь DOM/HTML:
   - html lang соответствует выбранному cookie;
   - link[rel="stylesheet"] соответствует выбранному skin-cookie уже в первом SSR;
   - панель не показывает неправильно выбранный язык или валюту;
   - цены соответствуют cookie.

10. Проверь реальные страницы:
   - главная;
   - каталог;
   - страница товара;
   - конфигуратор;
   - форма заказа;
   - админка;
   - order-success;
   - API заказов;
   - API валют.

## Проверки проекта

После реализации выполни:

- npx tsc --noEmit
- npm run check:i18n
- npm run build
- npm run lint

Учитывай, что до начала работы уже были обнаружены существующие lint-ошибки в:

- site/components/admin/CategoryList.tsx;
- site/components/product/OrderModal.tsx;
- site/components/configurator/OrderRequestModal.tsx.

Не исправляй эти несвязанные ошибки без необходимости. Если lint всё ещё падает на них, отдельно запусти targeted lint для изменённых файлов и честно укажи это в отчёте.

Не изменяй несвязанные файлы и не делай рефакторинг beyond scope.

## Итоговый отчёт

В конце верни:

1. какие файлы изменены;
2. как теперь работает приоритет:
   - locale;
   - currency;
   - skin;
   - version;
3. как происходит полный сброс;
4. как происходит частичный сброс;
5. как обеспечивается одинаковое значение в текущем SSR и response cookies;
6. какие реальные HTTP/DOM-сценарии проверены;
7. результаты:
   - tsc;
   - i18n;
   - build;
   - lint;
8. любые оставшиеся ограничения или предупреждения.