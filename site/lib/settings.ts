export type HoursEntry = {
  day: string;
  hours: string;
  closed?: boolean;
};

export type DefaultSettings = {
  contacts: {
    phone: string;
    phoneDisplay: string;
    email: string;
    address: string;
    hoursWeekdays: HoursEntry[];
  };
};

export const defaultSettings: DefaultSettings = {
  contacts: {
    phone: "tel:+380953584811",
    phoneDisplay: "+38 (095) 358 48 11",
    email: "julcraft79@gmail.com",
    address: "ул. Мстислава Скрипника, 40А",
    hoursWeekdays: [
      { day: "Понедельник", hours: "выходной", closed: true },
      { day: "Вторник — Пятница", hours: "11:00 — 20:00" },
      { day: "Суббота", hours: "12:00 — 19:00" },
      { day: "Воскресенье", hours: "12:00 — 17:00" },
    ],
  },
};
