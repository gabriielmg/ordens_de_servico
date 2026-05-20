import type { AppUser, Chapel, ServiceOrder } from "../types";

const now = new Date("2026-04-17T09:30:00.000Z").toISOString();

export const mockChapels: Chapel[] = [
  { id: "capela-valentina", name: "Capela Valentina", region: "Zona Sul" },
  { id: "capela-mangabeira", name: "Capela Mangabeira", region: "Zona Leste" },
  { id: "capela-centro", name: "Capela Centro", region: "Regiao Central" },
  { id: "capela-jardins", name: "Capela Jardins", region: "Zona Norte" }
];

export const mockOrders: ServiceOrder[] = [
  {
    id: "os-1024",
    chapelId: "capela-valentina",
    chapelName: "Capela Valentina",
    subject: "Reparo de iluminacao do salao principal",
    description:
      "Troca de luminarias queimadas e revisao do circuito eletrico proximo ao altar principal.",
    dueDate: "2026-04-15",
    dueStatus: "overdue",
    workflowStatus: "pending",
    previousWorkflowStatus: null,
    createdAt: "2026-04-01T08:30:00.000Z",
    updatedAt: now,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
    images: [
      {
        id: "img-1024-1",
        url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80",
        alt: "Iluminacao do salao principal",
        isCover: true
      },
      {
        id: "img-1024-2",
        url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
        alt: "Vista interna da capela"
      }
    ],
    statusTimeline: []
  },
  {
    id: "os-1029",
    chapelId: "capela-mangabeira",
    chapelName: "Capela Mangabeira",
    subject: "Pintura externa da fachada lateral",
    description:
      "Retocar infiltracoes aparentes e aplicar tinta resistente a umidade na lateral do predio.",
    dueDate: "2026-04-18",
    dueStatus: "due_soon",
    workflowStatus: "in_review",
    previousWorkflowStatus: "in_progress",
    createdAt: "2026-04-05T10:00:00.000Z",
    updatedAt: "2026-04-17T11:15:00.000Z",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    images: [
      {
        id: "img-1029-1",
        url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
        alt: "Fachada com necessidade de pintura",
        isCover: true
      }
    ],
    statusTimeline: [
      {
        id: "evt-1029-1",
        actorName: "Rafael Santos",
        actorRole: "technician",
        description: "OS enviada para validacao do administrador.",
        createdAt: "2026-04-17T11:15:00.000Z",
        fromStatus: "in_progress",
        toStatus: "in_review"
      }
    ]
  },
  {
    id: "os-1033",
    chapelId: "capela-centro",
    chapelName: "Capela Centro",
    subject: "Manutencao do ar-condicionado",
    description:
      "Limpeza dos filtros, revisao do dreno e avaliacao do rendimento termico do equipamento.",
    dueDate: "2026-04-24",
    dueStatus: "on_track",
    workflowStatus: "in_progress",
    previousWorkflowStatus: null,
    createdAt: "2026-04-08T09:10:00.000Z",
    updatedAt: "2026-04-14T13:45:00.000Z",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    images: [
      {
        id: "img-1033-1",
        url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
        alt: "Equipamento de climatizacao",
        isCover: true
      }
    ],
    statusTimeline: [
      {
        id: "evt-1033-1",
        actorName: "Ana Paula Lima",
        actorRole: "admin",
        description: "OS movida para em andamento.",
        createdAt: "2026-04-14T13:45:00.000Z",
        fromStatus: "pending",
        toStatus: "in_progress"
      }
    ]
  },
  {
    id: "os-1037",
    chapelId: "capela-jardins",
    chapelName: "Capela Jardins",
    subject: "Reposicao de bancos do jardim memorial",
    description:
      "Instalar dois novos bancos com acabamento anticorrosivo e revisar o piso ao redor.",
    dueDate: "2026-04-29",
    dueStatus: "on_track",
    workflowStatus: "pending",
    previousWorkflowStatus: null,
    createdAt: "2026-04-10T07:20:00.000Z",
    updatedAt: "2026-04-12T18:30:00.000Z",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=900&q=80",
    images: [
      {
        id: "img-1037-1",
        url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1400&q=80",
        alt: "Jardim memorial",
        isCover: true
      }
    ],
    statusTimeline: []
  },
  {
    id: "os-1040",
    chapelId: "capela-valentina",
    chapelName: "Capela Valentina",
    subject: "Troca de fechadura do deposito",
    description:
      "Substituir a fechadura atual por modelo reforcado e registrar chaves para equipe responsavel.",
    dueDate: "2026-04-12",
    dueStatus: "overdue",
    workflowStatus: "completed",
    previousWorkflowStatus: "in_review",
    createdAt: "2026-03-28T11:00:00.000Z",
    updatedAt: "2026-04-12T16:05:00.000Z",
    reviewedAt: "2026-04-12T16:05:00.000Z",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    images: [
      {
        id: "img-1040-1",
        url: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80",
        alt: "Fechadura do deposito",
        isCover: true
      }
    ],
    statusTimeline: [
      {
        id: "evt-1040-1",
        actorName: "Rafael Santos",
        actorRole: "technician",
        description: "OS enviada para validacao do administrador.",
        createdAt: "2026-04-12T13:55:00.000Z",
        fromStatus: "in_progress",
        toStatus: "in_review"
      },
      {
        id: "evt-1040-2",
        actorName: "Ana Paula Lima",
        actorRole: "admin",
        description: "OS aprovada e movida para o historico.",
        createdAt: "2026-04-12T16:05:00.000Z",
        fromStatus: "in_review",
        toStatus: "completed"
      }
    ]
  }
];

export const mockUsers: AppUser[] = [
  {
    id: "user-admin",
    name: "Ana Paula Lima",
    email: "admin@ordemfacil.app",
    role: "admin",
    password: "123456"
  },
  {
    id: "user-tech",
    name: "Rafael Santos",
    email: "tecnico@ordemfacil.app",
    role: "technician",
    password: "123456"
  }
];
