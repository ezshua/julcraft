# Задание агента — Этап 5. Конфигуратор (сборка украшения по слотам)

**Тип задачи:** клиентская интерактивная страница (react-konva) + серверный пересчёт цены/срока + расширение API заявок + отрисовка snapshot в админке и на чеке
**Зависимости:** этапы 1–4 выполнены и приёмлены (проект в `site/`: Next.js 16 + TS + Drizzle + SQLite; админка, API `/api/orders` (type=product), `/api/contact`, `OrderModal`, `/order-success` уже существуют). Мультивалютность (`plan-finances2.md`, D-15…D-28) реализована: цены — составные `(priceMinor, priceCurrency)`, есть `lib/currency.ts` (`sumPriced`, `formatPrice`, `Priced`), `lib/currency-server.ts` (`getDisplayCurrency`), `lib/format.ts`. Страница выбора категории `/configurator` (T-3.4) уже есть и переиспользуется.
**Связанные пункты плана:** `plan-2.md` §2 (карта: `configurator-config.html` ↔ `/configurator/[slug]`), §3 (D-3, D-4, D-5, D-9, D-11), §4 (react-konva, Next.js), §5 (модель), §6 (маршруты/API), §7 (логика), §8 Этап 5 (T-5.1 … T-5.4), §9 (Q-4); `plan-finances2.md` (D-15…D-28, агрегация D-26, отображение D-18/D-19); `plan2stage4.md` (контракт `OrderModal`/`configJson`, Q-4 Telegram).
**Версия плана:** `plan-2.md` (итерация 2) + `plan-finances2.md` — единственные действующие.

---

## Цель

Реализовать **полный цикл конфигуратора** «категория → слоты → коллаж → расчёт → заявка» как «копия макета 1:1 + данные из БД + мультивалютный расчёт»:

1. `/configurator/[slug]` — для категорий с `hasSlotTemplate=true`: аккордеон слотов, карточки комплектующих со stepper'ами, canvas-коллаж (react-konva: авторазмещение + drag/зум/удаление), живой калькулятор с breakdown, модалка заявки;
2. `POST /api/orders` принимает `type=custom`: сервер **пересчитывает** цену/срок (не доверяет клиенту), сохраняет PNG коллажа (`canvas.toDataURL`), пишет `Order` со snapshot конфигурации, шлёт уведомление;
3. админская `OrderModal` и публичный `/order-success` **отрисовывают snapshot custom-заявки** (валюто-осознанный чек состава) — Stage 4 это явно отложил («Этап 5 наполнит»).

Приёмка этапа (из плана): **полный цикл «категория → слоты → коллаж → расчёт → заявка» по макету**.

---

## Золотые правила (§0 плана) — обязательны

1. `mockup/` — **источник истины**. Структура HTML, CSS-классы, тексты, иконки (inline-SVG), состояния переносятся копированием 1:1 (`configurator-config.html`). Никаких Tailwind/shadcn (D-2). Классы конфигуратора уже есть в `style-memphis.css` / `style.css` — **CSS не трогаем**.
2. **Запрещено**: переделывать вёрстку, придумывать свои компоненты/дизайн/тексты/поля, «улучшать» одобренное.
3. Чего нет в макете — не додумывать; при блокере остановиться и записать вопрос руководителю (в отчёт).
4. Файлы `mockup/**` не редактировать — только читать. CSS/JS скинов не трогать.
5. Демо-цифры макета (цены/сроки в `configurator-config.html`) — демонстрационные; значения берутся из БД (D-11). Источник — публичные страницы (Кулоны «работа от 1 000 ₽ · 3 дн»).
6. **D-3:** пометки «sharp» — устаревшие; коллаж собирается **на клиенте** через react-konva и сохраняется PNG через `canvas.toDataURL()`. Никакой sharp-обработки на сервере.
7. Коммиты — только по явной команде руководителя.

---

## Решения руководителя (зафиксировано 2026-08-21, перед стартом этапа)

1. **Валюта расчёта — интегрировать мультивалютность** (`plan-finances2.md`, D-15…D-28). Живой и серверный расчёт идут через `sumPriced([category.workPrice, ...component.price, ...component.processingPrice], displayCurrency)`. Итог заявки сохраняется как `orders.calcPrice` + `orders.calcPriceCurrency` (колонки уже существуют). НЕ считать в «целых рублях» игнорируя систему валют.
2. **Полный цикл**: Этап 5 также обновляет `OrderModal` (админ) и `/order-success`, чтобы отрисовывать чек состава custom-заявки (валюто-осознанный). Это завершает цикл из плана.
3. **Формула срока — оставить D-5 как есть**: `СРОК = baseWorkDays + Σ(processingDays × qty) + max(deliveryDays среди выбранных, требующих заказа: stockQty=0 && isOrderable; иначе 0)`. В seed `processingDays=0` у всех — срок будет ≈ `baseWorkDays`; формула готова к реальным значениям.

**Решения руководителя №2 (зафиксировано 2026-08-25, ревизия перед стартом):**

4. **Никакого хардкода редактируемых данных.** Всё, что редактируется в админке (слоты, категории, типы комплектующих), при отображении читается из БД на момент запроса. Статичные карты-копии контента БД (`CONFIGURATOR_SLOT_DESC`, `HOME_CAT_DESC`) — удалить:
   - подпись «est» страницы конфигуратора: «{N} слот(ов): {имена слотов через запятую}» — собирается из `slotTemplates` категории;
   - заголовок «Собираем {винительный}»: исключение из правила — грамматический падеж не выводится из данных; статичная карта slug→винительный для существующих slug + **фолбэк на имя категории** для новых;
   - сопутствующая доработка Этапа 3 (мини-задача до/внутри Этапа 5): `/configurator` и плитка главной переходят с хардкода на данные БД (см. Шаг 0).
5. **Дубли componentType внутри шаблона одной категории — разрешены, вариант «склейки»** (замена прежнего запрета; мотивация: заказчику нужны, напр., 2–3 защёлки в колье-трансформере и несколько видов бусин в бусах). Несколько слотов одного типа UI объединяет в **одну корзину**: имя = имена слотов через « + », min = ΣminQty, max = ΣmaxQty. Выбор остаётся глобальным `Record<componentId, qty>` (у каждого компонента свой stepper, разные виды и количества допустимы), серверная валидация — по суммарным границам [Σmin, Σmax] на тип. Контракт API и snapshot не меняются. Раздельные корзины одного типа с независимым наполнением — отложено до реальной потребности (вариант B: `selections: {slotId, ...}`).
6. **Spike react-konva в начале этапа**: установить и проверить совместимость с React 19 / Next 16 до написания остального кода; при проблемах peer-deps — `--legacy-peer-deps` с фиксацией версий в отчёте. Запасной план при неработоспособности — нативный canvas 2D без konva (решение согласовать с руководителем).

Дополнительно (решения агента, зафиксировать в отчёте):
- **Единый источник формул** — вынести расчёт в `lib/calc.ts` (без `server-only`), импортируется и клиентом (live), и сервером (пересчёт). Гарантирует идентичность D-4/D-5 на клиенте и сервере.
- **Валюта заявки** = валюта отображения клиента на момент отправки (`displayCurrency` из cookie, которую сервер получает от клиента в теле запроса и валидирует по `finance.currencies`). «Цена фиксируется в заявке» (макет) — храним итог именно в этой валюте; snapshot дублирует её как `total`.
- **Снимок `configJson` (canonical shape)** — см. «Общий контракт данных». Старых custom-заявок нет, обратной совместимости не требуется.
- **Структура БД не меняется**: `orders.configJson` (text), `calcPrice`, `calcPriceCurrency`, `collagePath` уже есть. Миграция не нужна.
- **componentType — строковый код из справочника `componentTypes` (БД)**, а не enum из 6 значений: план писался до этапа componentsExt. Для чека брать человекочитаемое имя типа из справочника.

## Шаг 0. Де-хардкод подписей (доработка Этапа 3, по решению №4)

1. Удалить `CONFIGURATOR_SLOT_DESC` и `HOME_CAT_DESC` из `components/category/category-captions.ts`.
2. Плитка главной `/`: короткая подпись категории = первое предложение `categories.description` (до первой точки).
3. `/configurator`: подпись карточки = «{N} слот(ов): {имена слотов через запятую}» из `slotTemplates` (запросить слоты по каждой категории с `hasSlotTemplate`); категория без шаблона — как сейчас (disabled, подпись не нужна).
4. Визуально сверить с макетом: для seed-данных тексты должны быть близки к демо-подписям макета; расхождения допустимы (источник теперь БД).

---

## Контекст

- Макет — `mockup/configurator-config.html` (страница категории) и `mockup/configurator.html` (выбор — уже реализовано в `/configurator`). Сверка — построчно с `configurator-config.html`.
- Сайт — `site/`. Новая страница: `site/app/(public)/configurator/[slug]/page.tsx` (роут-группа `(public)` → переиспользует `app/(public)/layout.tsx` с `Header`/`Footer` из Settings, **а не демо-шапку/футер из макета** — в макете они демонстрационные: `ул. Радищева, 16` / `+7 999 000-76-76` / `hello@julcraft.ru`; сайт везде показывает реальные контакты из Settings, D-7/D-11).
- Контент страницы: `Crumbs` (Главная › Конфигуратор › {имя}), `signboard--small` (est «{slug-описание} · N слотов», h1 «Собираем {винительный}», tag из макета), `zigzag`, `sect` с `conf-tabs` / `conf-grid` (`conf-panel--canvas` + `conf-panel--slots`), `calc`, модалка заявки. Классы — точно из макета.
- Компоненты комплектующих (`components`) в seed имеют `photo` = SVG-заглушки в `public/uploads/components/*.svg` (копии inline-SVG). react-konva грузит их по URL как изображения; для реальных PNG (загруженных в админке) поведение то же.
- **Next.js 16**: перед написанием кода клиентских/серверных частей — прочитать гайды в `node_modules/next/dist/docs/` (конвенции могли измениться). react-konva **не SSR** — грузить canvas через `next/dynamic` с `{ ssr: false }` или guarded-mount.
- Зависимости: `react-konva` + `konva` (версия, совместимая с Next 16 / React 19). При проблемах peer-deps — `--legacy-peer-deps`, зафиксировать версию в отчёте.
- Окружение: Windows 11, Node v24.16.0. `npm run dev` — dev-сервер.
- Переключатель «Вид» (скин+валюта) перезагружает страницу при смене валюты, поэтому SSR всегда рендерит цены в актуальной `displayCurrency`; клиент получает `finance` + `currency` (объект `Currency`) от сервера как props и считает live через `sumPriced`/`formatPrice` локально.

---

## Общий контракт данных

### Снимок `configJson` для custom-заявки (canonical, валюто-осознанный)

```ts
type Priced = { priceMinor: number; priceCurrency: string };

type ConfigSnapshot = {
  categoryId: number;
  categoryName: string;
  categoryWorkPrice: Priced;          // работа мастера (исходная валюта категории)
  items: Array<{
    componentId: number;
    name: string;
    componentType: string;            // stone/pendant/bead/cord/clasp/base
    qty: number;
    price: Priced;                    // закупка (исходная валюта компонента)
    processingPrice: Priced;          // обработка (исходная валюта компонента)
    isOrderable: boolean;
    deliveryDays: number | null;      // для расчёта срока
  }>;
  total: Priced;                      // == orders.calcPrice / calcPriceCurrency
  days: number;                       // == orders.calcDays
};
```

Этот же объект используется и в `OrderModal` (админ), и в `/order-success`. Поля — `Priced`, а не просто числа, чтобы чек пересчитывался в любую валюту отображения (D-18/D-26).

### Расчёт (в `lib/calc.ts`, единый для клиента и сервера)

- `calcConfigPrice(category, selections, finance, display): Priced` — по D-4 (с учётом валюты):
  `sumPriced([category.workPrice(asPriced), ...для каждого выбранного компонента: component.price, component.processingPrice], display)`.
  Для breakdown калькулятора отдельно: `work = category.workPrice`, `components = sumPriced([...все component.price и component.processingPrice выбранных], display)`.
- `calcConfigDays(category, selections): number` — по D-5:
  `category.baseWorkDays + Σ(component.processingDays × qty) + max(component.deliveryDays среди выбранных, требующих заказа: stockQty=0 && isOrderable && deliveryDays>0; если таких нет — 0)`.
- `buildSnapshot(category, selections, finance, display): ConfigSnapshot` — собирает массив `items` (с `Priced` каждого поля из БД), `categoryWorkPrice`, `total = calcConfigPrice(...)`, `days = calcConfigDays(...)`.
- `selections` — массив `{ componentId, qty }`; функции принимают «обогащённые» данные (компоненты из БД). Клиент передаёт серверу только id+qty; сервер перевыбирает из БД и пересчитывает (не доверяем клиенту ценам/наличию).

---

## Шаг 1 (T-5.1). Страница категории: слоты и комплектующие

1. **`app/(public)/configurator/[slug]/page.tsx`** (server component):
   - загрузить категорию по `slug`; если нет / `!isActive` / `!hasSlotTemplate` → `notFound()` (для «Винтажный ремонт» ссылок нет — карточка disabled на `/configurator`);
   - загрузить слоты категории (`slotTemplates` по `categoryId`, сортировка `sortOrder`);
   - загрузить комплектующие: `isActive = true` (включая недоступные `stockQty=0 && !isOrderable` — они нужны для серых карточек, см. Шаг 1 п. 3); сгруппировать по `componentType`;
   - `currency = await getDisplayCurrency()`, `finance = getSettings().finance`;
   - передать всё в `<ConfiguratorClient category slots componentsByType finance currency />` (props — сериализуемые: компоненты с полями `id, name, componentType, price, priceCurrency, processingPrice, processingPriceCurrency, processingDays, stockQty, isOrderable, deliveryDays, photo`);
   - `<title>`: «Конфигуратор — {имя категории} · JulCraft» (как в макете `configurator-config.html`).
2. **`components/configurator/ConfiguratorClient.tsx`** (`"use client"`): копия разметки `configurator-config.html`:
   - `Crumbs` с `items=[{Главная,/},{Конфигуратор,/configurator},{имя}]`;
   - `signboard--small`: `est` = «{N} слот(ов): {имена слотов через запятую}» — из `slotTemplates` категории по решению №4 (Шаг 0), `h1` «Собираем {винительный}» (карта slug→винительный + фолбэк на имя категории для slug без карты), `tag` — копия из макета (для Кулонов — «камень · подвески · шнур · застёжка — коллаж соберётся сам, вы можете двигать детали»; для прочих — **имена типов комплектующих** (человекочитаемые имена из справочника `componentTypes`) через запятую, не имена слотов — по решению руководителя от 2026-08-25);
   - `conf-tabs` (Коллаж / Слоты и цена) — переключение `is-active` + показ панелей, как `switchConf` в макете (на ≤820px калькулятор уже фиксируется снизу по CSS макета);
   - `conf-grid`: слева `conf-panel--canvas` (Шаг 2), справа `conf-panel--slots` (аккордеон слотов);
   - состояние выбора: `Record<componentId, qty>` (stepper в карточке и в коллаже синхронизированы через одно состояние).
3. **Аккордеон слотов** — копия `.accordion`/`.slot` из макета: `slot-head` (номер-`sq`, имя слота, `small` «min N · max M», `caret`), `slot-body` → `.comps` → `.comp-card` на каждый компонент слота (фильтр по `componentType` слота): `.thumb` (фото — `<img src={photo}>`), `.info` (имя + «{price} + обработка {processingPrice} · {бейдж наличия}»), `.side`:
   - `stepper` (`−` / `val` / `+`) с границами **по типу (склеенной группе слотов, решение №5)**: сумма qty всех компонентов этого `componentType` в пределах `[ΣminQty, ΣmaxQty]` всех слотов этого типа; `+` заблокирован при достижении ΣmaxQty; `−` убирает из выбора;
   - бейдж наличия: `tag--stock` «в наличии» (stockQty>0), `tag--order` «под заказ · N дн» (isOrderable, deliveryDays>0);
   - недоступные (stockQty=0 && !isOrderable) — показываются **серыми карточками `is-disabled`**, как в макете; выбор запрещён (stepper неактивен); серверная валидация их всё равно отклонит (Шаг 4).
4. **Живой пересчёт** (часть T-5.3): на каждое изменение `selections` — `calcConfigPrice`/`calcConfigDays` (из `lib/calc.ts`) в `currency` (props), ререндер калькулятора и коллажа.

## Шаг 2 (T-5.2). Canvas-коллаж (react-konva)

1. **`components/configurator/CollageCanvas.tsx`** — `"use client"`, импорт `Stage, Layer, Image` из `react-konva`; грузить **только на клиенте**: в `ConfiguratorClient` подключать через `next/dynamic(() => import("./CollageCanvas"), { ssr: false })`, либо guarded `useEffect`-монтаж. Canvas не должен рендериться на сервере (иначе ошибка SSR).
2. **Авторазмещение** — детерминированная сетка по слотам: для каждого выбранного компонента (по `selections`, каждая единица qty = отдельный размещённый узел) сгенерировать позицию в сетке (слоты идут колонками/строками, внутри слота — по порядку). Размер узла — фиксированный (как `.placed` в макете), изображение (`photo`) центрируется.
3. **Загрузка изображений**: для каждого `photo` (URL `/uploads/components/*.svg` или PNG) создать `window.Image()`, на `onload` — в состояние; react-konva `<Image image={img} />`. SVG грузуются браузером как картинка.
4. **Drag / zoom / удаление** (как в макете, notice «react-konva: авторазмещение + drag/зум/удаление»):
   - **drag** — `draggable` на узле (native react-konva);
   - **zoom** — колесо мыши меняет `scale` выбранного узла (или `Stage`); ограничить разумным диапазоном;
   - **удаление** — клик по узлу выделяет; «✕» поверх узла (или клавиша) уменьшает `qty` этого компонента в `selections` на 1 (но не ниже 0); при qty=0 узел исчезает. Синхронизация с stepper двусторонняя.
5. **Кнопка «↺»** (`ca-bar .tools` `icon-btn`, title «Сбросить коллаж») — сброс позиций/масштабов узлов к авторазмещению (qty из `selections` не трогает).
6. `canvas-area` / `ca-bar` / `canvas` / `notice` — копия классов из макета; текст `notice` — копия («В бою это react-konva…»).
7. **Экспорт**: `CollageCanvas` предоставляет `ref`/callback, возвращающий `stage.toDataURL({ pixelRatio: 2 })` (PNG). `ConfiguratorClient` держит dataURL в состоянии для модалки заявки.

## Шаг 3 (T-5.3). Калькулятор (live)

1. Блок `.calc` (sticky, копия из макета) в `ConfiguratorClient`:
   - `row--big`: «Итого · цена» → `formatPrice(calcConfigPrice(...), currency, finance)`; `breakdown` — «Работа: {formatPrice(work, currency, finance)} + Компоненты: {formatPrice(components, currency, finance)}» (как в макете: «Работа: 1 000 ₽ + Компоненты: 1 540 ₽»);
   - `row`: «Срок изготовления» → «{days} дн»; `breakdown` — «База {baseWorkDays} дн + обработка {Σ processingDays×qty} дн + доставка {maxDelivery} дн» (как в макете);
   - кнопка «Оформить заявку» (`btn btn--primary`) → открывает модалку заявки.
2. Расчёт идёт **только через `lib/calc.ts`** (общий с сервером) — никаких параллельных формул в компоненте.
3. Если обязательный слот (minQty>0) не заполнен — кнопка заблокирована (disabled), подсказка «Выберите компоненты». При `minQty=0` у всех слотов — разрешаем отправку.

## Шаг 4 (T-5.4). Отправка заявки + snapshot + уведомление

1. **Модалка заявки** — копия `div.modal-overlay#modal` из `configurator-config.html`: `m-head` («Заявка: {винительный} по вашим слотам» + «✕»), `m-photo` (превью коллажа `img src={dataURL}` + подпись «{имя категории}: {перечень выбранных}» + цена/срок), поля Имя / Контакт / Комментарий (как в макете), `m-actions` «Отправить заявку» + «Отмена», `thanks` «*** без предоплаты · цена фиксируется в заявке ***».
   - валидация полей (имя/контакт непустые) — как в `/api/orders` для product.
   - по сабмиту — `POST /api/orders` с `type=custom` + `collageDataUrl` (dataURL из `CollageCanvas`), затем редирект на `/order-success/[id]`.
2. **`POST /api/orders`** — расширить существующий route (дискриминирующий Zod по `type`):
   - `type: "custom"` → тело: `{ categoryId: number, selections: { componentId: number, qty: number }[], customerName, contact, message, displayCurrency: string, collageDataUrl?: string }`;
   - **сервер не доверяет клиенту**: по `categoryId` выбрать категорию (проверить `hasSlotTemplate`), слоты; для каждого `selections[].componentId` выбрать компонент из БД (проверить `isActive`, принадлежность `componentType` одному из слотов категории, доступность `stockQty>0 || isOrderable`); **валидировать** сумму qty по каждому типу (склеенной группе слотов, решение №5) в `[ΣminQty, ΣmaxQty]` всех слотов этого типа; qty — целые ≥0;
   - пересчитать `total = calcConfigPrice(category, enrichedSelections, finance, displayCurrency-валюта)` и `days = calcConfigDays(category, enrichedSelections)` — **через те же `lib/calc.ts`**, что и клиент;
   - `displayCurrency` валидировать по `finance.currencies` (иначе 400);
   - `collageDataUrl`: если есть и валиден (`data:image/png;base64,...`, размер ≤ `MAX_COLLAGE_BYTES` = 2 МБ, решение «Вопрос 2») — декодировать `Buffer`, записать `public/uploads/collages/<timestamp>-<rand>.png` (`fs.mkdirSync` recursive; директория уже в `.gitignore`), путь `/uploads/collages/...png` → `collagePath`; если нет — `collagePath = null`;
   - собрать `configJson = JSON.stringify(buildSnapshot(category, enrichedSelections, finance, displayCurrency-валюта))` (canonical shape);
   - вставить `Order`: `type:"custom"`, `customerName`, `contact`, `message`, `productId:null`, `configJson`, `collagePath`, `calcPrice: total.priceMinor`, `calcPriceCurrency: total.priceCurrency`, `calcDays: days`, `status:"new"`, `createdAt/updatedAt`;
   - **уведомление**: `sendTelegram(notice)` где `notice` = сумма в **валюте отображения мастера** (`getDisplayCurrency()` сервера) через `sumPriced`, текст «[заявка {id}] конфигуратор: {категория}; клиент: {имя} ({контакт}); цена: {formatPrice(total, masterCurrency, finance)}; срок: {days} дн; состав: ...». Без токенов — `console.log` (D-14/Q-4).
   - вернуть `{ id }` → клиент редиректит на `/order-success/[id]`.
   - **Не ломать** существующий `type:"product"` бранч.

## Шаг 5 (общий). Отрисовка snapshot (полный цикл — решение руководителя №2)

1. **`components/admin/OrderModal.tsx`** (custom-ветка): привести чтение `configJson` к canonical shape (`items: [{componentId, name, qty, price:Priced, processingPrice:Priced, ...}]`, `categoryName`, `categoryWorkPrice:Priced`). Рендер чека (внутри `.receipt`, как сейчас):
   - для каждого `item`: строка «{name} ×{qty}» + `formatPrice(item.price, currency, finance) × qty`; подстрока «&nbsp;&nbsp;обработка ×{qty}» + `formatPrice(item.processingPrice, currency, finance) × qty`;
   - «Работа мастера ({categoryName})» + `formatPrice(categoryWorkPrice, currency, finance)`;
   - «Итого» `formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance)`;
   - «Срок» `{order.calcDays} дн`;
   - валюта `currency` берётся из `useCurrency(finance, currencyCode)` (как сейчас). Удалить использование `formatSnapshot` (RUB-only) для custom.
2. **`app/(public)/order-success/[id]/page.tsx`** (custom-ветка `receiptRows`): типизация `ConfigItem` → canonical (`price: Priced, processingPrice: Priced`, `categoryName`, `categoryWorkPrice`). СОСТАВ рендерить как чек: строки «{name} ×{qty} — {formatPrice(price×qty)}» (+ обработка), «Работа мастера ({categoryName}) — {formatPrice(categoryWorkPrice)}», «Итого — {formatPrice(calcPrice)}», «СРОК — {days} дн», «КОЛЛАЖ — приложен к заявке» (если `collagePath`). Заменить текущий «join name×qty» на развёрнутый чек (стиль макета `order-success.html`).
3. **Зависимости/типы**: `Priced` и `asPriced` — из `lib/currency` (переэкспортированы в `lib/format`). `formatPrice` — из `lib/format`. Оба файла клиентобезопасны (уже используются в клиенте).

---

## Критерии приёмки

1. `/configurator/[slug]` для категорий с `hasSlotTemplate=true` визуально повторяет `mockup/configurator-config.html` (структура/классы/тексты signboard, crumbs, conf-tabs, conf-grid, calc, модалка). Категория без шаблона / несуществующая → 404.
2. Слоты: аккордеон раскрывается/скрывается; карточки компонентов отфильтрованы по `componentType` слота; stepper ограничен `[Σmin, Σmax]` по типу (склеенной группе слотов); бейджи наличия («в наличии» / «под заказ · N дн») — из БД; недоступные — серые `is-disabled` без выбора.
3. Коллаж (react-konva): узлы авторазмещаются по слотам; drag/зум/удаление работают; «↺» сбрасывает позиции; удаление узла уменьшает qty в слоте (двусторонняя синхронизация со stepper); коллаж не рендерится на сервере (нет ошибок SSR/hydration).
4. Калькулятор: живой пересчёт цены (Работа + Компоненты) и срока (База + обработка + доставка) через `lib/calc.ts` в текущей `displayCurrency`; breakdown совпадает с формулой макета; кнопка заблокирована при незаполненном обязательном слоте.
5. Отправка: `POST /api/orders` `type=custom` сохраняет `Order` со `configJson` (canonical shape), `calcPrice`+`calcPriceCurrency` (в валюте клиента), `calcDays`, `collagePath` (PNG из dataURL записан в `public/uploads/collages/`) при наличии; сервер **пересчитывает** цену/срок и валидирует слоты (подмена цен/qty на клиенте не проходит); редирект на `/order-success/[id]`.
6. Уведомление: при заполненных `telegram.botToken/chatId` — реальное сообщение (сумма в валюте мастера); без токенов — `console.log` (поведение не сломалось). `type=product` бранч не сломан.
7. `OrderModal` (админ) и `/order-success` отрисовывают развёрнутый чек custom-заявки (цена/обработка/работа/итого/срок) в валюте просмотра; коллаж открывается в модалке админа.
8. `npm run build` и `npm run lint` без ошибок; `npm run db:seed` / `db:check` не сломаны; файлы `mockup/**` не изменены; переключатель скинов/валют работает на новой странице (единственный stylesheet).

## Не делать (out of scope)

- Авторизация, админ-CRUD, склад, категории, дашборд, настройки — Этап 4 (уже сделано).
- next/image, SEO-мета, sitemap, адаптив-сверка по брейкпоинтам, Lighthouse — Этап 6.
- Деплой — Этап 7.
- sharp и любая серверная обработка изображений (D-3); новые UI-фреймворки (D-2).
- Редактирование заявки, Nodemailer (в макете — только текст «Email — запасной канал»), корзина/оплата/кабинеты.
- Изменения схемы БД, правки CSS/JS макета, коммиты без команды руководителя.

## Вопросы/уточнения — ВСЕ РЕШЕНЫ руководителем (2026-08-25, работать строго по решениям)

**Решение по подписям** (бывший Вопрос 2): карта slug→винительный — статичная + фолбэк на имя категории; подписи слотов/категорий — из БД по решению №4 (Шаг 0).

1. **«Под заказ» компоненты → показывать доступными для выбора** (альтернатива принята). Компоненты `isOrderable` с `deliveryDays` отображаются как доступные с бейджем «под заказ · N дн» и участвуют в расчёте срока по D-5 (`max(deliveryDays)` уже в формуле — изменений не требуется). Полностью недоступные (`stockQty=0 && !isOrderable`) — **серыми карточками `is-disabled` без возможности выбора**, как в макете (решение руководителя от 2026-08-25).

2. **Лимит dataURL коллажа = 2 МБ**, в коде — именованная константа (например, `MAX_COLLAGE_BYTES` рядом с API-роутом или в `lib/calc.ts`), чтобы лимит менялся в одном месте.
3. **Удаление узла коллажа — «✕» поверх выбранного узла** (как в админ-модалке коллажа); уменьшает qty компонента в `selections` на 1, двусторонняя синхронизация со stepper слота.

## Порядок и отчёт

Последовательно: Шаг 0 → 1 → 2 → 3 → 4 → 5 (внутри шага — по порядку пунктов; spike react-konva — в начале Шага 2, до написания остального кода; `lib/calc.ts` — первым, его используют и клиент, и сервер). По завершении — отчёт руководителю: что сделано, команды проверки (`npm run dev` / `build` / `lint` / `db:seed` / `db:check`), список созданных/изменённых файлов, версии `react-konva`/`konva`, фиксация решений по всем вопросам раздела (включая решение по подписям), запись для «Журнала изменений» `plan-2.md` (отметить чекбоксы T-5.1 … T-5.4, добавить запись о мультивалютном расчёте конфигуратора). После подтверждения приёмки — отметить чекбоксы в `plan-2.md` §8.
