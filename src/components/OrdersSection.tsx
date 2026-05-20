import { OrderCard } from "./OrderCard";
import type { ServiceOrder } from "../types";

interface OrdersSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  orders: ServiceOrder[];
  grouped: boolean;
  onOpen: (order: ServiceOrder) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function OrdersSection({
  eyebrow,
  title,
  description,
  orders,
  grouped,
  onOpen,
  emptyTitle,
  emptyDescription
}: OrdersSectionProps) {
  const groupedOrders: Array<[string, ServiceOrder[]]> = grouped
    ? Object.entries(
        orders.reduce<Record<string, ServiceOrder[]>>((acc, order) => {
          acc[order.chapelName] = [...(acc[order.chapelName] ?? []), order];
          return acc;
        }, {})
      )
    : [["Todas as capelas", orders]];

  return (
    <section className="orders-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="section-copy">{description}</p>
        </div>
        <strong className="section-counter">{orders.length} OS</strong>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        groupedOrders.map(([groupName, items]) => (
          <div key={groupName} className="orders-group">
            {grouped ? <h3 className="group-title">{groupName}</h3> : null}
            <div className="orders-grid">
              {items.map((order, index) => (
                <OrderCard key={order.id} order={order} onOpen={onOpen} index={index} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
