"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/settings";
import TelegramTestButton from "./TelegramTestButton";

type Row = { label: string; value: string };
type Principle = { title: string; text: string };

const HOUR_DAYS = ["Понедельник", "Вторник — Пятница", "Суббота", "Воскресенье"];

function closedFrom(value: string): boolean {
  return value.trim() === "" || /выходн/i.test(value);
}

// Табы «Контакты / Тексты / Telegram» + три формы (копия mockup/admin/settings.html).
export default function SettingsPanel({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [tab, setTab] = useState(0);

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
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={() => void saveTelegram()} disabled={busy}>
              Сохранить
            </button>
            <TelegramTestButton />
            {msg && <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{msg}</span>}
          </div>
        </div>
      </div>
    </>
  );
}