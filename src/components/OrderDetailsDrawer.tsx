import { useEffect, useRef, useState } from "react";
import {
  formatDate,
  formatDateTime,
  getDueDateCaption,
  getDueStatusLabel,
  getDueStatusTone,
  getWorkflowStatusLabel,
  getWorkflowStatusTone
} from "../lib/date";
import type { ServiceOrder, UserRole } from "../types";

interface OrderDetailsDrawerProps {
  order: ServiceOrder | null;
  userRole: UserRole;
  isBusy: boolean;
  busyLabel?: string;
  onClose: () => void;
  onStartOrder: (order: ServiceOrder) => Promise<void>;
  onSubmitForReview: (order: ServiceOrder) => Promise<void>;
  onApprove: (order: ServiceOrder) => Promise<void>;
  onReject: (order: ServiceOrder) => Promise<void>;
  onUploadImages: (order: ServiceOrder, files: File[]) => Promise<void>;
}

export function OrderDetailsDrawer({
  order,
  userRole,
  isBusy,
  busyLabel,
  onClose,
  onStartOrder,
  onSubmitForReview,
  onApprove,
  onReject,
  onUploadImages
}: OrderDetailsDrawerProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelectedImage(0);
    setIsFullscreen(false);
  }, [order]);

  if (!order) return null;

  const dueTone = getDueStatusTone(order.dueStatus);
  const workflowTone = getWorkflowStatusTone(order.workflowStatus);
  const activeImage = order.images[selectedImage];
  const canStartOrder = order.workflowStatus === "pending";
  const canSubmitForReview =
    order.workflowStatus === "pending" || order.workflowStatus === "in_progress";
  const canApprove = userRole === "admin" && order.workflowStatus === "in_review";
  const canReject = userRole === "admin" && order.workflowStatus === "in_review";
  const canUploadImages = userRole === "admin";

  const changeImage = (direction: "prev" | "next") => {
    if (order.images.length <= 1) return;

    setSelectedImage((current) => {
      if (direction === "prev") {
        return current === 0 ? order.images.length - 1 : current - 1;
      }

      return current === order.images.length - 1 ? 0 : current + 1;
    });
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />

      <aside className="details-drawer">
        <div className="drawer-toolbar">
          <button type="button" className="ghost-button" onClick={onClose}>
            Fechar
          </button>
          {isBusy ? <span className="busy-indicator">{busyLabel ?? "Salvando..."}</span> : null}
        </div>

        <div className="details-header">
          <div className="order-badges">
            <span className={`status-pill ${workflowTone}`}>
              {getWorkflowStatusLabel(order.workflowStatus)}
            </span>
            <span className={`status-pill subtle-pill ${dueTone}`}>
              {getDueStatusLabel(order.dueStatus)}
            </span>
          </div>

          <p className="order-chapel">{order.chapelName}</p>
          <h2>{order.subject}</h2>
          <p className="details-description">{order.description}</p>
        </div>

        <div className="details-meta-grid">
          <div className="meta-card">
            <span>OS</span>
            <strong>{order.id.toUpperCase()}</strong>
          </div>
          <div className="meta-card">
            <span>Vencimento</span>
            <strong>{formatDate(order.dueDate)}</strong>
            <small>{getDueDateCaption(order.dueDate)}</small>
          </div>
          <div className="meta-card">
            <span>Ultima atualizacao</span>
            <strong>{formatDateTime(order.updatedAt)}</strong>
          </div>
          <div className="meta-card">
            <span>Historico</span>
            <strong>{order.statusTimeline.length} evento(s)</strong>
          </div>
        </div>

        <section className="actions-panel">
          <div className="gallery-heading">
            <h3>Acoes da OS</h3>
            <span>
              {userRole === "admin"
                ? "Aprovacao, reprova e gestao de imagens"
                : "Atualize o andamento sem perder o contexto"}
            </span>
          </div>

          <div className="action-grid">
            {canStartOrder ? (
              <button type="button" className="secondary-button" disabled={isBusy} onClick={() => onStartOrder(order)}>
                Iniciar atendimento
              </button>
            ) : null}

            {userRole === "technician" && canSubmitForReview ? (
              <button
                type="button"
                className="primary-button"
                disabled={isBusy}
                onClick={() => onSubmitForReview(order)}
              >
                Marcar como concluida
              </button>
            ) : null}

            {canApprove ? (
              <button
                type="button"
                className="primary-button"
                disabled={isBusy}
                onClick={() => onApprove(order)}
              >
                Aprovar OS
              </button>
            ) : null}

            {canReject ? (
              <button
                type="button"
                className="secondary-button danger-button"
                disabled={isBusy}
                onClick={() => onReject(order)}
              >
                Reprovar
              </button>
            ) : null}

            {canUploadImages ? (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={async (event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length === 0) return;
                    await onUploadImages(order, files);
                    event.target.value = "";
                  }}
                />

                <button
                  type="button"
                  className="secondary-button"
                  disabled={isBusy}
                  onClick={() => inputRef.current?.click()}
                >
                  Adicionar imagem
                </button>
              </>
            ) : null}
          </div>

          {order.workflowStatus === "in_review" && userRole === "technician" ? (
            <div className="inline-note">
              Sua OS ja foi enviada e agora aguarda validacao do administrador.
            </div>
          ) : null}
        </section>

        <section className="gallery-section">
          <div className="gallery-heading">
            <h3>Galeria da OS</h3>
            <span>{order.images.length} arquivo(s)</span>
          </div>

          {activeImage ? (
            <div className="gallery-stage">
              <img
                src={activeImage.url}
                alt={activeImage.alt}
                loading="eager"
                onClick={() => setIsFullscreen(true)}
              />
              {order.images.length > 1 ? (
                <div className="gallery-controls">
                  <button type="button" className="ghost-button" onClick={() => changeImage("prev")}>
                    Anterior
                  </button>
                  <button type="button" className="ghost-button" onClick={() => changeImage("next")}>
                    Proxima
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-gallery">Nenhuma imagem vinculada a esta OS.</div>
          )}

          <div className="gallery-thumbs">
            {order.images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={index === selectedImage ? "thumb thumb-active" : "thumb"}
                onClick={() => setSelectedImage(index)}
              >
                <img src={image.url} alt={image.alt} loading="lazy" />
              </button>
            ))}
          </div>
        </section>

        <section className="timeline-section">
          <div className="gallery-heading">
            <h3>Historico do fluxo</h3>
            <span>Auditoria visual da OS</span>
          </div>

          {order.statusTimeline.length === 0 ? (
            <div className="empty-gallery">Nenhuma movimentacao registrada ainda.</div>
          ) : (
            <div className="timeline-list">
              {order.statusTimeline.map((entry) => (
                <article key={entry.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div>
                    <strong>{entry.description}</strong>
                    <p>
                      {entry.actorName} •{" "}
                      {entry.actorRole === "admin" ? "Administrador" : "Colaborador"}
                    </p>
                    <small>{formatDateTime(entry.createdAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>

      {isFullscreen && activeImage ? (
        <div className="lightbox" onClick={() => setIsFullscreen(false)}>
          <button type="button" className="ghost-button lightbox-close">
            Fechar imagem
          </button>

          {order.images.length > 1 ? (
            <div className="lightbox-nav">
              <button type="button" className="ghost-button" onClick={(event) => {
                event.stopPropagation();
                changeImage("prev");
              }}>
                Anterior
              </button>
              <button type="button" className="ghost-button" onClick={(event) => {
                event.stopPropagation();
                changeImage("next");
              }}>
                Proxima
              </button>
            </div>
          ) : null}

          <img
            src={activeImage.url}
            alt={activeImage.alt}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
