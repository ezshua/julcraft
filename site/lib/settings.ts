import { defaultFinance, type FinanceSettings } from "./currency";
import type { LocalizedString } from "./localize";

export type HoursEntry = {
  day: LocalizedString;
  value: LocalizedString;
  closed?: boolean;
};

export type LocalizedRow = {
  label: LocalizedString;
  value: LocalizedString;
};

export type Receipt = {
  rows: LocalizedRow[];
  thanks: LocalizedString;
};

export type Principle = {
  title: LocalizedString;
  text: LocalizedString;
};

export type SiteSettings = {
  contacts: {
    phone: string;
    email: string;
    address: LocalizedString;
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
  finance: FinanceSettings;
};

export const defaultSettings: SiteSettings = {
  contacts: {
    phone: "+38 095 358 48 11",
    email: "julcraft79@gmail.com",
    address: { ru: "ул. Мстислава Скрипника, 40А" },
    telegram: "https://t.me/julcraft_79",
    instagram: "https://instagram.com/julcraft_79",
    hours: [
      { day: { ru: "Понедельник" }, value: { ru: "выходной" }, closed: true },
      { day: { ru: "Вторник — Пятница" }, value: { ru: "11:00 — 20:00" } },
      { day: { ru: "Суббота" }, value: { ru: "12:00 — 19:00" } },
      { day: { ru: "Воскресенье" }, value: { ru: "12:00 — 17:00" } },
    ],
  },
  about: {
    short: {
      rows: [
        { label: { ru: "ХОЗЯЙКА" }, value: { ru: "Юля Крафт" } },
        { label: { ru: "СТАЖ ЗА ВЕРСТАКОМ" }, value: { ru: "12 лет" } },
        { label: { ru: "ЛЮБИМАЯ ЭПОХА" }, value: { ru: "1972–1981" } },
        { label: { ru: "ЛЮБИМЫЙ МАТЕРИАЛ" }, value: { ru: "бакелит" } },
        { label: { ru: "НЕЛЮБИМАЯ ФРАЗА" }, value: { ru: "«это сейчас не в моде»" } },
        { label: { ru: "ЧАЙ ПОКУПАТЕЛЯМ" }, value: { ru: "бесплатно" } },
        { label: { ru: "РЕМОНТ СТАРИНЫ" }, value: { ru: "от 300 ₴" } },
      ],
      thanks: { ru: "*** СПАСИБО ЗА ВИЗИТ. ВОЗВРАЩАЙТЕСЬ ***" },
    },
    history: {
      rows: [
        { label: { ru: "ХОЗЯЙКА" }, value: { ru: "Юля Крафт" } },
        { label: { ru: "СТАЖ ЗА ВЕРСТАКОМ" }, value: { ru: "12 лет" } },
        { label: { ru: "ПЕРВОЕ ИЗДЕЛИЕ" }, value: { ru: "бусы из бабушкиного стекляруса" } },
        { label: { ru: "ЛЮБИМАЯ ЭПОХА" }, value: { ru: "1972–1981" } },
        { label: { ru: "ЛЮБИМЫЙ МАТЕРИАЛ" }, value: { ru: "бакелит" } },
        { label: { ru: "ЛЮБИМЫЙ ИНСТРУМЕНТ" }, value: { ru: "паяльник «Чародейка»" } },
        { label: { ru: "НЕЛЮБИМАЯ ФРАЗА" }, value: { ru: "«это сейчас не в моде»" } },
        { label: { ru: "РЕМОНТ СТАРИНЫ" }, value: { ru: "от 300 ₴" } },
        { label: { ru: "СБОРКА НА ЗАКАЗ" }, value: { ru: "от 800 ₴ + материалы" } },
        { label: { ru: "СРОК ОБЫЧНОЙ РАБОТЫ" }, value: { ru: "3–7 дней" } },
        { label: { ru: "ГАРАНТИЯ" }, value: { ru: "пожизненный ремонт своих работ" } },
        { label: { ru: "ЧАЙ ПОКУПАТЕЛЯМ" }, value: { ru: "бесплатно" } },
        { label: { ru: "СДАЧА" }, value: { ru: "улыбка" } },
      ],
      thanks: { ru: "*** СПАСИБО ЗА ВНИМАНИЕ. ВОЗВРАЩАЙТЕСЬ С ИСТОРИЯМИ ***" },
    },
    principles: [
      {
        title: { ru: "Один экземпляр" },
        text: { ru: "каждая вещь делается один раз — повторить невозможно, даже если очень просят" },
      },
      {
        title: { ru: "Без спешки" },
        text: { ru: "срок в заявке честный, а не «как получится» — лучше подождать и получить как надо" },
      },
      {
        title: { ru: "Вторая жизнь" },
        text: { ru: "ремонт старины дешевле новой вещи — и честно интереснее" },
      },
      {
        title: { ru: "Чай и радио" },
        text: { ru: "гость с историей — лучший посетитель. Приходите просто так" },
      },
    ],
  },
  telegram: {
    botToken: "",
    chatId: "",
  },
  finance: defaultFinance,
};

export function telHref(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}
