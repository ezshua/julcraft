"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/settings";
import {
  amountToMinor,
  minorToAmount,
  convertPriced,
  asPriced,
  type Currency,
} from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import TelegramTestButton from "./TelegramTestButton";

type Row = { label: string; value: string };
type Principle = { title: string; text: string };

const HOUR_DAYS = ["Понедельник", "Вторник — Пятница", "Суббота", "Воскресенье"];

function closedFrom(value: string): boolean {
  return value.trim() === "" || /выходн/i.test(value);
}

// Табы «Контакты / Тексты / Telegram / Финансы» + четыре формы.
export default function SettingsPanel({
  settings,
  currencyCode,
}: {
  settings: SiteSettings;
  currencyCode: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const { currency, finance } = useCurrency(settings.finance, currencyCode);

  // Контакты
  const [phone, setPhone] = useState(settings.contacts.phone);
  const [email, setEmail] = useState(settings.contacts.email);
  const [address, setAddress] = useState(settings.contacts.address);
  const [tgram, setTgram] = useState(settings.contacts.telegram);
  const [instagram, setInstagram] = useState(settings.contacts.instagram);
  const [hours, setHours] = useState<string[]>(
    HOUR_DAYS.map((_, i) => settings.contacts.hours[i]?.value ?? ""),
  );

  // Тексты
  const [shortRows, setShortRows] = useState<Row[]>(settings.about.short.rows);
  const [shortThanks, setShortThanks] = useState(settings.about.short.thanks);
  const [historyRows, setHistoryRows] = useState<Row[]>(settings.about.history.rows);
  const [historyThanks, setHistoryThanks] = useState(settings.about.history.thanks);
  const [principles, setPrinciples] = useState<Principle[]>(
    settings.about.principles.length > 0
      ? settings.about.principles
      : [{ title: "", text: "" }],
  );

  // Telegram
  const [botToken, setBotToken] = useState(settings.telegram.botToken);
  const [chatId, setChatId] = useState(settings.telegram.chatId);

  // Финансы
  const [currencies, setCurrencies] = useState<Currency[]>(settings.finance.currencies);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.finance.defaultCurrency);
  // Границы фильтра хранятся как Priced в текущей валюте «Вид» (D-23b): показываем
  // сумму в валюте отображения, при сохранении пишем миноры + код валюты.
  const filterLowMinor = () =>
    convertPriced(
      asPriced(settings.finance.filterLow, settings.finance.filterLowCurrency),
      currency,
      finance,
    ).priceMinor;
  const filterHighMinor = () =>
    convertPriced(
      asPriced(settings.finance.filterHigh, settings.finance.filterHighCurrency),
      currency,
      finance,
    ).priceMinor;
  const [filterLowDisp, setFilterLowDisp] = useState(
    String(minorToAmount(filterLowMinor())),
  );
  const [filterHighDisp, setFilterHighDisp] = useState(
    String(minorToAmount(filterHighMinor())),
  );
  // При смене валюты отображения переводим границы фильтра заново (из нативной валюты)
  const [lastCurrencyCode, setLastCurrencyCode] = useState(currency.code);
  if (currency.code !== lastCurrencyCode) {
    setLastCurrencyCode(currency.code);
    setFilterLowDisp(String(minorToAmount(filterLowMinor())));
    setFilterHighDisp(String(minorToAmount(filterHighMinor())));
  }

  const patchCurrency = (i: number, patch: Partial<Currency>) =>
    setCurrencies((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  // Удаление валюты (D-27): предупреждаем о затронутых ценах и небыстрой
  // конверсии в USD. Сама конверсия выполняется на сервере при сохранении
  // (route api/admin/settings обнаружит удалённый код и пересчитает цены).
  const removeCurrency = async (i: number) => {
    const target = currencies[i];
    if (!target || target.code === "USD") return;
    let count = 0;
    try {
      const res = await fetch(`/api/admin/finance/usage?code=${target.code}`);
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        count = data.count;
      }
    } catch {
      // игнорируем — покажем общее предупреждение
    }
    const warn =
      count > 0
        ? `Валюта ${target.code} используется в ${count} ценах. При удалении они будут пересчитаны в доллары (USD). Это может занять некоторое время. Удалить валюту?`
        : `Удалить валюту ${target.code}? Цены в ней (если есть) будут пересчитаны в доллары (USD).`;
    if (!window.confirm(warn)) return;
    setCurrencies((prev) => prev.filter((_, j) => j !== i));
  };

  const addCurrency = () =>
    setCurrencies((prev) => [
      ...prev,
      { code: "", name: "", symbol: "", ratePerUsd: 1 },
    ]);

  const saveFinance = () =>
    void save([
      { key: "finance.currencies", value: JSON.stringify(currencies) },
      { key: "finance.defaultCurrency", value: defaultCurrency },
      {
        key: "finance.filterLow",
        value: String(amountToMinor(Number(filterLowDisp) || 0)),
      },
      { key: "finance.filterLowCurrency", value: currency.code },
      {
        key: "finance.filterHigh",
        value: String(amountToMinor(Number(filterHighDisp) || 0)),
      },
      { key: "finance.filterHighCurrency", value: currency.code },
    ]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (items: { key: string; value: string }[]) => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const text = await res.text();
      if (!res.ok) {
        setMsg(text || "Не получилось сохранить");
        setBusy(false);
        return;
      }
      router.refresh();
      setMsg("Сохранено");
      setBusy(false);
    } catch {
      setMsg("Не получилось сохранить");
      setBusy(false);
    }
  };

  const saveContacts = () =>
    save([
      { key: "contacts.phone", value: phone },
      { key: "contacts.email", value: email },
      { key: "contacts.address", value: address },
      { key: "contacts.telegram", value: tgram },
      { key: "contacts.instagram", value: instagram },
      {
        key: "contacts.hours",
        value: JSON.stringify(
          HOUR_DAYS.map((day, i) => ({
            day,
            value: hours[i] ?? "",
            closed: closedFrom(hours[i] ?? ""),
          })),
        ),
      },
    ]);

  const saveTexts = () =>
    save([
      {
        key: "about.short",
        value: JSON.stringify({ rows: shortRows, thanks: shortThanks }),
      },
      {
        key: "about.history",
        value: JSON.stringify({ rows: historyRows, thanks: historyThanks }),
      },
      { key: "about.principles", value: JSON.stringify(principles) },
    ]);

  const saveTelegram = () =>
    save([
      { key: "telegram.botToken", value: botToken },
      { key: "telegram.chatId", value: chatId },
    ]);

  // «Обновить из настроек»: подгружает botToken/chatId из .env в поля формы.
  // Далее пользователь либо сохраняет считанное в БД, либо правит вручную.
  const [envBusy, setEnvBusy] = useState(false);
  const loadTelegramFromEnv = async () => {
    if (envBusy) return;
    setEnvBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings/telegram-env", {
        method: "GET",
      });
      if (!res.ok) {
        setMsg("Не получилось прочитать значения из .env");
        setEnvBusy(false);
        return;
      }
      const data = (await res.json()) as { botToken: string; chatId: string };
      setBotToken(data.botToken);
      setChatId(data.chatId);
      setMsg("Поля заполнены из .env — сохраните, чтобы применить");
    } catch {
      setMsg("Не получилось прочитать значения из .env");
    }
    setEnvBusy(false);
  };

  const patchRow = (
    list: Row[],
    set: (r: Row[]) => void,
    i: number,
    patch: Partial<Row>,
  ) => set(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="tabs">
        <span className={tab === 0 ? "tab is-active" : "tab"} onClick={() => setTab(0)}>
          Контакты
        </span>
        <span className={tab === 1 ? "tab is-active" : "tab"} onClick={() => setTab(1)}>
          Тексты
        </span>
        <span className={tab === 2 ? "tab is-active" : "tab"} onClick={() => setTab(2)}>
          Telegram
        </span>
        <span className={tab === 3 ? "tab is-active" : "tab"} onClick={() => setTab(3)}>
          Финансы
        </span>
      </div>

      {/* Таб: Контакты */}
      <div className="tab-pane" style={{ display: tab === 0 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            Контакты (Settings.contacts.*)
          </h3>
          <div className="field--row">
            <div className="field">
              <label>Телефон</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Адрес мастерской</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field--row">
            <div className="field">
              <label>Telegram</label>
              <input type="text" value={tgram} onChange={(e) => setTgram(e.target.value)} />
            </div>
            <div className="field">
              <label>Instagram</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <label>Часы: {HOUR_DAYS[0]}</label>
              <input
                type="text"
                value={hours[0] ?? ""}
                onChange={(e) =>
                  setHours(hours.map((h, i) => (i === 0 ? e.target.value : h)))
                }
              />
            </div>
            <div className="field">
              <label>Часы: {HOUR_DAYS[1]}</label>
              <input
                type="text"
                value={hours[1] ?? ""}
                onChange={(e) =>
                  setHours(hours.map((h, i) => (i === 1 ? e.target.value : h)))
                }
              />
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <label>Часы: {HOUR_DAYS[2]}</label>
              <input
                type="text"
                value={hours[2] ?? ""}
                onChange={(e) =>
                  setHours(hours.map((h, i) => (i === 2 ? e.target.value : h)))
                }
              />
            </div>
            <div className="field">
              <label>Часы: {HOUR_DAYS[3]}</label>
              <input
                type="text"
                value={hours[3] ?? ""}
                onChange={(e) =>
                  setHours(hours.map((h, i) => (i === 3 ? e.target.value : h)))
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveContacts()} disabled={busy}>
              Сохранить контакты
            </button>
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Таб: Тексты */}
      <div className="tab-pane" style={{ display: tab === 1 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            Тексты (Settings.about.*)
          </h3>

          <div className="field">
            <label>О мастерской — короткий текст (главная, чек-тизер)</label>
            {shortRows.map((r, i) => (
              <div className="field--row" key={i} style={{ marginBottom: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Метка"
                    value={r.label}
                    onChange={(e) => patchRow(shortRows, setShortRows, i, { label: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Значение"
                    value={r.value}
                    onChange={(e) => patchRow(shortRows, setShortRows, i, { value: e.target.value })}
                  />
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 20, height: 20, alignSelf: "center" }}
                  title="Удалить строку"
                  onClick={() => setShortRows(shortRows.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: "4px" }}>
              <button
                className="btn btn--secondary btn--small"
                onClick={() => setShortRows([...shortRows, { label: "", value: "" }])}
              >
                + Добавить строку
              </button>
            </div>
            <div className="field" style={{ marginTop: "10px", marginBottom: 0 }}>
              <label>Подпись (thanks)</label>
              <input
                type="text"
                value={shortThanks}
                onChange={(e) => setShortThanks(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>История (страница «О мастерской»)</label>
            {historyRows.map((r, i) => (
              <div className="field--row" key={i} style={{ marginBottom: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Метка"
                    value={r.label}
                    onChange={(e) => patchRow(historyRows, setHistoryRows, i, { label: e.target.value })}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Значение"
                    value={r.value}
                    onChange={(e) => patchRow(historyRows, setHistoryRows, i, { value: e.target.value })}
                  />
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 20, height: 20, alignSelf: "center" }}
                  title="Удалить строку"
                  onClick={() => setHistoryRows(historyRows.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: "4px" }}>
              <button
                className="btn btn--secondary btn--small"
                onClick={() => setHistoryRows([...historyRows, { label: "", value: "" }])}
              >
                + Добавить строку
              </button>
            </div>
            <div className="field" style={{ marginTop: "10px", marginBottom: 0 }}>
              <label>Подпись (thanks)</label>
              <input
                type="text"
                value={historyThanks}
                onChange={(e) => setHistoryThanks(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Принципы (4 карточки)</label>
            {principles.map((p, i) => (
              <div className="field--row" key={i} style={{ marginBottom: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Заголовок"
                    value={p.title}
                    onChange={(e) =>
                      setPrinciples(principles.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Текст"
                    value={p.text}
                    onChange={(e) =>
                      setPrinciples(principles.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                    }
                  />
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 20, height: 20, alignSelf: "center" }}
                  title="Удалить карточку"
                  onClick={() => setPrinciples(principles.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: "4px" }}>
              <button
                className="btn btn--secondary btn--small"
                onClick={() => setPrinciples([...principles, { title: "", text: "" }])}
              >
                + Добавить карточку
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveTexts()} disabled={busy}>
              Сохранить тексты
            </button>
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Таб: Telegram */}
      <div className="tab-pane" style={{ display: tab === 2 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            Telegram-уведомления (Settings.telegram.*)
          </h3>
          <div className="field">
            <label>Bot token</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Chat ID мастера</label>
            <input type="text" value={chatId} onChange={(e) => setChatId(e.target.value)} />
          </div>
          <div className="notice notice--olive" style={{ marginBottom: "18px" }}>
            Сервер шлёт мастеру заявку с коллажем и деталями. Email — запасной канал.
            {botToken.trim().includes(":") && (
              <>
                {" "}
                Чтобы получать уведомления, первым напишите боту (идентификатор бота:{" "}
                <b>{botToken.trim().slice(0, botToken.trim().indexOf(":"))}</b>) — отправьте <code>/start</code>.
              </>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveTelegram()} disabled={busy}>
              Сохранить
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => void loadTelegramFromEnv()}
              disabled={envBusy}
              title="Подгрузить botToken/chatId из .env в поля формы"
            >
              Обновить из настроек
            </button>
            <TelegramTestButton botToken={botToken} chatId={chatId} />
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Таб: Финансы */}
      <div className="tab-pane" style={{ display: tab === 3 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            Финансы (Settings.finance.*)
          </h3>
          <div className="notice notice--olive" style={{ marginBottom: "18px" }}>
            Каждая цена хранится в валюте, в которой она задана (и символ валюты).
            При удалении валюты все цены в ней пересчитываются в доллары (USD) — это может занять время.
            USD обязателен: удалить его нельзя, курс всегда 1.
          </div>

          <div className="field">
            <label>Валюта отображения по умолчанию</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field--row">
            <div className="field">
              <label>Фильтр каталога: «до» (в {currency.symbol})</label>
              <input
                type="number"
                step="0.01"
                value={filterLowDisp}
                onChange={(e) => setFilterLowDisp(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Фильтр каталога: «от» (в {currency.symbol})</label>
              <input
                type="number"
                step="0.01"
                value={filterHighDisp}
                onChange={(e) => setFilterHighDisp(e.target.value)}
              />
            </div>
          </div>
          <small className="muted">
            Границы фильтра цены на странице категории (по умолчанию: до 1 000 ₴ / от 2 500 ₴).
          </small>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "20px 0 10px",
            }}
          >
            <h3 className="sec-h2" style={{ fontSize: "1.1rem", margin: 0 }}>
              Список валют
            </h3>
            <button className="btn btn--secondary btn--small" onClick={addCurrency}>
              + Добавить валюту
            </button>
          </div>
          {currencies.map((c, i) => (
            <div
              className="field--row"
              key={`${c.code}-${i}`}
              style={{ marginBottom: "8px", alignItems: "flex-end" }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label>Код</label>
                <input
                  type="text"
                  value={c.code}
                  disabled={c.code === "USD"}
                  maxLength={3}
                  onChange={(e) => patchCurrency(i, { code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Название</label>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => patchCurrency(i, { name: e.target.value })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Символ</label>
                <input
                  type="text"
                  value={c.symbol}
                  style={{ maxWidth: 70 }}
                  onChange={(e) => patchCurrency(i, { symbol: e.target.value })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>За 1 $</label>
                <input
                  type="number"
                  step="any"
                  value={c.ratePerUsd}
                  disabled={c.code === "USD"}
                  onChange={(e) => patchCurrency(i, { ratePerUsd: Number(e.target.value) })}
                />
              </div>
              <button
                className="icon-btn"
                style={{ width: 24, height: 24, alignSelf: "center" }}
                title={c.code === "USD" ? "USD удалить нельзя" : "Удалить валюту"}
                disabled={c.code === "USD"}
                onClick={() => removeCurrency(i)}
              >
                ✕
              </button>
            </div>
          ))}

          <div className="form-actions" style={{ marginTop: "48px" }}>
            <button className="btn btn--primary" onClick={saveFinance} disabled={busy}>
              Сохранить финансы
            </button>
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>
    </>
  );
}