export type DueStatus = "overdue" | "due_soon" | "on_track";
export type WorkflowStatus = "pending" | "in_progress" | "in_review" | "completed";
export type UserRole = "admin" | "technician";

export interface Chapel {
  id: string;
  name: string;
  region: string;
}

export interface OrderImage {
  id: string;
  url: string;
  alt: string;
  storagePath?: string;
  isCover?: boolean;
  createdAt?: string;
  uploadedBy?: string;
}

export interface OrderTimelineEntry {
  id: string;
  actorName: string;
  actorRole: UserRole;
  description: string;
  createdAt: string;
  fromStatus?: WorkflowStatus;
  toStatus?: WorkflowStatus;
  note?: string;
}

export interface ServiceOrder {
  id: string;
  chapelId: string;
  chapelName: string;
  subject: string;
  description: string;
  dueDate: string;
  dueStatus: DueStatus;
  workflowStatus: WorkflowStatus;
  previousWorkflowStatus?: WorkflowStatus | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  thumbnailUrl?: string;
  images: OrderImage[];
  statusTimeline: OrderTimelineEntry[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface FiltersState {
  search: string;
  chapelIds: string[];
  dueStatus: "all" | DueStatus;
  workflowStatus: "all" | WorkflowStatus;
  dateFrom: string;
  dateTo: string;
  groupedByChapel: boolean;
  showCompleted: boolean;
}
