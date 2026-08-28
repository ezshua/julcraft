"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, asPriced, formatSnapshot } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-labels";
import type { FinanceSettings } from "@/lib/currency";
import type { OrderStatus, OrderType } from "@/drizzle/schema";

export type OrderRow = {
  id: number;
  type: OrderType;
  customerName: string;
  contact: string;
  message: string;
  productName: string | null;
  categoryName: string | null;
  collagePath: string | null;
  configJson: string;
  calcPrice: number;
  calcPriceCurrency: string;
  calcDays: number;
  status: OrderStatus;
  createdAt: Date;
};

type SnapshotItem = {
  componentId?: number;
  name: string;
  qty: number;
  price: number;
  processingPrice: number;
};

export type OrderModalHandle = {
  openView: () => void;
  openEdit: () => void;
};

type Props = {
  order: OrderRow;
  editMode?: "view" | "edit";
  finance: FinanceSettings;
  currencyCode: string;
};

// Модалка деталей заявки — копия div.modal-overlay#modal-order из mockup/admin/orders.html.
// editMode — режим по умолчанию для модалки, открытой по кнопке в колонке «Действия».
// «view» — без кнопок смены статуса, «edit» — с ними.
const OrderModal = forwardRef<OrderModalHandle, Props>(function OrderModal(
  {
    order,
    editMode = "edit",
    finance,
    currencyCode,
  },
  ref,
) {
  const router = useRouter();
  const { currency } = useCurrency(finance, currencyCode);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(editMode);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    openView: () => {
      setMode("view");
      setOpen(true);
    },
    openEdit: () => {
      setMode("edit");
      setOpen(true);
    },
  }));

  const changeStatus = async (next: OrderStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setStatus(next);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  let snap: { items: SnapshotItem[]; categoryName?: string; workPrice?: number } | null = null;
  try {
    const raw = JSON.parse(order.configJson) as unknown;
    if (Array.isArray(raw)) {
      snap = { items: raw as SnapshotItem[] };
    } else if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.items)) {
        snap = {
          items: obj.items as SnapshotItem[],
          categoryName:
            typeof obj.categoryName === "string" ? obj.categoryName : undefined,
          workPrice: typeof obj.workPrice === "number" ? obj.workPrice : undefined,
        };
      }
    }
  } catch {
    snap = null;
  }

  const newCount = status === "new";

  return (
    <>
      <button
        className="icon-btn"
        style={{ width: 32, height: 32 }}
        title="Открыть"
        onClick={() => {
          setMode("view");
          setOpen(true);
        }}
      >
        👁
      </button>
      <button
        className="icon-btn"
        style={{ width: 32, height: 32 }}
        title="Редактировать"
        onClick={() => {
          setMode("edit");
          setOpen(true);
        }}
      >
        ✎
      </button>
      <button
        className="icon-btn icon-btn--rust"
        style={{ width: 32, height: 32 }}
        title="Удалить"
        onClick={() => {
          if (window.confirm(`Удалить заявку #${order.id}?`)) {
            void (async () => {
              const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: "DELETE",
              });
              if (res.ok) router.refresh();
            })();
          }
        }}
      >
        🗑
      </button>

      <div className={open ? "modal-overlay open" : "modal-overlay"} id="modal-order">
        <div className="modal modal--wide">
          <div className="m-head">
            <h3>Заявка #{order.id} — {order.customerName}</h3>
            <button
              className="icon-btn"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          <div className="order-detail">
            <div className="field--row" style={{ gap: "24px" }}>
              <div className="grow-1">
                {order.collagePath ? (
                  <div style={{ marginBottom: "14px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.collagePath}
                      alt="Коллаж заявки"
                      style={{ background: "var(--white)", borderRadius: 12 }}
                    />
                  </div>
                ) : (
                  <div className="dropzone" style={{ marginBottom: "14px" }}>
                    <b>Коллаж (PNG)</b>
                    <div className="dz-example" style={{ gap: "10px" }}>
                      <svg
                        viewBox="0 0 24 24"
                        width="56"
                        height="56"
                        style={{
                          background: "var(--white)",
                          border: "3px solid var(--brown)",
                          borderRadius: 12,
                        }}
                      >
                        <circle
                          cx="12"
                          cy="10"
                          r="7"
                          fill="none"
                          stroke="#e8b64c"
                          strokeWidth="3"
                        />
                        <path d="M12 17v4" />
                      </svg>
                      <svg
                        viewBox="0 0 24 24"
                        width="56"
                        height="56"
                        style={{
                          background: "var(--white)",
                          border: "3px solid var(--brown)",
                          borderRadius: 12,
                        }}
                      >
                        <circle cx="12" cy="12" r="9" fill="#faf5ec" stroke="#22242a" strokeWidth="2" />
                        <circle cx="9" cy="9" r="1.5" fill="#22242a" />
                        <circle cx="15" cy="9" r="1.5" fill="#22242a" />
                      </svg>
                      <span>коллаж собран сервером · sharp</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grow-1">
                <div className="field">
                  <label>Клиент</label>
                  <input type="text" value={order.customerName} disabled />
                </div>
                <div className="field">
                  <label>Контакт</label>
                  <input type="text" value={order.contact} disabled />
                </div>
                <div className="field">
                  <label>Комментарий</label>
                  <textarea value={order.message} disabled />
                </div>
              </div>
            </div>

            {order.type === "custom" && snap && snap.items.length > 0 ? (
              <div className="receipt" style={{ maxWidth: "100%", margin: "0 0 16px", padding: "26px 24px" }}>
                {/* Q-6: снимок configJson — исторический факт, суммы как сохранены (₴) */}
                {snap.items.map((item, i) => (
                  <div key={i}>
                    <div className="row">
                      <span>{item.name} ×{item.qty}</span>
                      <span className="r">{formatSnapshot(item.price * item.qty)}</span>
                    </div>
                    <div className="row">
                      <span>&nbsp;&nbsp;обработка ×{item.qty}</span>
                      <span className="r">{formatSnapshot(item.processingPrice * item.qty)}</span>
                    </div>
                  </div>
                ))}
                {snap.workPrice != null && snap.categoryName != null && (
                  <div className="row">
                    <span>Стоимость работы ({snap.categoryName})</span>
                    <span className="r">{formatSnapshot(snap.workPrice)}</span>
                  </div>
                )}
                <div className="row" style={{ fontWeight: 500 }}>
                  <span>
                    <b>Итого</b>
                  </span>
                  <span className="r">
                    <b>{formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance)}</b>
                  </span>
                </div>
                <div className="row">
                  <span>Срок</span>
                  <span className="r">{order.calcDays} дн</span>
                </div>
              </div>
            ) : order.type === "product" ? (
              <p style={{ fontSize: ".9rem", margin: "0 0 16px" }}>
                состав: {order.productName ?? "—"}
              </p>
            ) : order.type === "contact" ? null : (
              <p style={{ fontSize: ".9rem", margin: "0 0 16px" }}>
                сообщение: {order.message || "—"}
              </p>
            )}

            <div className="form-actions">
              <span className={`tag tag--${status}`}>{ORDER_STATUS_LABELS[status]}</span>
              {mode === "edit" && status === "new" && (
                <button
                  className="btn btn--primary btn--small"
                  style={{ marginLeft: "auto" }}
                  onClick={() => void changeStatus("in_progress")}
                  disabled={busy}
                >
                  Взять в работу
                </button>
              )}
              {mode === "edit" && status === "in_progress" && (
                <button
                  className="btn btn--primary btn--small"
                  style={{ marginLeft: "auto" }}
                  onClick={() => void changeStatus("done")}
                  disabled={busy}
                >
                  Готово ✓
                </button>
              )}
              {mode === "edit" && status === "cancelled" && (
                <button
                  className="btn btn--primary btn--small"
                  style={{ marginLeft: "auto" }}
                  onClick={() => void changeStatus("new")}
                  disabled={busy}
                >
                  Переобработать
                </button>
              )}
              {mode === "edit" && (newCount || status === "in_progress") && (
                <button
                  className="btn btn--secondary btn--small"
                  onClick={() => void changeStatus("cancelled")}
                  disabled={busy}
                >
                  Отменить
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default OrderModal;