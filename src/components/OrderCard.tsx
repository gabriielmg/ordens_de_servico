import {
  formatDate,
  getDueDateCaption,
  getDueStatusLabel,
  getDueStatusTone,
  getWorkflowStatusLabel,
  getWorkflowStatusTone
} from "../lib/date";
import type { ServiceOrder } from "../types";

interface OrderCardProps {
  order: ServiceOrder;
  onOpen: (order: ServiceOrder) => void;
  index?: number;
}

export function OrderCard({ order, onOpen, index = 0 }: OrderCardProps) {
  const dueTone = getDueStatusTone(order.dueStatus);
  const workflowTone = getWorkflowStatusTone(order.workflowStatus);

  return (
    <button
      type="button"
      className={`order-card ${dueTone}`}
      onClick={() => onOpen(order)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="order-card-topline">
        <div className="order-badges">
          <span className={`status-pill ${workflowTone}`}>
            {getWorkflowStatusLabel(order.workflowStatus)}
          </span>
          <span className={`status-pill subtle-pill ${dueTone}`}>
            {getDueStatusLabel(order.dueStatus)}
          </span>
        </div>

        {order.thumbnailUrl ? (
          <img
            src={order.thumbnailUrl}
            alt={order.subject}
            className="order-card-thumb"
            loading="lazy"
          />
        ) : (
          <div className="order-card-thumb order-card-thumb-fallback">
            {order.chapelName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="order-card-body">
        <p className="order-chapel">{order.chapelName}</p>
        <h3>{order.subject}</h3>
        <p className="order-description">{order.description}</p>
      </div>

      <div className="order-card-footer">
        <div className="order-due-group">
          <span className="order-due-label">Vencimento</span>
          <strong>{formatDate(order.dueDate)}</strong>
          <small>{getDueDateCaption(order.dueDate)}</small>
        </div>

        <div className="order-card-meta">
          <span>{order.images.length} imagem(ns)</span>
          <span>Ver detalhes</span>
        </div>
      </div>
    </button>
  );
}
