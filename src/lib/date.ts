import type { DueStatus, WorkflowStatus } from "../types";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getDaysUntil(value: string) {
  const target = new Date(`${value}T00:00:00`);
  const today = new Date();
  const normalizedToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return Math.round(
    (target.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function deriveDueStatus(dueDate: string): DueStatus {
  const diff = getDaysUntil(dueDate);

  if (diff < 0) return "overdue";
  if (diff <= 7) return "due_soon";
  return "on_track";
}

export function getDueStatusLabel(status: DueStatus) {
  const labels: Record<DueStatus, string> = {
    overdue: "Atrasado",
    due_soon: "Proximo",
    on_track: "Em dia"
  };

  return labels[status];
}

export function getDueStatusTone(status: DueStatus) {
  const tones: Record<DueStatus, string> = {
    overdue: "tone-overdue",
    due_soon: "tone-due-soon",
    on_track: "tone-on-track"
  };

  return tones[status];
}

export function getWorkflowStatusLabel(status: WorkflowStatus) {
  const labels: Record<WorkflowStatus, string> = {
    pending: "Pendente",
    in_progress: "Em andamento",
    in_review: "Em analise",
    completed: "Concluida"
  };

  return labels[status];
}

export function getWorkflowStatusTone(status: WorkflowStatus) {
  const tones: Record<WorkflowStatus, string> = {
    pending: "workflow-pending",
    in_progress: "workflow-in-progress",
    in_review: "workflow-in-review",
    completed: "workflow-completed"
  };

  return tones[status];
}

export function getDueDateCaption(dueDate: string) {
  const diff = getDaysUntil(dueDate);

  if (diff < 0) {
    return `${Math.abs(diff)} dia(s) em atraso`;
  }

  if (diff === 0) {
    return "Vence hoje";
  }

  if (diff === 1) {
    return "Vence amanha";
  }

  return `Vence em ${diff} dia(s)`;
}
