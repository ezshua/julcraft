import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "../lib/db";
import {
  categories,
  componentTypes,
  components,
  orders,
  products,
  settings,
  slotTemplates,
} from "../drizzle/schema";
import type { ComponentType, ProductAvailability } from "../drizzle/schema";
import { amountToMinor } from "../lib/currency";
import { type LocalizedString } from "../lib/localize";

// ============================================================
// Данные — точная копия макета mockup/ (источник истины, D-11)
// ============================================================

// Цены в макете — в гривнах. В БД хранятся как Priced: минора в гривнах + код "UAH" (RUB исключён, решение 2026-09).

type CategorySeed = {
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  workPrice: number;
  baseWorkDays: number;
};

const categorySeed: CategorySeed[] = [
  {
    name: { ru: "Броши", en: "Brooches", uk: "Броші" },
    slug: "broshi",
    description: { ru: "эмаль, бакелит, перламутр. Прикалываются к пальто и сердцу.", en: "Enamel, bakelite, mother-of-pearl. They pin to coats — and to hearts.", uk: "Емаль, бакеліт, перламутр. Прикріпляються до пальто і серця." },
    workPrice: 1200,
    baseWorkDays: 3,
  },
  {
    name: { ru: "Кулоны", en: "Pendants", uk: "Кулони" },
    slug: "kulony",
    description: { ru: "стекло цвета бабушкиных ваз, эмаль, янтарь — на цепочке или вощёном шнуре", en: "Glass in grandma's vase colours, enamel, amber — on a chain or waxed cord", uk: "Скло кольору бабусиних ваз, емаль, янтар — на ланцюжку або восковому шнурі" },
    workPrice: 1000,
    baseWorkDays: 3,
  },
  {
    name: { ru: "Серьги", en: "Earrings", uk: "Сережки" },
    slug: "sergi",
    description: { ru: "хрусталь, бакелит, латунь. Лёгкие — даже не заметите.", en: "Crystal, bakelite, brass. Light — you won't even notice.", uk: "Кристал, бакеліт, латунь. Легкі — навіть не помітите." },
    workPrice: 900,
    baseWorkDays: 2,
  },
  {
    name: { ru: "Кольца", en: "Rings", uk: "Кільца" },
    slug: "kolca",
    description: { ru: "бакелит, латунь 925. Сядут как влитые — проверено на витрине.", en: "Bakelite, 925 brass. They'll fit perfectly — proven in the window.", uk: "Бакеліт, латунь 925. Сядуть, ніби влиті — перевірено на вітрині." },
    workPrice: 800,
    baseWorkDays: 2,
  },
  {
    name: { ru: "Браслеты", en: "Bracelets", uk: "Браслети" },
    slug: "braslety",
    description: { ru: "винил, кожа, стекло. Под стать кассетнику в машине.", en: "Vinyl, leather, glass. Right up the cassette lover's alley in the car.", uk: "Вініл, шкіра, скло. Гідні касетнику в машині." },
    workPrice: 1100,
    baseWorkDays: 3,
  },
  {
    name: { ru: "Бусы и ожерелья", en: "Beads and necklaces", uk: "Буси і намисто" },
    slug: "busy-i-ozherelya",
    description: { ru: "стеклярус, бакелит. Нанизаны вручную, по минуте на бусину.", en: "Glass beads, bakelite. Hand-strung, a minute per bead.", uk: "склярус, бакеліт. Нанизані вручну, хвилина на бусину." },
    workPrice: 1500,
    baseWorkDays: 4,
  },
  {
    name: { ru: "Комплекты", en: "Sets", uk: "Комплекти" },
    slug: "komplekty",
    description: { ru: "серьги + брошь и другие дуэты. Уже подобраны, не ссорятся.", en: "Earrings + brooch and other duos. Already curated — no bickering.", uk: "сережки + брош і інші дуети. Вже підірані, не сваряться." },
    workPrice: 2500,
    baseWorkDays: 5,
  },
  {
    name: { ru: "Клипсы и манжеты", en: "Clips and cuffs", uk: "Кліpsi і манжети" },
    slug: "klipsy-i-manzhety",
    description: { ru: "пластик, перламутр. Для ушей без проколов и смелых решений.", en: "Plastic, mother-of-pearl. For unpierced ears and bold choices.", uk: "пластик, перламутр. Для вушок без проколів і сміливих рішень." },
    workPrice: 900,
    baseWorkDays: 2,
  },
  {
    name: { ru: "Амулеты и подвески", en: "Amulets and pendants", uk: "Амулети і підвіски" },
    slug: "amulety-i-podveski",
    description: { ru: "на удачу, по примете и просто потому что красиво.", en: "For luck, for signs, and just because it's pretty.", uk: "на щастя, за приметами і просто тому, що красиво." },
    workPrice: 1000,
    baseWorkDays: 3,
  },
  {
    name: { ru: "Винтажный ремонт", en: "Vintage repair", uk: "Вінтажний ремонт" },
    slug: "vintazhnyj-remont",
    description: { ru: "починим бабушкины клипсы и одинокие серьги. От 300 ₴.", en: "We fix grandma's clips and lonely earrings. From 300 ₴.", uk: "ремонтуємо бабусині кліpsi та самотні сережки. Від 300 ₴." },
    workPrice: 300,
    baseWorkDays: 0,
  },
];

type SlotSeed = {
  name: LocalizedString;
  componentType: ComponentType;
  minQty: number;
  maxQty: number;
};

// Составы слотов — из configurator.html; min/max Кулонов — из configurator-config.html
const slotSeed: Record<string, SlotSeed[]> = {
  broshi: [
    { name: { ru: "Основной камень", en: "Main stone", uk: "Головний камінь" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Подвески-дополнения", en: "Extra pendants", uk: "Додаткові підвіски" }, componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: { ru: "Основа", en: "Base", uk: "Основа" }, componentType: "base", minQty: 1, maxQty: 1 },
  ],
  kulony: [
    { name: { ru: "Основной камень", en: "Main stone", uk: "Головний камінь" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Подвески-дополнения", en: "Extra pendants", uk: "Додаткові підвіски" }, componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: { ru: "Цепь или шнур", en: "Chain or cord", uk: "Ланцюжок або шнур" }, componentType: "cord", minQty: 1, maxQty: 1 },
    { name: { ru: "Застёжка", en: "Clasp", uk: "Застіжка" }, componentType: "clasp", minQty: 0, maxQty: 1 },
  ],
  sergi: [
    { name: { ru: "Основной камень", en: "Main stone", uk: "Головний камінь" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Швензы", en: "Earring posts", uk: "Швензи" }, componentType: "base", minQty: 1, maxQty: 1 },
  ],
  kolca: [
    { name: { ru: "Основной камень", en: "Main stone", uk: "Головний камінь" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Основа", en: "Base", uk: "Основа" }, componentType: "base", minQty: 1, maxQty: 1 },
  ],
  braslety: [
    { name: { ru: "Бусины", en: "Beads", uk: "Бусини" }, componentType: "bead", minQty: 0, maxQty: 10 },
    { name: { ru: "Подвески-дополнения", en: "Extra pendants", uk: "Додаткові підвіски" }, componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: { ru: "Замок", en: "Clasp", uk: "Замок" }, componentType: "clasp", minQty: 1, maxQty: 1 },
  ],
  "busy-i-ozherelya": [
    { name: { ru: "Бусины", en: "Beads", uk: "Бусини" }, componentType: "bead", minQty: 0, maxQty: 10 },
    { name: { ru: "Основной камень", en: "Main stone", uk: "Головний камінь" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Подвески-дополнения", en: "Extra pendants", uk: "Додаткові підвіски" }, componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: { ru: "Замок", en: "Clasp", uk: "Замок" }, componentType: "clasp", minQty: 1, maxQty: 1 },
  ],
  komplekty: [
    { name: { ru: "Камень (серьги)", en: "Stone (earrings)", uk: "Камінь (сережки)" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Швензы", en: "Earring posts", uk: "Швензи" }, componentType: "base", minQty: 1, maxQty: 1 },
    { name: { ru: "Камень (брошь)", en: "Stone (brooch)", uk: "Камінь (брош)" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Подвески-дополнения", en: "Extra pendants", uk: "Додаткові підвіски" }, componentType: "pendant", minQty: 0, maxQty: 3 },
    { name: { ru: "Основа броши", en: "Brooch base", uk: "Основа брошу" }, componentType: "base", minQty: 1, maxQty: 1 },
  ],
  "klipsy-i-manzhety": [
    { name: { ru: "Основной камень", en: "Main stone", uk: "Головний камінь" }, componentType: "stone", minQty: 1, maxQty: 1 },
    { name: { ru: "Основа", en: "Base", uk: "Основа" }, componentType: "base", minQty: 1, maxQty: 1 },
  ],
  "amulety-i-podveski": [
    { name: { ru: "Подвеска", en: "Pendant", uk: "Підвіска" }, componentType: "pendant", minQty: 1, maxQty: 1 },
    { name: { ru: "Бусины", en: "Beads", uk: "Бусини" }, componentType: "bead", minQty: 0, maxQty: 10 },
    { name: { ru: "Шнур", en: "Cord", uk: "Шнур" }, componentType: "cord", minQty: 1, maxQty: 1 },
  ],
};

type ComponentSeed = {
  name: LocalizedString;
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
  { name: { ru: "Камень «Око бакелита»", en: "Stone \"Eye of Bakelite\"", uk: "Камінь \"Око бакеліту\"" }, componentType: "stone", price: 350, processingPrice: 80, stockQty: 4, isOrderable: false, deliveryDays: null, photoFile: "oko-bakelita.svg" },
  { name: { ru: "Камень «Гранёное стекло»", en: "Stone \"Faceted Glass\"", uk: "Камінь \"Гранене скло\"" }, componentType: "stone", price: 180, processingPrice: 60, stockQty: 12, isOrderable: false, deliveryDays: null, photoFile: "granyone-steklo.svg" },
  { name: { ru: "Камень «Хрустальная слеза»", en: "Stone \"Crystal Tear\"", uk: "Камінь \"Кристальна сльоза\"" }, componentType: "stone", price: 420, processingPrice: 90, stockQty: 0, isOrderable: true, deliveryDays: 10, photoFile: "hrustalnaya-sleza.svg" },
  { name: { ru: "Камень «Коралловый сон»", en: "Stone \"Coral Dream\"", uk: "Камінь \"Кораловий сон\"" }, componentType: "stone", price: 300, processingPrice: 70, stockQty: 6, isOrderable: false, deliveryDays: null, photoFile: "korallovyj-son.svg" },
  { name: { ru: "Камень «Лунный агат»", en: "Stone \"Moon Agate\"", uk: "Камінь \"Місячний агат\"" }, componentType: "stone", price: 520, processingPrice: 100, stockQty: 0, isOrderable: true, deliveryDays: 14, photoFile: "lunnyj-agat.svg" },
  { name: { ru: "Камень «Малахитовая капля»", en: "Stone \"Malachite Drop\"", uk: "Камінь \"Малахитова крапля\"" }, componentType: "stone", price: 480, processingPrice: 90, stockQty: 3, isOrderable: false, deliveryDays: null, photoFile: "malahitovaya-kaplya.svg" },
  { name: { ru: "Подвеска «Ромашка-76»", en: "Pendant \"Daisy-76\"", uk: "Підвіска \"Ромашка-76\"" }, componentType: "pendant", price: 220, processingPrice: 50, stockQty: 9, isOrderable: false, deliveryDays: null, photoFile: "romashka-76.svg" },
  { name: { ru: "Подвеска «Сердце из латуни»", en: "Pendant \"Brass Heart\"", uk: "Підвіска \"Латунне серце\"" }, componentType: "pendant", price: 160, processingPrice: 40, stockQty: 15, isOrderable: false, deliveryDays: null, photoFile: "serdce-iz-latuni.svg" },
  { name: { ru: "Подвеска «Пуговица-счастье»", en: "Pendant \"Button of Luck\"", uk: "Підвіска \"Кнопка щастя\"" }, componentType: "pendant", price: 190, processingPrice: 45, stockQty: 7, isOrderable: false, deliveryDays: null, photoFile: "pugovica-schastie.svg" },
  { name: { ru: "Подвеска «Ключик от чулана»", en: "Pendant \"Closet Key\"", uk: "Підвіска \"Ключик від шафи\"" }, componentType: "pendant", price: 150, processingPrice: 40, stockQty: 11, isOrderable: false, deliveryDays: null, photoFile: "klyuchik-ot-chulana.svg" },
  { name: { ru: "Подвеска «Рыбка-чешуйка»", en: "Pendant \"Little Fish Scale\"", uk: "Підвіска \"Рибка-чешуйка\"" }, componentType: "pendant", price: 210, processingPrice: 50, stockQty: 0, isOrderable: true, deliveryDays: 7, photoFile: "rybka-cheshujka.svg" },
  { name: { ru: "Бусины бакелитовые, 10 шт", en: "Bakelite beads, 10 pcs", uk: "Бусини бакелітові, 10 шт" }, componentType: "bead", price: 240, processingPrice: 60, stockQty: 20, isOrderable: false, deliveryDays: null, photoFile: "businy-bakelitovye.svg" },
  { name: { ru: "Бусины стеклярус, 10 шт", en: "Glass beads, 10 pcs", uk: "Бусини склярус, 10 шт" }, componentType: "bead", price: 120, processingPrice: 40, stockQty: 30, isOrderable: false, deliveryDays: null, photoFile: "businy-steklyarus.svg" },
  { name: { ru: "Бусины деревянные «Ольха», 10 шт", en: "Wooden beads \"Alder\", 10 pcs", uk: "Бусини дерев'яні \"Ольха\", 10 шт" }, componentType: "bead", price: 90, processingPrice: 30, stockQty: 40, isOrderable: false, deliveryDays: null, photoFile: "businy-olha.svg" },
  { name: { ru: "Бусины янтарные, 10 шт", en: "Amber beads, 10 pcs", uk: "Бусини янтарні, 10 шт" }, componentType: "bead", price: 350, processingPrice: 70, stockQty: 8, isOrderable: false, deliveryDays: null, photoFile: "businy-yantarnye.svg" },
  { name: { ru: "Бусины костяные «Шашки», 10 шт", en: "Bone beads \"Checkers\", 10 pcs", uk: "Бусини кістяні \"Шашки\", 10 шт" }, componentType: "bead", price: 300, processingPrice: 65, stockQty: 0, isOrderable: true, deliveryDays: 9, photoFile: "businy-shashki.svg" },
  { name: { ru: "Шнур вощёный, 1 м", en: "Waxed cord, 1 m", uk: "Восковий шнур, 1 м" }, componentType: "cord", price: 60, processingPrice: 20, stockQty: 50, isOrderable: false, deliveryDays: null, photoFile: "shnur-voshyonyj.svg" },
  { name: { ru: "Шнур кожаный, 1 м", en: "Leather cord, 1 m", uk: "Шкіряний шнур, 1 м" }, componentType: "cord", price: 140, processingPrice: 25, stockQty: 22, isOrderable: false, deliveryDays: null, photoFile: "shnur-kozhanyj.svg" },
  { name: { ru: "Цепь латунная, 50 см", en: "Brass chain, 50 cm", uk: "Латунний ланцюжок, 50 см" }, componentType: "cord", price: 250, processingPrice: 40, stockQty: 14, isOrderable: false, deliveryDays: null, photoFile: "cep-latunnaya.svg" },
  { name: { ru: "Цепь серебряная, 45 см", en: "Silver chain, 45 cm", uk: "Срібний ланцюжок, 45 см" }, componentType: "cord", price: 900, processingPrice: 60, stockQty: 0, isOrderable: true, deliveryDays: 18, photoFile: "cep-serebryanaya.svg" },
  { name: { ru: "Замок-карабин латунный", en: "Brass carabiner clasp", uk: "Карабінний замок латунний" }, componentType: "clasp", price: 70, processingPrice: 30, stockQty: 35, isOrderable: false, deliveryDays: null, photoFile: "zamok-karabin.svg" },
  { name: { ru: "Замок «торец» антик", en: "Clasp \"End Cap\" antique", uk: "Замок \"Торец\" антик" }, componentType: "clasp", price: 110, processingPrice: 35, stockQty: 10, isOrderable: false, deliveryDays: null, photoFile: "zamok-torec.svg" },
  { name: { ru: "Колпачки для бус, пара", en: "Bead caps, pair", uk: "Ковпачки для бус, пара" }, componentType: "clasp", price: 40, processingPrice: 15, stockQty: 60, isOrderable: false, deliveryDays: null, photoFile: "kolpachki-dlya-bus.svg" },
  { name: { ru: "Швензы латунные, пара", en: "Brass earring posts, pair", uk: "Латунні швензи, пара" }, componentType: "base", price: 50, processingPrice: 20, stockQty: 45, isOrderable: false, deliveryDays: null, photoFile: "shvenzy-latunnye.svg" },
  { name: { ru: "Основа броши-игла, латунь", en: "Brooch pin base, brass", uk: "Основа брошу-игла, латунь" }, componentType: "base", price: 80, processingPrice: 25, stockQty: 28, isOrderable: false, deliveryDays: null, photoFile: "osnova-broshi.svg" },
];

// Типы комплектующих (план componentsExt): коды совпадают с историческими
// значениями COMPONENT_TYPES — обратная совместимость данных сохранена.
// Seed делает полный пересид (решение по плану): кастомные типы стираются.
const componentTypeSeed: Array<{
  code: string;
  name: LocalizedString;
  sortOrder: number;
}> = [
  { code: "stone", name: { ru: "Камень", en: "Stone", uk: "Камінь" }, sortOrder: 0 },
  { code: "pendant", name: { ru: "Подвеска", en: "Pendant", uk: "Підвіска" }, sortOrder: 1 },
  { code: "bead", name: { ru: "Бусина", en: "Bead", uk: "Бусина" }, sortOrder: 2 },
  { code: "cord", name: { ru: "Шнур и цепь", en: "Cord and chain", uk: "Шнур і ланцюжок" }, sortOrder: 3 },
  { code: "clasp", name: { ru: "Застёжка", en: "Clasp", uk: "Застіжка" }, sortOrder: 4 },
  { code: "base", name: { ru: "Основа", en: "Base", uk: "Основа" }, sortOrder: 5 },
];

type ProductSeed = {
  name: LocalizedString;
  slug: string;
  categorySlug: string;
  description: LocalizedString;
  price: number;
  isNew: boolean;
  isFeatured: boolean;
  availability: ProductAvailability;
  orderDays: number | null;
  photoFile: string;
  materials?: string[];
  specs?: string[];
};

// Товары — home.html (12) + category.html (7 кулонов); slug'и — admin/products.html
const productSeed: ProductSeed[] = [
  {
    name: { ru: "Брошь «Ромашковая»", en: "Brooch \"Daisy\"", uk: "Брош \"Ромашкова\"" },
    slug: "brosh-romashkovaya",
    categorySlug: "broshi",
    description: { ru: "эмаль по меди, ручная роспись; застёжка-игла", en: "Copper enamel, hand-painted; pin clasp", uk: "Емаль на міді, ручний розпис; ігольна застіжка" },
    price: 1950,
    isNew: false,
    isFeatured: true,
    availability: "in_stock",
    orderDays: null,
    photoFile: "brosh-romashkovaya.jpg",
  },
  {
    name: { ru: "Серьги «Танец-76»", en: "Earrings \"Dance-76\"", uk: "Сережки \"Танец-76\"" },
    slug: "sergi-tanec-76",
    categorySlug: "sergi",
    description: { ru: "бакелитовые диски, латунь; вес пером, настроение — паркет", en: "Bakelite discs, brass; feather-light, parquet mood", uk: "Бакелітові диски, латунь; вага пір'їна, настрій — паркет" },
    price: 2300,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "sergi-tanec-76.jpg",
  },
  {
    name: { ru: "Кулон «Телеграмма»", en: "Pendant \"Telegram\"", uk: "Кулон \"Телеграмма\"" },
    slug: "kulon-telegramma",
    categorySlug: "kulony",
    description: { ru: "стекло цвета бабушкиной вазы; цепочка латунная, 50 см", en: "Glass in grandma's vase colour; brass chain, 50 cm", uk: "Скло кольору бабусиного горщика; латунний ланцюжок, 50 см" },
    price: 2700,
    isNew: true,
    isFeatured: true,
    availability: "reserve",
    orderDays: null,
    photoFile: "kulon-telegramma.jpg",
    materials: [
      JSON.stringify({ ru: "стекло", en: "glass", uk: "скло" }),
      JSON.stringify({ ru: "латунь", en: "brass", uk: "латунь" }),
      JSON.stringify({ ru: "гравировка", en: "engraving", uk: "гравірування" }),
    ],
    specs: [
      JSON.stringify({ ru: "Размер: 32 × 24 мм, толщина 8 мм", en: "Size: 32 × 24 mm, 8 mm thick", uk: "Розмір: 32 × 24 мм, товщина 8 мм" }),
      JSON.stringify({ ru: "Цепочка латунная 50 см в комплекте", en: "Brass chain 50 cm included", uk: "Латунний ланцюжок 50 см в комплекті" }),
      JSON.stringify({ ru: "Вес: 11 г — лёгкий, как утренние планы", en: "Weight: 11 g — light as morning plans", uk: "Вага: 11 г — легкий, як ранні плани" }),
      JSON.stringify({ ru: "Уход: протирать фланелью, не ронять на асфальт", en: "Care: wipe with flannel, don't drop on asphalt", uk: "Догляд: протирати фланеллю, не кидати на асфальт" }),
    ],
  },
  {
    name: { ru: "Брошь «Грибная поляна»", en: "Brooch \"Mushroom Glade\"", uk: "Брош \"Грибна поляна\"" },
    slug: "brosh-gribnaya-polyana",
    categorySlug: "broshi",
    description: { ru: "бакелит, янтарная крошка; три боровичка и мухомор", en: "Bakelite, amber crumble; three boletes and a fly agaric", uk: "Бакеліт, янтарна кришка; три боровики і мухомор" },
    price: 2450,
    isNew: true,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "brosh-gribnaya-polyana.jpg",
  },
  {
    name: { ru: "Серьги «Капли дождя»", en: "Earrings \"Raindrops\"", uk: "Сережки \"Каплі дощу\"" },
    slug: "sergi-kapli-dozhdya",
    categorySlug: "sergi",
    description: { ru: "горный хрусталь, латунь; звонкие, как град по крыше", en: "Mountain crystal, brass; ringing like hail on the roof", uk: "Гірський кристал, латунь; дзвінкі, як град по даху" },
    price: 1900,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "sergi-kapli-dozhdya.jpg",
  },
  {
    name: { ru: "Кольцо «Воскресное»", en: "Ring \"Sunday\"", uk: "Кільце \"Неділя\"" },
    slug: "kolco-voskresnoe",
    categorySlug: "kolca",
    description: { ru: "бакелит, латунь 925; сядет как влитое, поверьте", en: "Bakelite, 925 brass; fits like a glove, believe me", uk: "Бакеліт, латунь 925; сяде, ніби влито, повірте" },
    price: 1750,
    isNew: false,
    isFeatured: false,
    availability: "made_to_order",
    orderDays: 7,
    photoFile: "kolco-voskresnoe.jpg",
  },
  {
    name: { ru: "Браслет «Кассета-минус»", en: "Bracelet \"Cassette-Minus\"", uk: "Браслет \"Касета-мінус\"" },
    slug: "braslet-kasseta-minus",
    categorySlug: "braslety",
    description: { ru: "винил, кожа, латунная застёжка; играет сингл 1978-го", en: "Vinyl, leather, brass clasp; plays the '78 single", uk: "Вініл, шкіра, латунна застіжка; грає сингл 1978-го" },
    price: 2100,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "braslet-kasseta-minus.jpg",
  },
  {
    name: { ru: "Бусы «Капсула времени»", en: "Beads \"Time Capsule\"", uk: "Буси \"Капсула часу\"" },
    slug: "busy-kapsula-vremeni",
    categorySlug: "busy-i-ozherelya",
    description: { ru: "стеклярус, бакелит; вручную, каждая бусина — своя история", en: "Glass beads, bakelite; handmade, every bead has its own story", uk: "склярус, бакеліт; вручну, кожна бусина — своя історія" },
    price: 3200,
    isNew: true,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "busy-kapsula-vremeni.jpg",
  },
  {
    name: { ru: "Кулон «Письмо из 76-го»", en: "Pendant \"Letter from '76\"", uk: "Кулон \"Лист з 76-го\"" },
    slug: "kulon-pismo-iz-76",
    categorySlug: "kulony",
    description: { ru: "эмаль, латунь; конверт-форма, внутри — секрет", en: "Enamel, brass; envelope shape, a secret inside", uk: "Емаль, латунь; конверт-форма, всередині — секрет" },
    price: 2600,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "kulon-pismo-iz-76.jpg",
  },
  {
    name: { ru: "Клипсы «Паркетный вальс»", en: "Clips \"Parquet Waltz\"", uk: "Кліpsi \"Паркетний вальс\"" },
    slug: "klipsy-parketnyj-vals",
    categorySlug: "klipsy-i-manzhety",
    description: { ru: "пластик, перламутр; не отваливаются даже на танцполе", en: "Plastic, mother-of-pearl; they don't fall off even on the dance floor", uk: "пластик, перламутр; не відпадають навіть на танцполі" },
    price: 1600,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "klipsy-parketnyj-vals.jpg",
  },
  {
    name: { ru: "Комплект «Вечер на Радищева»", en: "Set \"Evening on Radishchev\"", uk: "Комплект \"Вечір на Радищева\"" },
    slug: "komplekt-vecher-na-radishcheva",
    categorySlug: "komplekty",
    description: { ru: "серьги + брошь, бакелит; для тех самых выходов", en: "Earrings + brooch, bakelite; for those special nights out", uk: "сережки + брош, бакеліт; для тих самих виходів" },
    price: 4200,
    isNew: false,
    isFeatured: true,
    availability: "made_to_order",
    orderDays: 10,
    photoFile: "komplekt-vecher-na-radishcheva.jpg",
  },
  {
    name: { ru: "Амулет «Счастливая пуговица»", en: "Amulet \"Lucky Button\"", uk: "Амулет \"Щаслива кнопка\"" },
    slug: "amulet-schastlivaya-pugovica",
    categorySlug: "amulety-i-podveski",
    description: { ru: "перламутр, латунь; от растерянности и скучных дней", en: "Mother-of-pearl, brass; from confusion and dull days", uk: "перламутр, латунь; від розгубленості та скухних днів" },
    price: 1450,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "amulet-schastlivaya-pugovica.jpg",
  },
  {
    name: { ru: "Кулон «Лунный свет из чулана»", en: "Pendant \"Moonlight from the Closet\"", uk: "Кулон \"Місячний світ з шафи\"" },
    slug: "kulon-lunnyj-svet-iz-chulana",
    categorySlug: "kulony",
    description: { ru: "полупрозрачное стекло; светится в темноте — почти", en: "Translucent glass; glows in the dark — almost", uk: "Напівпрозоре скло; світиться в темноті — майже" },
    price: 2400,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "kulon-lunnyj-svet-iz-chulana.jpg",
  },
  {
    name: { ru: "Кулон «Бабушкина ваза»", en: "Pendant \"Grandma's Vase\"", uk: "Кулон \"Бабусина ваза\"" },
    slug: "kulon-babushkina-vaza",
    categorySlug: "kulony",
    description: { ru: "бакелит с прожилками; точь-в-точь сервиз из серванта", en: "Bakelite with veins; dead ringer for a sideboard set", uk: "Бакеліт з жилками; точнісінько сервіз із серванта" },
    price: 2300,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "kulon-babushkina-vaza.jpg",
  },
  {
    name: { ru: "Кулон «Радио-волна»", en: "Pendant \"Radio Wave\"", uk: "Кулон \"Радіо-хвиля\"" },
    slug: "kulon-radio-volna",
    categorySlug: "kulony",
    description: { ru: "эмаль, латунь; ловит волны 76-го диапазона", en: "Enamel, brass; catches waves from the '76 band", uk: "Емаль, латунь; ловить хвилі 76-го діапазону" },
    price: 2050,
    isNew: true,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "kulon-radio-volna.jpg",
  },
  {
    name: { ru: "Кулон «Монета-76»", en: "Pendant \"Coin-76\"", uk: "Кулон \"Монета-76\"" },
    slug: "kulon-moneta-76",
    categorySlug: "kulony",
    description: { ru: "латунь, чеканка вручную; на счастье и сдачу", en: "Brass, hand-struck; for luck and change", uk: "Латунь, ручне карбування; на щастя і здачу" },
    price: 1900,
    isNew: false,
    isFeatured: false,
    availability: "made_to_order",
    orderDays: 5,
    photoFile: "kulon-moneta-76.jpg",
  },
  {
    name: { ru: "Кулон «Северное сияние»", en: "Pendant \"Northern Lights\"", uk: "Кулон \"Північне сяйво\"" },
    slug: "kulon-severnoe-siyanie",
    categorySlug: "kulony",
    description: { ru: "стеклярус и ирисы; переливается даже в пасмурный день", en: "Glass beads and iris beads; shimmers even on a cloudy day", uk: "склярус і іриси; переливається навіть у похмурний день" },
    price: 2850,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "kulon-severnoe-siyanie.jpg",
  },
  {
    name: { ru: "Кулон «Тишина в библиотеке»", en: "Pendant \"Library Silence\"", uk: "Кулон \"Тишина в бібліотеці\"" },
    slug: "kulon-tishina-v-biblioteke",
    categorySlug: "kulony",
    description: { ru: "перламутр, латунь; не звенит, не отвлекает", en: "Mother-of-pearl, brass; no jingling, no distractions", uk: "перламутр, латунь; не дзвінить, не відволікає" },
    price: 2200,
    isNew: false,
    isFeatured: false,
    availability: "in_stock",
    orderDays: null,
    photoFile: "kulon-tishina-v-biblioteke.jpg",
  },
  {
    name: { ru: "Кулон «Морской узел»", en: "Pendant \"Sea Knot\"", uk: "Кулон \"Морський вузол\"" },
    slug: "kulon-morskoj-uzel",
    categorySlug: "kulony",
    description: { ru: "кожаный шнур, латунный узел; не развяжется — проверено", en: "Leather cord, brass knot; won't come undone — proven", uk: "Шкіряний шнур, латунний вузол; не розв'яжеться — перевірено" },
    price: 1750,
    isNew: false,
    isFeatured: false,
    availability: "made_to_order",
    orderDays: 7,
    photoFile: "kulon-morskoj-uzel.jpg",
  },
];

const hoursSeed = [
  { day: { ru: "Понедельник", en: "Monday", uk: "Понеділок" }, value: { ru: "выходной", en: "closed", uk: "вихідний" }, closed: true },
  { day: { ru: "Вторник — Пятница", en: "Tuesday – Friday", uk: "Вівторок – П'ятниця" }, value: { ru: "11:00 — 20:00", en: "11:00 – 20:00", uk: "11:00 — 20:00" } },
  { day: { ru: "Суббота", en: "Saturday", uk: "Субота" }, value: { ru: "12:00 — 19:00", en: "12:00 – 19:00", uk: "12:00 — 19:00" } },
  { day: { ru: "Воскресенье", en: "Sunday", uk: "Неділя" }, value: { ru: "12:00 — 17:00", en: "12:00 – 17:00", uk: "12:00 — 17:00" } },
];

const shortReceiptSeed = {
  rows: [
    { label: { ru: "ХОЗЯЙКА", en: "SHOPKEEPER", uk: "ГОСПОДИНЯ" }, value: { ru: "Юля Крафт", en: "Yulia Kraft", uk: "Юля Крафт" } },
    { label: { ru: "СТАЖ ЗА ВЕРСТАКОМ", en: "YEARS AT THE BENCH", uk: "СТАЖ ЗА ВЕРСТАКОМ" }, value: { ru: "12 лет", en: "12 years", uk: "12 років" } },
    { label: { ru: "ЛЮБИМАЯ ЭПОХА", en: "FAVOURITE ERA", uk: "УЛЮБЛЕНА ЕПОХА" }, value: { ru: "1972–1981", en: "1972–1981", uk: "1972–1981" } },
    { label: { ru: "ЛЮБИМЫЙ МАТЕРИАЛ", en: "FAVOURITE MATERIAL", uk: "УЛЮБЛЕНИЙ МАТЕРІАЛ" }, value: { ru: "бакелит", en: "bakelite", uk: "бакеліт" } },
    { label: { ru: "НЕЛЮБИМАЯ ФРАЗА", en: "LEAST FAVOURITE PHRASE", uk: "НЕУЛЮБЛЕНА ФРАЗА" }, value: { ru: "«это сейчас не в моде»", en: "\"it's just not in fashion right now\"", uk: "«це зараз не в моді»" } },
    { label: { ru: "ЧАЙ ПОКУПАТЕЛЯМ", en: "TEA FOR SHOPPERS", uk: "ЧАЙ ПОКУПЦЯМ" }, value: { ru: "бесплатно", en: "free of charge", uk: "безкоштовно" } },
    { label: { ru: "РЕМОНТ СТАРИНЫ", en: "VINTAGE REPAIR", uk: "РЕМОНТ СТАРИНИ" }, value: { ru: "от 300 ₴", en: "from 300 ₴", uk: "від 300 ₴" } },
  ],
  thanks: { ru: "*** СПАСИБО ЗА ВИЗИТ. ВОЗВРАЩАЙТЕСЬ ***", en: "*** THANK YOU FOR STOPPING BY. COME BACK AGAIN ***", uk: "*** ДЯКУЮ ЗА ВІЗИТ. ПОВЕРТАЙТЕСЯ ***" },
};

const historyReceiptSeed = {
  rows: [
    { label: { ru: "ХОЗЯЙКА", en: "SHOPKEEPER", uk: "ГОСПОДИНЯ" }, value: { ru: "Юля Крафт", en: "Yulia Kraft", uk: "Юля Крафт" } },
    { label: { ru: "СТАЖ ЗА ВЕРСТАКОМ", en: "YEARS AT THE BENCH", uk: "СТАЖ ЗА ВЕРСТАКОМ" }, value: { ru: "12 лет", en: "12 years", uk: "12 років" } },
    { label: { ru: "ПЕРВОЕ ИЗДЕЛИЕ", en: "FIRST PIECE", uk: "ПЕРШИЙ ВИРІБ" }, value: { ru: "бусы из бабушкиного стекляруса", en: "beads from grandma's glass beads", uk: "буси з бабусиного склярусу" } },
    { label: { ru: "ЛЮБИМАЯ ЭПОХА", en: "FAVOURITE ERA", uk: "УЛЮБЛЕНА ЕПОХА" }, value: { ru: "1972–1981", en: "1972–1981", uk: "1972–1981" } },
    { label: { ru: "ЛЮБИМЫЙ МАТЕРИАЛ", en: "FAVOURITE MATERIAL", uk: "УЛЮБЛЕНИЙ МАТЕРІАЛ" }, value: { ru: "бакелит", en: "bakelite", uk: "бакеліт" } },
    { label: { ru: "ЛЮБИМЫЙ ИНСТРУМЕНТ", en: "FAVOURITE TOOL", uk: "УЛЮБЛЕНИЙ ІНСТРУМЕНТ" }, value: { ru: "паяльник «Чародейка»", en: "soldering iron \"The Enchantress\"", uk: "паяльник \"Чарівниця\"" } },
    { label: { ru: "НЕЛЮБИМАЯ ФРАЗА", en: "LEAST FAVOURITE PHRASE", uk: "НЕУЛЮБЛЕНА ФРАЗА" }, value: { ru: "«это сейчас не в моде»", en: "\"it's just not in fashion right now\"", uk: "«це зараз не в моді»" } },
    { label: { ru: "РЕМОНТ СТАРИНЫ", en: "VINTAGE REPAIR", uk: "РЕМОНТ СТАРИНИ" }, value: { ru: "от 300 ₴", en: "from 300 ₴", uk: "від 300 ₴" } },
    { label: { ru: "СБОРКА НА ЗАКАЗ", en: "MADE-TO-ORDER", uk: "ЗБІРКА НА ЗАМОВЛЕННІ" }, value: { ru: "от 800 ₴ + материалы", en: "from 800 ₴ + materials", uk: "від 800 ₴ + матеріали" } },
    { label: { ru: "СРОК ОБЫЧНОЙ РАБОТЫ", en: "NORMAL TURNAROUND", uk: "ТЕРМІН ЗВИЧАЙНОЇ РОБОТИ" }, value: { ru: "3–7 дней", en: "3–7 days", uk: "3–7 днів" } },
    { label: { ru: "ГАРАНТИЯ", en: "GUARANTEE", uk: "ГАРАНТІЯ" }, value: { ru: "пожизненный ремонт своих работ", en: "lifetime repair of our own work", uk: "пожиттєвий ремонт своїх робіт" } },
    { label: { ru: "ЧАЙ ПОКУПАТЕЛЯМ", en: "TEA FOR SHOPPERS", uk: "ЧАЙ ПОКУПЦЯМ" }, value: { ru: "бесплатно", en: "free of charge", uk: "безкоштовно" } },
    { label: { ru: "СДАЧА", en: "CHANGE", uk: "ЗДАЧА" }, value: { ru: "улыбка", en: "a smile", uk: "посмішка" } },
  ],
  thanks: { ru: "*** СПАСИБО ЗА ВНИМАНИЕ. ВОЗВРАЩАЙТЕСЬ С ИСТОРИЯМИ ***", en: "*** THANK YOU FOR YOUR TIME. COME BACK WITH STORIES ***", uk: "*** ДЯКУЮ ЗА УВАГУ. ПОВЕРТАЙТЕСЯ З ІСТОРІЯМИ ***" },
};

const principlesSeed = [
  { title: { ru: "Один экземпляр", en: "One of a kind", uk: "Один примірник" }, text: { ru: "каждая вещь делается один раз — повторить невозможно, даже если очень просят", en: "each piece is made once — it can't be repeated, no matter how much you ask", uk: "кожна річ робиться один раз — повторити неможливо, навіть якщо дуже просять" } },
  { title: { ru: "Без спешки", en: "No rushing", uk: "Без поспішку" }, text: { ru: "срок в заявке честный, а не «как получится» — лучше подождать и получить как надо", en: "the deadline in your order is honest, not \"whenever it happens\" — better to wait and get it right", uk: "термін у заявці чесний, а не \"як вийде\" — краще зачекати і отримати, як треба" } },
  { title: { ru: "Вторая жизнь", en: "Second life", uk: "Друге життя" }, text: { ru: "ремонт старины дешевле новой вещи — и честно интереснее", en: "repairing old things is cheaper than a new item — and honestly more interesting", uk: "ремонт старини дешевший за нову річ — і чесно цікавіше" } },
  { title: { ru: "Чай и радио", en: "Tea and radio", uk: "Чай і радіо" }, text: { ru: "гость с историей — лучший посетитель. Приходите просто так", en: "a guest with a story is the best visitor. Come on by", uk: "гість з історією — найкращий відвідувач. Приходьте просто так" } },
];

const settingsSeed: Record<string, string> = {
  "contacts.phone": "+38 095 358 48 11",
  "contacts.email": "julcraft79@gmail.com",
  "contacts.address": JSON.stringify({ ru: "ул. Мстислава Скрипника, 40А", en: "40A Mstislava Skrypnyka St.", uk: "вул. Мстислава Скрипника, 40А" }),
  "contacts.telegram": "https://t.me/julcraft_76",
  "contacts.instagram": "https://instagram.com/julcraft_76",
  "contacts.hours": JSON.stringify(hoursSeed),
  "about.short": JSON.stringify(shortReceiptSeed),
  "about.history": JSON.stringify(historyReceiptSeed),
  "about.principles": JSON.stringify(principlesSeed),
  // plan-finances.md: мультивалютность. USD обязателен, курс 1; дефолт — гривна.
  // RUB исключён (решение 2026-09): все цены хранятся в гривнах (UAH), рубли не используются.
  "finance.currencies": JSON.stringify([
    { code: "USD", name: { ru: "Доллар" }, symbol: "$", ratePerUsd: 1 },
    { code: "UAH", name: { ru: "Гривна" }, symbol: "₴", ratePerUsd: 44 },
    { code: "EUR", name: { ru: "Евро" }, symbol: "€", ratePerUsd: 0.92 },
  ]),
  "finance.defaultCurrency": "UAH",
  // Границы фильтра цены каталога как Priced в гривнах (D-23b): «до 2 000 ₴ / от 2 500 ₴»
  "finance.filterLow": String(amountToMinor(2000)),
  "finance.filterLowCurrency": "UAH",
  "finance.filterHigh": String(amountToMinor(2500)),
  "finance.filterHighCurrency": "UAH",
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
  db.delete(componentTypes).run();
  db.delete(settings).run();

  // сброс счётчиков AUTOINCREMENT (иначе id «плывут» после пересидов — см. stage1_3review.md §4.4).
  // Таблица sqlite_sequence создаётся SQLite сама; проверка существования — защита на всякий случай.
  const seqTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
    .get();
  if (seqTable) sqlite.exec("DELETE FROM sqlite_sequence");

  // 1. Категории
  const categoryIds = new Map<string, number>();
  categorySeed.forEach((c, i) => {
    const res = db
      .insert(categories)
      .values({
        name: JSON.stringify(c.name),
        slug: c.slug,
        description: JSON.stringify(c.description),
        image: null,
        workPrice: amountToMinor(c.workPrice),
        workPriceCurrency: "UAH",
        baseWorkDays: c.baseWorkDays,
        hasSlotTemplate: c.slug !== "vintazhnyj-remont",
        isActive: true,
        sortOrder: i + 1,
      })
      .run();
    categoryIds.set(c.slug, Number(res.lastInsertRowid));
  });

  // 1.1. Типы комплектующих (план componentsExt)
  componentTypeSeed.forEach((t) => {
    db.insert(componentTypes)
      .values({ code: t.code, name: JSON.stringify(t.name), sortOrder: t.sortOrder })
      .run();
  });

  // 2. Шаблоны слотов
  let slotCount = 0;
  for (const [slug, slots] of Object.entries(slotSeed)) {
    slots.forEach((s, i) => {
      db.insert(slotTemplates)
        .values({
          categoryId: categoryIds.get(slug)!,
          name: JSON.stringify(s.name),
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
        name: JSON.stringify(c.name),
        componentType: c.componentType,
        price: amountToMinor(c.price),
        priceCurrency: "UAH",
        processingPrice: amountToMinor(c.processingPrice),
        processingPriceCurrency: "UAH",
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
        name: JSON.stringify(p.name),
        slug: p.slug,
        description: JSON.stringify(p.description),
        price: amountToMinor(p.price),
        priceCurrency: "UAH",
        images: [`/uploads/products/${p.photoFile}`],
        materials: p.materials ?? [],
        specs: p.specs ?? [],
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
      `${componentTypeSeed.length} типов, ` +
      `${componentSeed.length} комплектующих (SVG в public/uploads/components/), ` +
      `${productSeed.length} товаров, ${Object.keys(settingsSeed).length} ключей settings`,
  );
}

main();
sqlite.close();

