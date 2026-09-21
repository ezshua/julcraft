"use client";

import { useState } from "react";
import { useAdminDict } from "./admin-dict-context";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries/ru";
import type { SiteSettings } from "@/lib/settings";
import { firstLocale, toLS } from "@/lib/localize";
import LocalizedField, { type LocalizedValue } from "./LocalizedField";
import {
  amountToMinor,
  minorToAmount,
  convertPriced,
  asPriced,
  type Currency,
} from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import TelegramTestButton from "./TelegramTestButton";

type Row = { label: LocalizedValue; value: LocalizedValue };
type Principle = { title: LocalizedValue; text: LocalizedValue };

function closedFrom(value: string, hint: string): boolean {
  return value.trim() === "" || new RegExp(hint, "i").test(value);
}

// Табы «Контакты / Тексты / Telegram / Финансы» + четыре формы.
export default function SettingsPanel({
  settings,
  currencyCode,
  dict,
}: {
  settings: SiteSettings;
  currencyCode: string;
  dict: { settings: Dictionary["admin"]["settings"] };
}) {
  const d = dict.settings;
  const router = useRouter();
  const HOUR_DAYS = d.hourDays;
  const [tab, setTab] = useState(0);
  const { currency, finance } = useCurrency(settings.finance, currencyCode);

  // Контакты
  const [phone, setPhone] = useState(settings.contacts.phone);
  const [email, setEmail] = useState(settings.contacts.email);
  const [address, setAddress] = useState<LocalizedValue>(toLS(settings.contacts.address));
  const [tgram, setTgram] = useState(settings.contacts.telegram);
  const [instagram, setInstagram] = useState(settings.contacts.instagram);
  const [hours, setHours] = useState<LocalizedValue[]>(
    HOUR_DAYS.map((_: string, i: number) => toLS(settings.contacts.hours[i]?.value ?? "")),
  );

  // Тексты
  const [shortRows, setShortRows] = useState<Row[]>(
    settings.about.short.rows.map((r) => ({ label: toLS(r.label), value: toLS(r.value) })),
  );
  const [shortThanks, setShortThanks] = useState<LocalizedValue>(toLS(settings.about.short.thanks));
  const [historyRows, setHistoryRows] = useState<Row[]>(
    settings.about.history.rows.map((r) => ({ label: toLS(r.label), value: toLS(r.value) })),
  );
  const [historyThanks, setHistoryThanks] = useState<LocalizedValue>(toLS(settings.about.history.thanks));
  const [principles, setPrinciples] = useState<Principle[]>(
    settings.about.principles.length > 0
      ? settings.about.principles.map((p) => ({ title: toLS(p.title), text: toLS(p.text) }))
      : [{ title: { ru: "", en: "", uk: "" }, text: { ru: "", en: "", uk: "" } }],
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
        ? d.removeCurrencyWarnUsed.replace("{code}", target.code).replace("{count}", String(count))
        : d.removeCurrencyWarn.replace("{code}", target.code);
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
        setMsg(text || d.saveFailed);
        setBusy(false);
        return;
      }
      router.refresh();
      setMsg(d.saved);
      setBusy(false);
    } catch {
      setMsg(d.saveFailed);
      setBusy(false);
    }
  };

  const saveContacts = () =>
    save([
      { key: "contacts.phone", value: phone },
      { key: "contacts.email", value: email },
      { key: "contacts.address", value: JSON.stringify(address) },
      { key: "contacts.telegram", value: tgram },
      { key: "contacts.instagram", value: instagram },
      {
        key: "contacts.hours",
        value: JSON.stringify(
          HOUR_DAYS.map((day: string, i: number) => ({
            day: { ru: day },
            value: hours[i] ?? { ru: "", en: "", uk: "" },
            closed: closedFrom(hours[i]?.ru ?? "", d.closedFromHint),
          })),
        ),
      },
    ]);

  const saveTexts = () =>
    save([
      {
        key: "about.short",
        value: JSON.stringify({
          rows: shortRows.map((r) => ({ label: r.label, value: r.value })),
          thanks: shortThanks,
        }),
      },
      {
        key: "about.history",
        value: JSON.stringify({
          rows: historyRows.map((r) => ({ label: r.label, value: r.value })),
          thanks: historyThanks,
        }),
      },
      {
        key: "about.principles",
        value: JSON.stringify(
          principles.map((p) => ({ title: p.title, text: p.text })),
        ),
      },
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
        setMsg(d.envError);
        setEnvBusy(false);
        return;
      }
      const data = (await res.json()) as { botToken: string; chatId: string };
      setBotToken(data.botToken);
      setChatId(data.chatId);
      setMsg(d.envBusy);
    } catch {
      setMsg(d.envError);
    }
    setEnvBusy(false);
  };

  const patchRow = (
    list: Row[],
    set: (r: Row[]) => void,
    i: number,
    patch: Partial<Row>,
  ): void => set(list.map((r: Row, j: number) => (j === i ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="tabs">
        <span className={tab === 0 ? "tab is-active" : "tab"} onClick={() => setTab(0)}>
          {d.tabContacts}
        </span>
        <span className={tab === 1 ? "tab is-active" : "tab"} onClick={() => setTab(1)}>
          {d.tabTexts}
        </span>
        <span className={tab === 2 ? "tab is-active" : "tab"} onClick={() => setTab(2)}>
          {d.tabTelegram}
        </span>
        <span className={tab === 3 ? "tab is-active" : "tab"} onClick={() => setTab(3)}>
          {d.tabFinance}
        </span>
      </div>

      {/* Таб: Контакты */}
      <div className="tab-pane" style={{ display: tab === 0 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            {d.boardContacts}
          </h3>
          <div className="field--row">
            <div className="field">
              <label>{d.labelPhone}</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>{d.labelEmail}</label>
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <LocalizedField
              value={address}
              onChange={setAddress}
              label={d.labelAddress}
            />
          </div>
          <div className="field--row">
            <div className="field">
              <label>{d.labelTelegram}</label>
              <input type="text" value={tgram} onChange={(e) => setTgram(e.target.value)} />
            </div>
            <div className="field">
              <label>{d.labelInstagram}</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <LocalizedField
                value={hours[0] ?? { ru: "", en: "", uk: "" }}
                onChange={(v) => setHours(hours.map((h, i) => (i === 0 ? v : h)))}
                label={d.labelHours.replace("{day}", d.hourDays[0])}
              />
            </div>
            <div className="field">
              <LocalizedField
                value={hours[1] ?? { ru: "", en: "", uk: "" }}
                onChange={(v) => setHours(hours.map((h, i) => (i === 1 ? v : h)))}
                label={d.labelHours.replace("{day}", d.hourDays[1])}
              />
            </div>
          </div>
          <div className="field--row">
            <div className="field">
              <LocalizedField
                value={hours[2] ?? { ru: "", en: "", uk: "" }}
                onChange={(v) => setHours(hours.map((h, i) => (i === 2 ? v : h)))}
                label={d.labelHours.replace("{day}", d.hourDays[2])}
              />
            </div>
            <div className="field">
              <LocalizedField
                value={hours[3] ?? { ru: "", en: "", uk: "" }}
                onChange={(v) => setHours(hours.map((h, i) => (i === 3 ? v : h)))}
                label={d.labelHours.replace("{day}", d.hourDays[3])}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveContacts()} disabled={busy}>
              {d.saveContacts}
            </button>
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Таб: Тексты */}
      <div className="tab-pane" style={{ display: tab === 1 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            {d.boardTexts}
          </h3>

          <div className="field">
            <label>{d.labelShortText}</label>
            {shortRows.map((r, i) => (
              <div className="field--row" key={i} style={{ marginBottom: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <LocalizedField
                    compact
                    value={r.label}
                    onChange={(v) => patchRow(shortRows, setShortRows, i, { label: v })}
                    label={d.labelMeta}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <LocalizedField
                    compact
                    value={r.value}
                    onChange={(v) => patchRow(shortRows, setShortRows, i, { value: v })}
                    label={d.labelValue}
                  />
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 20, height: 20, alignSelf: "center" }}
                  title={d.labelDeleteRow}
                  onClick={() => setShortRows(shortRows.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: "4px" }}>
              <button
                className="btn btn--secondary btn--small"
                onClick={() => setShortRows([...shortRows, { label: { ru: "", en: "", uk: "" }, value: { ru: "", en: "", uk: "" } }])}
              >
                {d.labelAddRow}
              </button>
            </div>
            <div className="field" style={{ marginTop: "10px", marginBottom: 0 }}>
              <LocalizedField
                value={shortThanks}
                onChange={setShortThanks}
                label={d.labelShortThanks}
              />
            </div>
          </div>

          <div className="field">
            <label>{d.labelHistory}</label>
            {historyRows.map((r, i) => (
              <div className="field--row" key={i} style={{ marginBottom: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <LocalizedField
                    compact
                    value={r.label}
                    onChange={(v) => patchRow(historyRows, setHistoryRows, i, { label: v })}
                    label={d.labelMeta}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <LocalizedField
                    compact
                    value={r.value}
                    onChange={(v) => patchRow(historyRows, setHistoryRows, i, { value: v })}
                    label={d.labelValue}
                  />
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 20, height: 20, alignSelf: "center" }}
                  title={d.labelDeleteRow}
                  onClick={() => setHistoryRows(historyRows.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: "4px" }}>
              <button
                className="btn btn--secondary btn--small"
                onClick={() => setHistoryRows([...historyRows, { label: { ru: "", en: "", uk: "" }, value: { ru: "", en: "", uk: "" } }])}
              >
                {d.labelAddRow}
              </button>
            </div>
            <div className="field" style={{ marginTop: "10px", marginBottom: 0 }}>
              <LocalizedField
                value={historyThanks}
                onChange={setHistoryThanks}
                label={d.labelShortThanks}
              />
            </div>
          </div>

          <div className="field">
            <label>{d.labelPrinciples}</label>
            {principles.map((p, i) => (
              <div className="field--row" key={i} style={{ marginBottom: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <LocalizedField
                    compact
                    value={p.title}
                    onChange={(v) =>
                      setPrinciples(principles.map((x, j) => (j === i ? { ...x, title: v } : x)))
                    }
                    label={d.labelPrincipleTitle}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <LocalizedField
                    compact
                    value={p.text}
                    onChange={(v) =>
                      setPrinciples(principles.map((x, j) => (j === i ? { ...x, text: v } : x)))
                    }
                    label={d.labelPrincipleText}
                  />
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 20, height: 20, alignSelf: "center" }}
                  title={d.labelDeleteCard}
                  onClick={() => setPrinciples(principles.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: "4px" }}>
              <button
                className="btn btn--secondary btn--small"
                onClick={() => setPrinciples([...principles, { title: { ru: "", en: "", uk: "" }, text: { ru: "", en: "", uk: "" } }])}
              >
                {d.labelAddCard}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveTexts()} disabled={busy}>
              {d.saveTexts}
            </button>
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Таб: Telegram */}
      <div className="tab-pane" style={{ display: tab === 2 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            {d.boardTelegram}
          </h3>
          <div className="field">
            <label>{d.labelBotToken}</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{d.labelChatId}</label>
            <input type="text" value={chatId} onChange={(e) => setChatId(e.target.value)} />
          </div>
          <div className="notice notice--olive" style={{ marginBottom: "18px" }}>
            {d.noticeTelegram}
            {botToken.trim().includes(":") && (
              <>
                {" "}
                {d.noticeEnv.replace("{botId}", botToken.trim().slice(0, botToken.trim().indexOf(":")))}
              </>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveTelegram()} disabled={busy}>
              {d.saveTelegram}
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => void loadTelegramFromEnv()}
              disabled={envBusy}
              title={d.labelRefreshFromEnv}
            >
              {d.refreshFromEnv}
            </button>
            <TelegramTestButton botToken={botToken} chatId={chatId} dict={dict} />
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Таб: Финансы */}
      <div className="tab-pane" style={{ display: tab === 3 ? "" : "none" }}>
        <div className="board board--paper" style={{ padding: "22px 24px" }}>
          <h3 className="sec-h2" style={{ fontSize: "1.1rem", marginBottom: "14px" }}>
            {d.boardFinance}
          </h3>
          <div className="notice notice--olive" style={{ marginBottom: "18px" }}>
            {d.noticeFinance}
          </div>

          <div className="field">
            <label>{d.labelDefaultCurrency}</label>
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
              <label>{d.labelFilterLow.replace("{symbol}", currency.symbol)}</label>
              <input
                type="number"
                step="0.01"
                value={filterLowDisp}
                onChange={(e) => setFilterLowDisp(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{d.labelFilterHigh.replace("{symbol}", currency.symbol)}</label>
              <input
                type="number"
                step="0.01"
                value={filterHighDisp}
                onChange={(e) => setFilterHighDisp(e.target.value)}
              />
            </div>
          </div>
          <small className="muted">{d.noticeFilterHint}</small>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "20px 0 10px",
            }}
          >
            <h3 className="sec-h2" style={{ fontSize: "1.1rem", margin: 0 }}>
              {d.currenciesHeading}
            </h3>
            <button className="btn btn--secondary btn--small" onClick={addCurrency}>
              {d.labelAddCurrency}
            </button>
          </div>
          {currencies.map((c, i) => (
            <div
              className="field--row"
              key={`${c.code}-${i}`}
              style={{ marginBottom: "8px", alignItems: "flex-end" }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label>{d.labelCurrencyCode}</label>
                <input
                  type="text"
                  value={c.code}
                  disabled={c.code === "USD"}
                  maxLength={3}
                  onChange={(e) => patchCurrency(i, { code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>{d.labelCurrencyName}</label>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => patchCurrency(i, { name: e.target.value })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>{d.labelCurrencySymbol}</label>
                <input
                  type="text"
                  value={c.symbol}
                  style={{ maxWidth: 70 }}
                  onChange={(e) => patchCurrency(i, { symbol: e.target.value })}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>{d.labelCurrencyRate}</label>
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
                title={c.code === "USD" ? d.labelCurrencyDisabled : d.labelDeleteCurrency}
                disabled={c.code === "USD"}
                onClick={() => removeCurrency(i)}
              >
                ✕
              </button>
            </div>
          ))}

          <div className="form-actions" style={{ marginTop: "48px" }}>
            <button className="btn btn--primary" onClick={saveFinance} disabled={busy}>
              {d.saveFinance}
            </button>
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>
    </>
  );
}