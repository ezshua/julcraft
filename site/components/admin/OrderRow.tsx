"use client";

import { useRef } from "react";
import OrderModal, {
  type OrderModalHandle,
  type OrderRow as OrderRowData,
} from "@/components/admin/OrderModal";
import CollageLightbox from "@/components/admin/CollageLightbox";
import { formatPrice, asPriced } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import type { FinanceSettings } from "@/lib/currency";

const TYPE_TAGS: Record<string, string> = {
  product: "tag--new",
  custom: "tag--mustard",
  contact: "tag--olive",
};

const TYPE_LABELS: Record<string, string> = {
  product: "товар",
  custom: "конфигуратор",
  contact: "контакт",
};

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function OrderRow({
  order,
  smallText,
  finance,
  currencyCode,
}: {
  order: OrderRowData;
  smallText: string;
  finance: FinanceSettings;
  currencyCode: string;
}) {
  const modalRef = useRef<OrderModalHandle>(null);
  const { currency } = useCurrency(finance, currencyCode);

  const onRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [data-no-row-click]")) return;
    modalRef.current?.openView();
  };

  return (
    <tr onClick={onRowClick} style={{ cursor: "pointer" }}>
      <td className="num">#{order.id}</td>
      <td>
        <span className={`tag ${TYPE_TAGS[order.type]}`}>{TYPE_LABELS[order.type]}</span>
      </td>
      <td className="cell-name">
        <b>{order.customerName}</b>
        <small>{smallText}</small>
      </td>
      <td className="cell-name">
        <small>{order.contact}</small>
      </td>
      <td className="cell-price">
        {order.type === "contact"
          ? "—"
          : formatPrice(asPriced(order.calcPrice, order.calcPriceCurrency), currency, finance)}
      </td>
      <td className="num">
        {order.type === "custom" && order.calcDays > 0 ? `${order.calcDays} дн` : "—"}
      </td>
      <td>{order.collagePath ? <CollageLightbox src={order.collagePath} /> : "—"}</td>
      <td>
        <span className={`tag tag--${order.status}`}>{order.status}</span>
      </td>
      <td className="num">{fmtDate(order.createdAt)}</td>
      <td>
        <div className="actions">
          <OrderModal ref={modalRef} order={order} finance={finance} currencyCode={currencyCode} />
        </div>
      </td>
    </tr>
  );
}
