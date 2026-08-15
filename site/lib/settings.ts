export type HoursEntry = {
  day: string;
  value: string;
  closed?: boolean;
};

export type ReceiptRow = {
  label: string;
  value: string;
};

export type Receipt = {
  rows: ReceiptRow[];
  thanks: string;
};

export type Principle = {
  title: string;
  text: string;
};

export type SiteSettings = {
  contacts: {
    phone: string;
    email: string;
    address: string;
    telegram: string;
    instagram: string;
    hours: HoursEntry[];
  };
  about: {
    short: Receipt;
    history: Receipt;
    principles: Principle[];
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
};

export const defaultSettings: SiteSettings = {
  contacts: {
    phone: "+38 095 358 48 11",
    email: "julcraft79@gmail.com",
    address: "ул. Мстислава Скрипника, 40А",
    telegram: "https://t.me/julcraft_76",
    instagram: "https://instagram.com/julcraft_76",
    hours: [
      { day: "Понедельник", value: "выходной", closed: true },
      { day: "Вторник — Пятница", value: "11:00 — 20:00" },
      { day: "Суббота", value: "12:00 — 19:00" },
      { day: "Воскресенье", value: "12:00 — 17:00" },
    ],
  },
  about: {
    short: {
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
    },
    history: {
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
    },
    principles: [
      {
        title: "Один экземпляр",
        text: "каждая вещь делается один раз — повторить невозможно, даже если очень просят",
      },
      {
        title: "Без спешки",
        text: "срок в заявке честный, а не «как получится» — лучше подождать и получить как надо",
      },
      {
        title: "Вторая жизнь",
        text: "ремонт старины дешевле новой вещи — и честно интереснее",
      },
      {
        title: "Чай и радио",
        text: "гость с историей — лучший посетитель. Приходите просто так",
      },
    ],
  },
  telegram: {
    botToken: "",
    chatId: "",
  },
};

export function telHref(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}
