import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "../lib/db";
import {
  categories,
  components,
  orders,
  products,
  settings,
  slotTemplates,
} from "../drizzle/schema";
import type { ComponentType, ProductAvailability } from "../drizzle/schema";

// ============================================================
// Данные — точная копия макета mockup/ (источник истины, D-11)
// ============================================================

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  workPrice: number;
  baseWorkDays: number;
};

const categorySeed: CategorySeed[] = [
  {
    name: "Броши",
    slug: "broshi",
    description: "эмаль, бакелит, перламутр. Прикалываются к пальто и сердцу.",
    workPrice: 1200,
    baseWorkDays: 3,
  },
  {
    name: "Кулоны",
    slug: "kulony",
    description:
      "стекло цвета бабушкиных ваз, эмаль, янтарь — на цепочке или вощёном шнуре",
    workPrice: 1000,
    baseWorkDays: 3,
  },
  {
    name: "Серьги",
    slug: "sergi",
    description: "хрусталь, бакелит, латунь. Лёгкие — даже не заметите.",
    workPrice: 900,
    baseWorkDays: 2,
  },
  {
    name: "Кольца",
    slug: "kolca",
    description: "бакелит, латунь 925. Сядут как влитые — проверено на витрине.",
    workPrice: 800,
    baseWorkDays: 2,
  },
  {
    name: "Браслеты",
    slug: "braslety",
    description: "винил, кожа, стекло. Под стать кассетнику в машине.",
    workPrice: 1100,
    baseWorkDays: 3,
  },
  {
    name: "Бусы и ожерелья",
    slug: "busy-i-ozherelya",
    description: "стеклярус, бакелит. Нанизаны вручную, по минуте на бусину.",
    workPrice: 1500,
    baseWorkDays: 4,
  },
  {
    name: "Комплекты",
    slug: "komplekty",
    description: "серьги + брошь и другие дуэты. Уже подобраны, не ссорятся.",
    workPrice: 2500,
    baseWorkDays: 5,
  },
  {
    name: "Клипсы и манжеты",
    slug: "klipsy-i-manzhety",
    description: "пластик, перламутр. Для ушей без проколов и смелых решений.",
    workPrice: 900,
    baseWorkDays: 2,
  },
  {
    name: "Амулеты и подвески",
    slug: "amulety-i-podveski",
    description: "на удачу, по примете и просто потому что красиво.",
    workPrice: 1000,
    baseWorkDays: 3,
  },
  {
    name: "Винтажный ремонт",
    slug: "vintazhnyj-remont",
    description: "починим бабушкины клипсы и одинокие серьги. От 300 ₽.",
    workPrice: 300,
    baseWorkDays: 0,
  },
];

type SlotSeed = {
  name: string;
  componentType: ComponentType;
  minQty: number;
  maxQty: number;
};

// Составы слотов — из configurator.html; min/max Кулонов — из configurator-config.html
const slotSeed: Record<string, SlotSeed[]> = {
  broshi: [
    { name: "Основной камень", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Подвески-дополнения", componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: "Основа", componentType: "base", minQty: 1, maxQty: 1 },
  ],
  kulony: [
    { name: "Основной камень", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Подвески-дополнения", componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: "Цепь или шнур", componentType: "cord", minQty: 1, maxQty: 1 },
    { name: "Застёжка", componentType: "clasp", minQty: 0, maxQty: 1 },
  ],
  sergi: [
    { name: "Основной камень", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Швензы", componentType: "base", minQty: 1, maxQty: 1 },
  ],
  kolca: [
    { name: "Основной камень", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Основа", componentType: "base", minQty: 1, maxQty: 1 },
  ],
  braslety: [
    { name: "Бусины", componentType: "bead", minQty: 0, maxQty: 10 },
    { name: "Подвески-дополнения", componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: "Замок", componentType: "clasp", minQty: 1, maxQty: 1 },
  ],
  "busy-i-ozherelya": [
    { name: "Бусины", componentType: "bead", minQty: 0, maxQty: 10 },
    { name: "Основной камень", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Подвески-дополнения", componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: "Замок", componentType: "clasp", minQty: 1, maxQty: 1 },
  ],
  komplekty: [
    { name: "Камень (серьги)", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Швензы", componentType: "base", minQty: 1, maxQty: 1 },
    { name: "Камень (брошь)", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Подвески-дополнения", componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: "Основа броши", componentType: "base", minQty: 1, maxQty: 1 },
  ],
  "klipsy-i-manzhety": [
    { name: "Основной камень", componentType: "stone", minQty: 1, maxQty: 1 },
    { name: "Основа", componentType: "base", minQty: 1, maxQty: 1 },
  ],
  "amulety-i-podveski": [
    { name: "Подвеска", componentType: "pendant", minQty: 1, maxQty: 1 },
    { name: "Бусины", componentType: "bead", minQty: 0, maxQty: 10 },
    { name: "Шнур", componentType: "cord", minQty: 1, maxQty: 1 },
  ],
};

type ComponentSeed = {
  name: string;
  componentType: ComponentType;
  price: number;
  processingPrice: number;
  stockQty: number;
  isOrderable: boolean;
  deliveryDays: number | null;
  photoFile: string;
};

// Склад — из admin/components.html (порядок строк таблицы = порядок SVG)
const componentSeed: ComponentSeed[] = [
  { name: "Камень «Око бакелита»", componentType: "stone", price: 350, processingPrice: 80, stockQty: 4, isOrderable: false, deliveryDays: null, photoFile: "oko-bakelita.svg" },
  { name: "Камень «Гранёное стекло»", componentType: "stone", price: 180, processingPrice: 60, stockQty: 12, isOrderable: false, deliveryDays: null, photoFile: "granyone-steklo.svg" },
  { name: "Камень «Хрустальная слеза»", componentType: "stone", price: 420, processingPrice: 90, stockQty: 0, isOrderable: true, deliveryDays: 10, photoFile: "hrustalnaya-sleza.svg" },
  { name: "Камень «Коралловый сон»", componentType: "stone", price: 300, processingPrice: 70, stockQty: 6, isOrderable: false, deliveryDays: null, photoFile: "korallovyj-son.svg" },
  { name: "Камень «Лунный агат»", componentType: "stone", price: 520, processingPrice: 100, stockQty: 0, isOrderable: true, deliveryDays: 14, photoFile: "lunnyj-agat.svg" },
  { name: "Камень «Малахитовая капля»", componentType: "stone", price: 480, processingPrice: 90, stockQty: 3, isOrderable: false, deliveryDays: null, photoFile: "malahitovaya-kaplya.svg" },
  { name: "Подвеска «Ромашка-76»", componentType: "pendant", price: 220, processingPrice: 50, stockQty: 9, isOrderable: false, deliveryDays: null, photoFile: "romashka-76.svg" },
  { name: "Подвеска «Сердце из латуни»", componentType: "pendant", price: 160, processingPrice: 40, stockQty: 15, isOrderable: false, deliveryDays: null, photoFile: "serdce-iz-latuni.svg" },
  { name: "Подвеска «Пуговица-счастье»", componentType: "pendant", price: 190, processingPrice: 45, stockQty: 7, isOrderable: false, deliveryDays: null, photoFile: "pugovica-schastie.svg" },
  { name: "Подвеска «Ключик от чулана»", componentType: "pendant", price: 150, processingPrice: 40, stockQty: 11, isOrderable: false, deliveryDays: null, photoFile: "klyuchik-ot-chulana.svg" },
  { name: "Подвеска «Рыбка-чешуйка»", componentType: "pendant", price: 210, processingPrice: 50, stockQty: 0, isOrderable: true, deliveryDays: 7, photoFile: "rybka-cheshujka.svg" },
  { name: "Бусины бакелитовые, 10 шт", componentType: "bead", price: 240, processingPrice: 60, stockQty: 20, isOrderable: false, deliveryDays: null, photoFile: "businy-bakelitovye.svg" },
  { name: "Бусины стеклярус, 10 шт", componentType: "bead", price: 120, processingPrice: 40, stockQty: 30, isOrderable: false, deliveryDays: null, photoFile: "businy-steklyarus.svg" },
  { name: "Бусины деревянные «Ольха», 10 шт", componentType: "bead", price: 90, processingPrice: 30, stockQty: 40, isOrderable: false, deliveryDays: null, photoFile: "businy-olha.svg" },
  { name: "Бусины янтарные, 10 шт", componentType: "bead", price: 350, processingPrice: 70, stockQty: 8, isOrderable: false, deliveryDays: null, photoFile: "businy-yantarnye.svg" },
  { name: "Бусины костяные «Шашки», 10 шт", componentType: "bead", price: 300, processingPrice: 65, stockQty: 0, isOrderable: true, deliveryDays: 9, photoFile: "businy-shashki.svg" },
  { name: "Шнур вощёный, 1 м", componentType: "cord", price: 60, processingPrice: 20, stockQty: 50, isOrderable: false, deliveryDays: null, photoFile: "shnur-voshyonyj.svg" },
  { name: "Шнур кожаный, 1 м", componentType: "cord", price: 140, processingPrice: 25, stockQty: 22, isOrderable: false, deliveryDays: null, photoFile: "shnur-kozhanyj.svg" },
  { name: "Цепь латунная, 50 см", componentType: "cord", price: 250, processingPrice: 40, stockQty: 14, isOrderable: false, deliveryDays: null, photoFile: "cep-latunnaya.svg" },
  { name: "Цепь серебряная, 45 см", componentType: "cord", price: 900, processingPrice: 60, stockQty: 0, isOrderable: true, deliveryDays: 18, photoFile: "cep-serebryanaya.svg" },
  { name: "Замок-карабин латунный", componentType: "clasp", price: 70, processingPrice: 30, stockQty: 35, isOrderable: false, deliveryDays: null, photoFile: "zamok-karabin.svg" },
  { name: "Замок «торец» антик", componentType: "clasp", price: 110, processingPrice: 35, stockQty: 10, isOrderable: false, deliveryDays: null, photoFile: "zamok-torec.svg" },
  { name: "Колпачки для бус, пара", componentType: "clasp", price: 40, processingPrice: 15, stockQty: 60, isOrderable: false, deliveryDays: null, photoFile: "kolpachki-dlya-bus.svg" },
  { name: "Швензы латунные, пара", componentType: "base", price: 50, processingPrice: 20, stockQty: 45, isOrderable: false, deliveryDays: null, photoFile: "shvenzy-latunnye.svg" },
  { name: "Основа броши-игла, латунь", componentType: "base", price: 80, processingPrice: 25, stockQty: 28, isOrderable: false, deliveryDays: null, photoFile: "osnova-broshi.svg" },
];

type ProductSeed = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  price: number;
  isNew: boolean;
  isFeatured: boolean;
  availability: ProductAvailability;
  orderDays: number | null;
  photoId: string;
};

// Товары — home.html (12) + category.html (7 кулонов); slug'и — admin/products.html
const productSeed: ProductSeed[] = [
  {
    name: "Брошь «Ромашковая»",
    slug: "brosh-romashkovaya",
    categorySlug: "broshi",
    description: "эмаль по меди, ручная роспись; застёжка-игла",
    price: 1950,
    isNew: false,
    isFeatured: true,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1630019852942-f89202989a59",
  },
  {
    name: "Серьги «Танец-76»",
    slug: "sergi-tanec-76",
    categorySlug: "sergi",
    description: "бакелитовые диски, латунь; вес пером, настроение — паркет",
    price: 2300,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1611591437281-460bfbe1220a",
  },
  {
    name: "Кулон «Телеграмма»",
    slug: "kulon-telegramma",
    categorySlug: "kulony",
    description: "стекло цвета бабушкиной вазы; цепочка латунная, 50 см",
    price: 2700,
    isNew: true,
    isFeatured: true,
    availability: "reserve",
    orderDays: null,
    photoId: "photo-1596944924616-7b38e7cfac36",
  },
  {
    name: "Брошь «Грибная поляна»",
    slug: "brosh-gribnaya-polyana",
    categorySlug: "broshi",
    description: "бакелит, янтарная крошка; три боровичка и мухомор",
    price: 2450,
    isNew: true,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1611652022419-a9419f74343d",
  },
  {
    name: "Серьги «Капли дождя»",
    slug: "sergi-kapli-dozhdya",
    categorySlug: "sergi",
    description: "горный хрусталь, латунь; звонкие, как град по крыше",
    price: 1900,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1535632066927-ab7c9ab60908",
  },
  {
    name: "Кольцо «Воскресное»",
    slug: "kolco-voskresnoe",
    categorySlug: "kolca",
    description: "бакелит, латунь 925; сядет как влитое, поверьте",
    price: 1750,
    isNew: false,
    isFeatured: false,
    availability: "made_to_order",
    orderDays: 7,
    photoId: "photo-1515562141207-7a88fb7ce338",
  },
  {
    name: "Браслет «Кассета-минус»",
    slug: "braslet-kasseta-minus",
    categorySlug: "braslety",
    description: "винил, кожа, латунная застёжка; играет сингл 1978-го",
    price: 2100,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1617038220319-276d3cfab638",
  },
  {
    name: "Бусы «Капсула времени»",
    slug: "busy-kapsula-vremeni",
    categorySlug: "busy-i-ozherelya",
    description: "стеклярус, бакелит; вручную, каждая бусина — своя история",
    price: 3200,
    isNew: true,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1599643478518-a784e5dc4c8f",
  },
  {
    name: "Кулон «Письмо из 76-го»",
    slug: "kulon-pismo-iz-76",
    categorySlug: "kulony",
    description: "эмаль, латунь; конверт-форма, внутри — секрет",
    price: 2600,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1611085583191-a3b181a88401",
  },
  {
    name: "Клипсы «Паркетный вальс»",
    slug: "klipsy-parketnyj-vals",
    categorySlug: "klipsy-i-manzhety",
    description: "пластик, перламутр; не отваливаются даже на танцполе",
    price: 1600,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1601121141461-9d6647bca1ed",
  },
  {
    name: "Комплект «Вечер на Радищева»",
    slug: "komplekt-vecher-na-radishcheva",
    categorySlug: "komplekty",
    description: "серьги + брошь, бакелит; для тех самых выходов",
    price: 4200,
    isNew: false,
    isFeatured: true,
    availability: "made_to_order",
    orderDays: 10,
    photoId: "photo-1517841905240-472988babdf9",
  },
  {
    name: "Амулет «Счастливая пуговица»",
    slug: "amulet-schastlivaya-pugovica",
    categorySlug: "amulety-i-podveski",
    description: "перламутр, латунь; от растерянности и скучных дней",
    price: 1450,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1517841905240-472988babdf9",
  },
  {
    name: "Кулон «Лунный свет из чулана»",
    slug: "kulon-lunnyj-svet-iz-chulana",
    categorySlug: "kulony",
    description: "полупрозрачное стекло; светится в темноте — почти",
    price: 2400,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1599643478518-a784e5dc4c8f",
  },
  {
    name: "Кулон «Бабушкина ваза»",
    slug: "kulon-babushkina-vaza",
    categorySlug: "kulony",
    description: "бакелит с прожилками; точь-в-точь сервиз из серванта",
    price: 2300,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1535632066927-ab7c9ab60908",
  },
  {
    name: "Кулон «Радио-волна»",
    slug: "kulon-radio-volna",
    categorySlug: "kulony",
    description: "эмаль, латунь; ловит волны 76-го диапазона",
    price: 2050,
    isNew: true,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1611652022419-a9419f74343d",
  },
  {
    name: "Кулон «Монета-76»",
    slug: "kulon-moneta-76",
    categorySlug: "kulony",
    description: "латунь, чеканка вручную; на счастье и сдачу",
    price: 1900,
    isNew: false,
    isFeatured: false,
    availability: "made_to_order",
    orderDays: 5,
    photoId: "photo-1515562141207-7a88fb7ce338",
  },
  {
    name: "Кулон «Северное сияние»",
    slug: "kulon-severnoe-siyanie",
    categorySlug: "kulony",
    description: "стеклярус и ирисы; переливается даже в пасмурный день",
    price: 2850,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1611591437281-460bfbe1220a",
  },
  {
    name: "Кулон «Тишина в библиотеке»",
    slug: "kulon-tishina-v-biblioteke",
    categorySlug: "kulony",
    description: "перламутр, латунь; не звенит, не отвлекает",
    price: 2200,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoId: "photo-1601121141461-9d6647bca1ed",
  },
  {
    name: "Кулон «Морской узел»",
    slug: "kulon-morskoj-uzel",
    categorySlug: "kulony",
    description: "кожаный шнур, латунный узел; не развяжется — проверено",
    price: 1750,
    isNew: false,
    isFeatured: false,
    availability: "made_to_order",
    orderDays: 7,
    photoId: "photo-1517841905240-472988babdf9",
  },
];

const hoursSeed = [
  { day: "Понедельник", value: "выходной", closed: true },
  { day: "Вторник — Пятница", value: "11:00 — 20:00" },
  { day: "Суббота", value: "12:00 — 19:00" },
  { day: "Воскресенье", value: "12:00 — 17:00" },
];

const shortReceiptSeed = {
  rows: [
    { label: "ХОЗЯЙКА", value: "Юля Крафт" },
    { label: "СТАЖ ЗА ВЕРСТАКОМ", value: "12 лет" },
    { label: "ЛЮБИМАЯ ЭПОХА", value: "1972–1981" },
    { label: "ЛЮБИМЫЙ МАТЕРИАЛ", value: "бакелит" },
    { label: "НЕЛЮБИМАЯ ФРАЗА", value: "«это сейчас не в моде»" },
    { label: "ЧАЙ ПОКУПАТЕЛЯМ", value: "бесплатно" },
    { label: "РЕМОНТ СТАРИНЫ", value: "от 300 ₽" },
  ],
  thanks: "*** СПАСИБО ЗА ВИЗИТ. ВОЗВРАЩАЙТЕСЬ ***",
};

const historyReceiptSeed = {
  rows: [
    { label: "ХОЗЯЙКА", value: "Юля Крафт" },
    { label: "СТАЖ ЗА ВЕРСТАКОМ", value: "12 лет" },
    { label: "ПЕРВОЕ ИЗДЕЛИЕ", value: "бусы из бабушкиного стекляруса" },
    { label: "ЛЮБИМАЯ ЭПОХА", value: "1972–1981" },
    { label: "ЛЮБИМЫЙ МАТЕРИАЛ", value: "бакелит" },
    { label: "ЛЮБИМЫЙ ИНСТРУМЕНТ", value: "паяльник «Чародейка»" },
    { label: "НЕЛЮБИМАЯ ФРАЗА", value: "«это сейчас не в моде»" },
    { label: "РЕМОНТ СТАРИНЫ", value: "от 300 ₽" },
    { label: "СБОРКА НА ЗАКАЗ", value: "от 800 ₽ + материалы" },
    { label: "СРОК ОБЫЧНОЙ РАБОТЫ", value: "3–7 дней" },
    { label: "ГАРАНТИЯ", value: "пожизненный ремонт своих работ" },
    { label: "ЧАЙ ПОКУПАТЕЛЯМ", value: "бесплатно" },
    { label: "СДАЧА", value: "улыбка" },
  ],
  thanks: "*** СПАСИБО ЗА ВНИМАНИЕ. ВОЗВРАЩАЙТЕСЬ С ИСТОРИЯМИ ***",
};

const principlesSeed = [
  { title: "Один экземпляр", text: "каждая вещь делается один раз — повторить невозможно, даже если очень просят" },
  { title: "Без спешки", text: "срок в заявке честный, а не «как получится» — лучше подождать и получить как надо" },
  { title: "Вторая жизнь", text: "ремонт старины дешевле новой вещи — и честно интереснее" },
  { title: "Чай и радио", text: "гость с историей — лучший посетитель. Приходите просто так" },
];

const settingsSeed: Record<string, string> = {
  "contacts.phone": "+38 095 358 48 11",
  "contacts.email": "julcraft79@gmail.com",
  "contacts.address": "ул. Мстислава Скрипника, 40А",
  "contacts.telegram": "https://t.me/julcraft_76",
  "contacts.instagram": "https://instagram.com/julcraft_76",
  "contacts.hours": JSON.stringify(hoursSeed),
  "about.short": JSON.stringify(shortReceiptSeed),
  "about.history": JSON.stringify(historyReceiptSeed),
  "about.principles": JSON.stringify(principlesSeed),
};

// ============================================================
// Механика сида
// ============================================================

// «резерв до пт»: конец текущей пятницы, если сегодня пятница, иначе ближайшая
function nextFriday(): Date {
  const d = new Date();
  let diff = (5 - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

// inline-SVG из mockup/admin/components.html — ровно как в макете, в порядке строк таблицы
function extractComponentSvgs(): string[] {
  const mockupPath = resolve(process.cwd(), "..", "mockup", "admin", "components.html");
  const html = readFileSync(mockupPath, "utf8");
  const matches = [...html.matchAll(/<div class="thumb">([\s\S]*?)<\/div>/g)];
  const svgs = matches.map((m) => m[1].trim());
  if (svgs.length < componentSeed.length) {
    throw new Error(
      `В components.html найдено ${svgs.length} превью, ожидалось ${componentSeed.length}`,
    );
  }
  return svgs;
}

function main() {
  migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  // очистка в порядке FK
  db.delete(orders).run();
  db.delete(products).run();
  db.delete(slotTemplates).run();
  db.delete(components).run();
  db.delete(categories).run();
  db.delete(settings).run();

  // 1. Категории
  const categoryIds = new Map<string, number>();
  categorySeed.forEach((c, i) => {
    const res = db
      .insert(categories)
      .values({
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: null,
        workPrice: c.workPrice,
        baseWorkDays: c.baseWorkDays,
        hasSlotTemplate: c.slug !== "vintazhnyj-remont",
        isActive: true,
        sortOrder: i + 1,
      })
      .run();
    categoryIds.set(c.slug, Number(res.lastInsertRowid));
  });

  // 2. Шаблоны слотов
  let slotCount = 0;
  for (const [slug, slots] of Object.entries(slotSeed)) {
    slots.forEach((s, i) => {
      db.insert(slotTemplates)
        .values({
          categoryId: categoryIds.get(slug)!,
          name: s.name,
          componentType: s.componentType,
          minQty: s.minQty,
          maxQty: s.maxQty,
          sortOrder: i + 1,
        })
        .run();
      slotCount += 1;
    });
  }

  // 3. Комплектующие + SVG-заглушки (копии inline-SVG из макета)
  const svgs = extractComponentSvgs();
  const componentsDir = resolve(process.cwd(), "public", "uploads", "components");
  mkdirSync(componentsDir, { recursive: true });
  componentSeed.forEach((c, i) => {
    writeFileSync(resolve(componentsDir, c.photoFile), svgs[i], "utf8");
    db.insert(components)
      .values({
        name: c.name,
        componentType: c.componentType,
        price: c.price,
        processingPrice: c.processingPrice,
        processingDays: 0,
        stockQty: c.stockQty,
        isOrderable: c.isOrderable,
        deliveryDays: c.deliveryDays,
        photo: `/uploads/components/${c.photoFile}`,
        isActive: true,
      })
      .run();
  });

  // 4. Товары
  const now = new Date();
  productSeed.forEach((p) => {
    db.insert(products)
      .values({
        categoryId: categoryIds.get(p.categorySlug)!,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        images: [`https://images.unsplash.com/${p.photoId}?w=800&q=80`],
        isNew: p.isNew,
        isFeatured: p.isFeatured,
        availability: p.availability,
        reserveUntil: p.availability === "reserve" ? nextFriday() : null,
        orderDays: p.orderDays,
        metaTitle: null,
        metaDescription: null,
        ogImage: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  // 5. Settings
  for (const [key, value] of Object.entries(settingsSeed)) {
    db.insert(settings).values({ key, value }).run();
  }

  console.log(
    `Seed готов: ${categorySeed.length} категорий, ${slotCount} слотов, ` +
      `${componentSeed.length} комплектующих (SVG в public/uploads/components/), ` +
      `${productSeed.length} товаров, ${Object.keys(settingsSeed).length} ключей settings`,
  );
}

main();
sqlite.close();
