import { mockChapels, mockOrders, mockUsers } from "../data/mockData";
import { deriveDueStatus } from "../lib/date";
import { readStorage, writeStorage } from "../lib/storage";
import { hasSupabaseEnv, supabase } from "../lib/supabase";
import type {
  AppUser,
  Chapel,
  DueStatus,
  OrderImage,
  OrderTimelineEntry,
  ServiceOrder,
  UserRole,
  WorkflowStatus
} from "../types";

const USERS_KEY = "ordemfacil:users";
const SESSION_KEY = "ordemfacil:session";
const ORDER_METADATA_KEY = "ordemfacil:order-metadata";
const ORDER_IMAGES_BUCKET = import.meta.env.VITE_SUPABASE_ORDER_IMAGES_BUCKET ?? "service-order-images";
const sheetsApiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
const spreadsheetRange = import.meta.env.VITE_GOOGLE_SHEETS_RANGE ?? "Sheet1!A:G";
const hasGoogleSheetsEnv = Boolean(spreadsheetId);

let googleSheetsOrdersPromise: Promise<ServiceOrder[]> | null = null;

interface StoredOrderMetadata {
  workflowStatus: WorkflowStatus;
  previousWorkflowStatus?: WorkflowStatus | null;
  reviewedAt?: string;
  updatedAt?: string;
  images: OrderImage[];
  statusTimeline: OrderTimelineEntry[];
}

type StoredOrderMetadataMap = Record<string, StoredOrderMetadata>;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSheetDate(value: string) {
  const trimmed = value.trim();
  const [datePart] = trimmed.split(" ");
  const [day, month, year] = datePart.split("/");

  if (!day || !month || !year) return null;

  const iso = `${year.padStart(4, "20")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : iso;
}

function isDueStatus(value: string): value is DueStatus {
  return value === "overdue" || value === "due_soon" || value === "on_track";
}

function getGoogleSheetRangeParts(range: string) {
  const [rawSheetName, rawCellsRange = "A:G"] = range.includes("!")
    ? range.split("!")
    : [range, "A:G"];

  return {
    sheetName: rawSheetName.replace(/^'/, "").replace(/'$/, ""),
    cellsRange: rawCellsRange
  };
}

function normalizeSheetCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function dedupeImages(images: OrderImage[]) {
  const unique = new Map<string, OrderImage>();

  images.forEach((image) => {
    const key = image.storagePath ?? image.url;
    if (!unique.has(key)) {
      unique.set(key, image);
    }
  });

  return [...unique.values()];
}

function getCoverImage(images: OrderImage[]) {
  return images.find((image) => image.isCover) ?? images[0];
}

function createTimelineEntry(payload: {
  actor: AppUser;
  description: string;
  fromStatus?: WorkflowStatus;
  toStatus?: WorkflowStatus;
  note?: string;
}) {
  return {
    id: crypto.randomUUID(),
    actorName: payload.actor.name,
    actorRole: payload.actor.role,
    description: payload.description,
    createdAt: new Date().toISOString(),
    fromStatus: payload.fromStatus,
    toStatus: payload.toStatus,
    note: payload.note
  } satisfies OrderTimelineEntry;
}

function getDefaultOrderMetadata(order: ServiceOrder): StoredOrderMetadata {
  return {
    workflowStatus: order.workflowStatus,
    previousWorkflowStatus: order.previousWorkflowStatus ?? null,
    reviewedAt: order.reviewedAt,
    updatedAt: order.updatedAt,
    images: order.images,
    statusTimeline: order.statusTimeline
  };
}

function readLocalOrderMetadata() {
  return readStorage<StoredOrderMetadataMap>(ORDER_METADATA_KEY, {});
}

function writeLocalOrderMetadata(metadata: StoredOrderMetadataMap) {
  writeStorage(ORDER_METADATA_KEY, metadata);
}

function mergeOrdersWithMetadata(baseOrders: ServiceOrder[], metadataMap: StoredOrderMetadataMap) {
  return baseOrders.map((order) => {
    const metadata = metadataMap[order.id];
    if (!metadata) return order;

    const images = dedupeImages([...(order.images ?? []), ...(metadata.images ?? [])]);
    const cover = getCoverImage(images);

    return {
      ...order,
      workflowStatus: metadata.workflowStatus ?? order.workflowStatus,
      previousWorkflowStatus: metadata.previousWorkflowStatus ?? order.previousWorkflowStatus,
      updatedAt: metadata.updatedAt ?? order.updatedAt,
      reviewedAt: metadata.reviewedAt ?? order.reviewedAt,
      images,
      thumbnailUrl: cover?.url ?? order.thumbnailUrl,
      statusTimeline: [...(metadata.statusTimeline ?? order.statusTimeline)].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      )
    } satisfies ServiceOrder;
  });
}

function parseOrdersFromSheetRows(rows: string[][]) {
  if (rows.length <= 1) return [];

  const timestamp = new Date().toISOString();
  const parsedOrders: ServiceOrder[] = [];

  rows.slice(1).forEach((row, index) => {
    const chapelName = row[0]?.trim() ?? "";
    const orderNumber = row[1]?.trim() ?? "";
    const dueDateRaw = row[2]?.trim() ?? "";
    const subject = row[3]?.trim() ?? "Sem assunto";
    const description = row[4]?.trim() ?? "";
    const dueDate = parseSheetDate(dueDateRaw);

    if (!chapelName || !dueDate) return;

    const id = orderNumber ? `os-${orderNumber}` : `sheet-row-${index + 2}`;

    parsedOrders.push({
      id,
      chapelId: slugify(chapelName),
      chapelName,
      subject,
      description,
      dueDate,
      dueStatus: deriveDueStatus(dueDate),
      workflowStatus: "pending",
      previousWorkflowStatus: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      images: [],
      statusTimeline: []
    });
  });

  return parsedOrders;
}

async function getRowsFromGoogleSheetsApi() {
  if (!spreadsheetId || !sheetsApiKey) {
    throw new Error("Configuracao incompleta do Google Sheets.");
  }

  const encodedRange = encodeURIComponent(spreadsheetRange);
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`
  );
  url.searchParams.set("key", sheetsApiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    const details = payload?.error?.message?.trim();
    const baseMessage =
      response.status === 403
        ? "A API key nao tem permissao para ler esta planilha."
        : "Nao foi possivel ler a planilha do Google Sheets pela API.";

    throw new Error(details ? `${baseMessage} ${details}` : baseMessage);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

async function getRowsFromGoogleSheetsGviz() {
  if (!spreadsheetId) {
    throw new Error("Planilha do Google nao configurada.");
  }

  const { sheetName, cellsRange } = getGoogleSheetRangeParts(spreadsheetRange);
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
  url.searchParams.set("tqx", "out:json");
  url.searchParams.set("sheet", sheetName);
  url.searchParams.set("range", cellsRange);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Nao foi possivel acessar a planilha publica do Google.");
  }

  const rawText = await response.text();
  const match = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/);

  if (!match) {
    throw new Error("Resposta inesperada ao ler a planilha publica do Google.");
  }

  const payload = JSON.parse(match[1]) as {
    status?: string;
    errors?: Array<{ detailed_message?: string }>;
    table?: {
      cols?: Array<{ label?: string }>;
      rows?: Array<{ c?: Array<{ v?: unknown; f?: string } | null> }>;
    };
  };

  if (payload.status !== "ok") {
    const details = payload.errors?.[0]?.detailed_message?.trim();
    throw new Error(
      details
        ? `Nao foi possivel consultar a planilha publica. ${details}`
        : "Nao foi possivel consultar a planilha publica."
    );
  }

  const headerRow = (payload.table?.cols ?? []).map((column) => column.label?.trim() ?? "");
  const valueRows = (payload.table?.rows ?? []).map((row) =>
    (row.c ?? []).map((cell) => normalizeSheetCell(cell?.f ?? cell?.v))
  );

  return [headerRow, ...valueRows];
}

async function loadGoogleSheetRows() {
  const failures: string[] = [];

  if (sheetsApiKey) {
    try {
      return await getRowsFromGoogleSheetsApi();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Falha na API do Google Sheets.");
    }
  }

  try {
    return await getRowsFromGoogleSheetsGviz();
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : "Falha no endpoint publico da planilha."
    );
  }

  throw new Error(
    [
      "Nao foi possivel ler a planilha do Google Sheets.",
      "Verifique se a planilha esta publica ou publicada na web, se a Google Sheets API esta ativada e se a API key permite acesso a partir deste dominio.",
      failures.join(" ")
    ]
      .filter(Boolean)
      .join(" ")
  );
}

async function getBaseOrdersFromGoogleSheets() {
  if (!googleSheetsOrdersPromise) {
    googleSheetsOrdersPromise = loadGoogleSheetRows()
      .then((rows) => parseOrdersFromSheetRows(rows))
      .catch((error) => {
        googleSheetsOrdersPromise = null;
        throw error;
      });
  }

  return googleSheetsOrdersPromise;
}

async function getBaseOrdersFromSupabase() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("service_orders")
    .select(
      `
      id,
      chapel_id,
      subject,
      description,
      due_date,
      status,
      created_at,
      updated_at,
      chapels:chapel_id (name),
      service_order_images (id, file_url, alt_text, is_cover, storage_path, created_at)
    `
    )
    .order("due_date", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item: any) => {
    const images =
      item.service_order_images?.map((image: any) => ({
        id: image.id,
        url: image.file_url,
        alt: image.alt_text ?? item.subject,
        isCover: image.is_cover ?? false,
        storagePath: image.storage_path ?? undefined,
        createdAt: image.created_at ?? undefined
      })) ?? [];

    const cover = getCoverImage(images);
    const dueStatus = isDueStatus(item.status) ? item.status : deriveDueStatus(item.due_date);

    return {
      id: item.id,
      chapelId: item.chapel_id,
      chapelName: item.chapels?.name ?? "Capela",
      subject: item.subject,
      description: item.description,
      dueDate: item.due_date,
      dueStatus,
      workflowStatus: "pending",
      previousWorkflowStatus: null,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      thumbnailUrl: cover?.url,
      images,
      statusTimeline: []
    } satisfies ServiceOrder;
  });
}

async function readSupabaseSupplementalMetadata() {
  if (!supabase) return {};

  try {
    const [metadataResponse, imagesResponse, eventsResponse] = await Promise.all([
      supabase
        .from("service_order_metadata")
        .select("service_order_ref, workflow_status, previous_workflow_status, reviewed_at, updated_at"),
      supabase
        .from("service_order_attachments")
        .select(
          "id, service_order_ref, file_url, storage_path, alt_text, is_cover, created_at, created_by"
        ),
      supabase
        .from("service_order_status_events")
        .select(
          "id, service_order_ref, actor_name, actor_role, description, created_at, from_status, to_status, note"
        )
    ]);

    if (metadataResponse.error || imagesResponse.error || eventsResponse.error) {
      return {};
    }

    const metadataMap: StoredOrderMetadataMap = {};

    (metadataResponse.data ?? []).forEach((row: any) => {
      metadataMap[row.service_order_ref] = {
        workflowStatus: row.workflow_status,
        previousWorkflowStatus: row.previous_workflow_status,
        reviewedAt: row.reviewed_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
        images: [],
        statusTimeline: []
      };
    });

    (imagesResponse.data ?? []).forEach((row: any) => {
      metadataMap[row.service_order_ref] ??= {
        workflowStatus: "pending",
        previousWorkflowStatus: null,
        images: [],
        statusTimeline: []
      };

      metadataMap[row.service_order_ref].images.push({
        id: row.id,
        url: row.file_url,
        alt: row.alt_text ?? "Imagem da OS",
        storagePath: row.storage_path ?? undefined,
        isCover: row.is_cover ?? false,
        createdAt: row.created_at ?? undefined,
        uploadedBy: row.created_by ?? undefined
      });
    });

    (eventsResponse.data ?? []).forEach((row: any) => {
      metadataMap[row.service_order_ref] ??= {
        workflowStatus: "pending",
        previousWorkflowStatus: null,
        images: [],
        statusTimeline: []
      };

      metadataMap[row.service_order_ref].statusTimeline.push({
        id: row.id,
        actorName: row.actor_name,
        actorRole: row.actor_role,
        description: row.description,
        createdAt: row.created_at,
        fromStatus: row.from_status ?? undefined,
        toStatus: row.to_status ?? undefined,
        note: row.note ?? undefined
      });
    });

    return metadataMap;
  } catch {
    return {};
  }
}

async function getSupplementalOrderMetadata() {
  if (hasSupabaseEnv && supabase) {
    return readSupabaseSupplementalMetadata();
  }

  return readLocalOrderMetadata();
}

async function getBaseOrders() {
  if (hasSupabaseEnv && supabase) {
    return getBaseOrdersFromSupabase();
  }

  if (hasGoogleSheetsEnv) {
    return getBaseOrdersFromGoogleSheets();
  }

  return mockOrders;
}

function getStoredUsers() {
  return readStorage<AppUser[]>(USERS_KEY, mockUsers);
}

function saveStoredUsers(users: AppUser[]) {
  writeStorage(USERS_KEY, users);
}

async function getSupabaseActorId() {
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Falha ao ler o arquivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function saveLocalOrderMetadata(orderId: string, metadata: StoredOrderMetadata) {
  const current = readLocalOrderMetadata();
  current[orderId] = metadata;
  writeLocalOrderMetadata(current);
}

async function changeWorkflowStatus(
  order: ServiceOrder,
  actor: AppUser,
  nextStatus: WorkflowStatus,
  description: string,
  options?: {
    previousWorkflowStatus?: WorkflowStatus | null;
    reviewedAt?: string;
    note?: string;
  }
) {
  const updatedAt = new Date().toISOString();
  const previousWorkflowStatus =
    options?.previousWorkflowStatus !== undefined
      ? options.previousWorkflowStatus
      : order.previousWorkflowStatus ?? null;
  const entry = createTimelineEntry({
    actor,
    description,
    fromStatus: order.workflowStatus,
    toStatus: nextStatus,
    note: options?.note
  });

  if (hasSupabaseEnv && supabase) {
    const actorId = await getSupabaseActorId();
    const { error: metadataError } = await supabase.from("service_order_metadata").upsert(
      {
        service_order_ref: order.id,
        workflow_status: nextStatus,
        previous_workflow_status: previousWorkflowStatus,
        reviewed_at: options?.reviewedAt ?? null,
        updated_at: updatedAt,
        updated_by: actorId
      },
      { onConflict: "service_order_ref" }
    );

    if (metadataError) {
      throw new Error(
        "Nao foi possivel salvar o fluxo da OS no Supabase. Verifique se as tabelas de metadata foram criadas."
      );
    }

    const { error: eventError } = await supabase.from("service_order_status_events").insert({
      service_order_ref: order.id,
      actor_name: actor.name,
      actor_role: actor.role,
      description,
      created_at: updatedAt,
      from_status: order.workflowStatus,
      to_status: nextStatus,
      note: options?.note ?? null
    });

    if (eventError) {
      throw new Error("Nao foi possivel registrar o historico da OS.");
    }

    return;
  }

  const currentMetadata = readLocalOrderMetadata();
  const nextMetadata = {
    ...getDefaultOrderMetadata(order),
    ...currentMetadata[order.id],
    workflowStatus: nextStatus,
    previousWorkflowStatus,
    reviewedAt: options?.reviewedAt ?? order.reviewedAt,
    updatedAt,
    images: currentMetadata[order.id]?.images ?? order.images,
    statusTimeline: [entry, ...(currentMetadata[order.id]?.statusTimeline ?? order.statusTimeline)]
  } satisfies StoredOrderMetadata;

  await saveLocalOrderMetadata(order.id, nextMetadata);
}

export async function uploadOrderImages(order: ServiceOrder, files: File[], actor: AppUser) {
  if (files.length === 0) return;

  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length !== files.length) {
    throw new Error("Selecione apenas arquivos de imagem.");
  }

  const now = new Date().toISOString();

  if (hasSupabaseEnv && supabase) {
    const actorId = await getSupabaseActorId();

    for (const file of imageFiles) {
      const storagePath = `service-orders/${order.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(ORDER_IMAGES_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        throw new Error(
          "Nao foi possivel enviar a imagem para o storage. Verifique o bucket e as politicas de acesso."
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(ORDER_IMAGES_BUCKET)
        .getPublicUrl(storagePath);

      const { error: imageError } = await supabase.from("service_order_attachments").insert({
        service_order_ref: order.id,
        file_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        alt_text: `${order.subject} - ${file.name}`,
        is_cover: !order.thumbnailUrl,
        created_at: now,
        created_by: actorId
      });

      if (imageError) {
        throw new Error(
          "Nao foi possivel registrar a imagem da OS. Verifique a tabela service_order_attachments."
        );
      }
    }

    const { error: eventError } = await supabase.from("service_order_status_events").insert({
      service_order_ref: order.id,
      actor_name: actor.name,
      actor_role: actor.role,
      description: `${imageFiles.length} imagem(ns) adicionada(s) a OS.`,
      created_at: now
    });

    if (eventError) {
      throw new Error("As imagens foram enviadas, mas o historico nao foi atualizado.");
    }

    return;
  }

  const encodedImages = await Promise.all(
    imageFiles.map(async (file, index) => ({
      id: crypto.randomUUID(),
      url: await fileToDataUrl(file),
      alt: `${order.subject} - ${file.name}`,
      isCover: !order.thumbnailUrl && index === 0,
      createdAt: now,
      uploadedBy: actor.name
    }))
  );

  const currentMetadata = readLocalOrderMetadata();
  const timelineEntry = createTimelineEntry({
    actor,
    description: `${encodedImages.length} imagem(ns) adicionada(s) a OS.`
  });

  const nextMetadata = {
    ...getDefaultOrderMetadata(order),
    ...currentMetadata[order.id],
    updatedAt: now,
    images: dedupeImages([
      ...(currentMetadata[order.id]?.images ?? order.images),
      ...encodedImages
    ]),
    statusTimeline: [timelineEntry, ...(currentMetadata[order.id]?.statusTimeline ?? order.statusTimeline)]
  } satisfies StoredOrderMetadata;

  await saveLocalOrderMetadata(order.id, nextMetadata);
}

export async function moveOrderToInProgress(order: ServiceOrder, actor: AppUser) {
  await changeWorkflowStatus(order, actor, "in_progress", "OS movida para em andamento.");
}

export async function submitOrderForReview(order: ServiceOrder, actor: AppUser) {
  await changeWorkflowStatus(
    order,
    actor,
    "in_review",
    "OS enviada para validacao do administrador.",
    {
      previousWorkflowStatus: order.workflowStatus
    }
  );
}

export async function approveOrder(order: ServiceOrder, actor: AppUser) {
  await changeWorkflowStatus(order, actor, "completed", "OS aprovada e movida para o historico.", {
    previousWorkflowStatus: order.workflowStatus,
    reviewedAt: new Date().toISOString()
  });
}

export async function rejectOrder(order: ServiceOrder, actor: AppUser) {
  const fallbackStatus = order.previousWorkflowStatus ?? "pending";
  await changeWorkflowStatus(
    order,
    actor,
    fallbackStatus,
    "OS reprovada e devolvida para ajuste do colaborador.",
    {
      previousWorkflowStatus: null,
      reviewedAt: undefined
    }
  );
}

export async function login(email: string, password: string) {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const role = (data.user.user_metadata.role as UserRole | undefined) ?? "technician";
    const appUser: AppUser = {
      id: data.user.id,
      name:
        (data.user.user_metadata.name as string | undefined) ??
        data.user.email?.split("@")[0] ??
        "Usuario",
      email: data.user.email ?? email,
      role,
      password: ""
    };

    writeStorage(SESSION_KEY, appUser);
    return appUser;
  }

  const users = getStoredUsers();
  const user = users.find(
    (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
  );

  if (!user) {
    throw new Error("Credenciais invalidas.");
  }

  writeStorage(SESSION_KEY, user);
  return user;
}

export async function logout() {
  if (hasSupabaseEnv && supabase) {
    await supabase.auth.signOut();
  }

  writeStorage<AppUser | null>(SESSION_KEY, null);
}

export async function getSessionUser() {
  if (hasSupabaseEnv && supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      name: (user.user_metadata.name as string | undefined) ?? "Usuario",
      email: user.email ?? "",
      role: (user.user_metadata.role as UserRole | undefined) ?? "technician",
      password: ""
    } satisfies AppUser;
  }

  return readStorage<AppUser | null>(SESSION_KEY, null);
}

export async function getChapels() {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from("chapels")
      .select("id, name, region")
      .order("name");

    if (error) throw error;
    return data as Chapel[];
  }

  if (hasGoogleSheetsEnv) {
    const orders = await getBaseOrdersFromGoogleSheets();
    const unique = new Map<string, Chapel>();

    for (const order of orders) {
      if (!unique.has(order.chapelId)) {
        unique.set(order.chapelId, {
          id: order.chapelId,
          name: order.chapelName,
          region: "Importado da planilha"
        });
      }
    }

    return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  return mockChapels;
}

export async function getOrders() {
  const [baseOrders, metadata] = await Promise.all([getBaseOrders(), getSupplementalOrderMetadata()]);

  return mergeOrdersWithMetadata(baseOrders, metadata).sort((left, right) =>
    left.dueDate.localeCompare(right.dueDate)
  );
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  if (hasSupabaseEnv && supabase) {
    throw new Error(
      "Criacao de usuario via Supabase deve ser feita por Edge Function ou backend seguro."
    );
  }

  const users = getStoredUsers();
  const exists = users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase());

  if (exists) {
    throw new Error("Ja existe um usuario com esse e-mail.");
  }

  const newUser: AppUser = {
    id: crypto.randomUUID(),
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: payload.role
  };

  saveStoredUsers([...users, newUser]);
  return newUser;
}

export async function listUsers() {
  if (hasSupabaseEnv && supabase) {
    return [];
  }

  return getStoredUsers();
}
