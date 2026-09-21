"use client";

import { useRef } from "react";
import OrderModal, {
  type OrderModalHandle,
  type OrderRow as OrderRowData,
} from "@/components/admin/OrderModal";
import CollageLightbox from "@/components/admin/CollageLightbox";
import { formatPrice, asPriced } from "@/lib/format";
import { useCurrency } from "@/lib/use-currency";
import { useAdminDict } from "./admin-dict-context";
import type { FinanceSettings } from "@/lib/currency";
import type { OrderStatus } from "@/drizzle/schema";

const TYPE_TAGS: Record<string, string> = {
  product: "tag--new",
  custom: "tag--mustard",
  contact: "tag--olive",
};

const TYPE_LABEL_KEYS: Record<string, "typeProduct" | "typeCustom" | "typeContact"> = {
  product: "typeProduct",
  custom: "typeCustom",
  contact: "typeContact",
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
  const d = useAdminDict();
  const statusLabels = d.statusLabels as unknown as Record<OrderStatus, string>;
  const typeLabels = d.orders as unknown as Record<
    "typeProduct" | "typeCustom" | "typeContact",
    string
  >;
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
        <span className={`tag ${TYPE_TAGS[order.type]}`}>
          {typeLabels[TYPE_LABEL_KEYS[order.type]]}
        </span>
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
          ? d.orders.emptyDash
          : formatPrice(
              asPriced(order.calcPrice, order.calcPriceCurrency),
              currency,
              finance,
            )}
      </td>
      <td className="num">
        {order.type === "custom" && order.calcDays > 0
          ? `${order.calcDays} ${d.orders.daysShort}`
          : d.orders.emptyDash}
      </td>
      <td>
        {order.collagePath ? (
          <CollageLightbox src={order.collagePath} />
        ) : (
          d.orders.emptyDash
        )}
      </td>
      <td>
        <span className={`tag tag--${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </td>
      <td className="num">{fmtDate(order.createdAt)}</td>
      <td>
        <div className="actions">
          <OrderModal
            ref={modalRef}
            order={order}
            finance={finance}
            currencyCode={currencyCode}
          />
        </div>
      </td>
    </tr>
  );
}