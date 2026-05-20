import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AdminUsersPanel } from "./components/AdminUsersPanel";
import { AppSkeleton } from "./components/AppSkeleton";
import { FiltersBar } from "./components/FiltersBar";
import { LoginScreen } from "./components/LoginScreen";
import { OrderDetailsDrawer } from "./components/OrderDetailsDrawer";
import { OrdersSection } from "./components/OrdersSection";
import {
  approveOrder,
  createUser,
  getChapels,
  getOrders,
  getSessionUser,
  listUsers,
  login,
  logout,
  moveOrderToInProgress,
  rejectOrder,
  submitOrderForReview,
  uploadOrderImages
} from "./services/backend";
import type { AppUser, Chapel, FiltersState, ServiceOrder } from "./types";

const initialFilters: FiltersState = {
  search: "",
  chapelIds: [],
  dueStatus: "all",
  workflowStatus: "all",
  dateFrom: "",
  dateTo: "",
  groupedByChapel: false,
  showCompleted: false
};

function App() {
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [chapels, setChapels] = useState<Chapel[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const [loginError, setLoginError] = useState("");
  const [screenError, setScreenError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const deferredFilters = useDeferredValue(filters);

  async function loadDashboard() {
    const [user, chapelRows, orderRows, userRows] = await Promise.all([
      getSessionUser(),
      getChapels(),
      getOrders(),
      listUsers()
    ]);

    startTransition(() => {
      setSessionUser(user);
      setChapels(chapelRows);
      setOrders(orderRows);
      setUsers(userRows);
    });
  }

  async function refreshOrders() {
    const [chapelRows, orderRows] = await Promise.all([getChapels(), getOrders()]);

    startTransition(() => {
      setChapels(chapelRows);
      setOrders(orderRows);
    });
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadDashboard();
      } catch (error) {
        setScreenError(error instanceof Error ? error.message : "Falha ao carregar o sistema.");
      } finally {
        setIsBooting(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;

    const exists = orders.some((order) => order.id === selectedOrderId);
    if (!exists) {
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!feedbackMessage) return;

    const timeout = window.setTimeout(() => setFeedbackMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [feedbackMessage]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const searchTerm = deferredFilters.search.trim().toLowerCase();
        const matchesSearch =
          !searchTerm ||
          order.chapelName.toLowerCase().includes(searchTerm) ||
          order.subject.toLowerCase().includes(searchTerm) ||
          order.description.toLowerCase().includes(searchTerm);

        const matchesChapel =
          deferredFilters.chapelIds.length === 0 ||
          deferredFilters.chapelIds.includes(order.chapelId);

        const matchesDueStatus =
          deferredFilters.dueStatus === "all" || deferredFilters.dueStatus === order.dueStatus;

        const matchesWorkflow =
          deferredFilters.workflowStatus === "all" ||
          deferredFilters.workflowStatus === order.workflowStatus;

        const matchesDateFrom =
          !deferredFilters.dateFrom || order.dueDate >= deferredFilters.dateFrom;
        const matchesDateTo = !deferredFilters.dateTo || order.dueDate <= deferredFilters.dateTo;
        const matchesCompleted =
          deferredFilters.showCompleted || order.workflowStatus !== "completed";

        return (
          matchesSearch &&
          matchesChapel &&
          matchesDueStatus &&
          matchesWorkflow &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesCompleted
        );
      })
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [deferredFilters, orders]);

  const reviewOrders = useMemo(
    () => visibleOrders.filter((order) => order.workflowStatus === "in_review"),
    [visibleOrders]
  );

  const activeOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      if (order.workflowStatus === "completed") return false;
      if (sessionUser?.role === "admin") {
        return order.workflowStatus !== "in_review";
      }
      return true;
    });
  }, [sessionUser?.role, visibleOrders]);

  const historyOrders = useMemo(
    () => visibleOrders.filter((order) => order.workflowStatus === "completed"),
    [visibleOrders]
  );

  const overview = useMemo(
    () => ({
      active: orders.filter((order) => order.workflowStatus !== "completed").length,
      late: orders.filter((order) => order.dueStatus === "overdue").length,
      review: orders.filter((order) => order.workflowStatus === "in_review").length,
      completed: orders.filter((order) => order.workflowStatus === "completed").length
    }),
    [orders]
  );

  async function runOrderAction(label: string, successMessage: string, action: () => Promise<void>) {
    try {
      setScreenError("");
      setActionLabel(label);
      setIsActing(true);
      await action();
      await refreshOrders();
      setFeedbackMessage(successMessage);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Falha ao atualizar a OS.");
    } finally {
      setIsActing(false);
      setActionLabel("");
    }
  }

  if (isBooting) {
    return <AppSkeleton />;
  }

  if (!sessionUser) {
    return (
      <LoginScreen
        isLoading={isLoggingIn}
        error={loginError}
        onSubmit={async (email, password) => {
          try {
            setIsLoggingIn(true);
            setLoginError("");
            const user = await login(email, password);
            startTransition(() => setSessionUser(user));
            setUsers(await listUsers());
          } catch (error) {
            setLoginError(error instanceof Error ? error.message : "Falha ao autenticar.");
          } finally {
            setIsLoggingIn(false);
          }
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operacao em campo</p>
            <h1>OrdemFacil Pro</h1>
            <p className="topbar-copy">
              Fluxo completo de OS com validacao, imagens e leitura rapida em campo.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="user-badge">
              <strong>{sessionUser.name}</strong>
              <span>{sessionUser.role === "admin" ? "Administrador" : "Colaborador"}</span>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={async () => {
                await logout();
                setSessionUser(null);
                setSelectedOrderId(null);
              }}
            >
              Sair
            </button>
          </div>
        </header>
      </div>

      <main className="app-content">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Painel mobile-first</p>
            <h2>Operacao com cara de app, fluidez de web e aprovacao em duas etapas</h2>
            <p>
              A planilha continua como base das OS, enquanto workflow, historico e imagens ficam
              desacoplados para uma evolucao segura e escalavel.
            </p>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span>OS ativas</span>
              <strong>{overview.active}</strong>
            </article>
            <article className="stat-card">
              <span>Em analise</span>
              <strong>{overview.review}</strong>
            </article>
            <article className="stat-card">
              <span>Atrasadas</span>
              <strong>{overview.late}</strong>
            </article>
            <article className="stat-card">
              <span>Historico</span>
              <strong>{overview.completed}</strong>
            </article>
          </div>
        </section>

        <FiltersBar chapels={chapels} filters={filters} onChange={setFilters} />

        {feedbackMessage ? <div className="banner-success">{feedbackMessage}</div> : null}
        {screenError ? <div className="banner-error">{screenError}</div> : null}

        <OrdersSection
          eyebrow="Fila principal"
          title={sessionUser.role === "admin" ? "OS em execucao" : "Ordens sob sua operacao"}
          description={
            sessionUser.role === "admin"
              ? "Acompanhe tudo o que ainda nao entrou em validacao final."
              : "Veja, abra e atualize suas OS com toque rapido e leitura objetiva."
          }
          orders={activeOrders}
          grouped={filters.groupedByChapel}
          onOpen={(order) => setSelectedOrderId(order.id)}
          emptyTitle="Nenhuma OS encontrada"
          emptyDescription="Ajuste os filtros para localizar ordens de servico especificas."
        />

        {sessionUser.role === "admin" ? (
          <OrdersSection
            eyebrow="Validacao"
            title="OS aguardando aprovacao"
            description="Tudo o que foi marcado como concluido pelo colaborador aparece aqui."
            orders={reviewOrders}
            grouped={filters.groupedByChapel}
            onOpen={(order) => setSelectedOrderId(order.id)}
            emptyTitle="Fila de aprovacao vazia"
            emptyDescription="Nenhuma OS esta aguardando revisao neste momento."
          />
        ) : null}

        {filters.showCompleted || deferredFilters.workflowStatus === "completed" ? (
          <OrdersSection
            eyebrow="Historico"
            title="OS concluidas"
            description="Registro final das OS aprovadas e retiradas da fila principal."
            orders={historyOrders}
            grouped={filters.groupedByChapel}
            onOpen={(order) => setSelectedOrderId(order.id)}
            emptyTitle="Nenhuma OS no historico"
            emptyDescription="As OS aprovadas pelo administrador apareceram aqui."
          />
        ) : null}

        {sessionUser.role === "admin" ? (
          <AdminUsersPanel
            users={users}
            onCreateUser={async (payload) => {
              await createUser(payload);
              setUsers(await listUsers());
              setFeedbackMessage("Usuario criado com sucesso.");
            }}
          />
        ) : null}
      </main>

      <OrderDetailsDrawer
        order={selectedOrder}
        userRole={sessionUser.role}
        isBusy={isActing}
        busyLabel={actionLabel}
        onClose={() => setSelectedOrderId(null)}
        onStartOrder={(order) =>
          runOrderAction("Atualizando status...", "OS movida para em andamento.", () =>
            moveOrderToInProgress(order, sessionUser)
          )
        }
        onSubmitForReview={(order) =>
          runOrderAction("Enviando para analise...", "OS enviada para aprovacao do administrador.", () =>
            submitOrderForReview(order, sessionUser)
          )
        }
        onApprove={(order) =>
          runOrderAction("Aprovando OS...", "OS aprovada e movida para o historico.", () =>
            approveOrder(order, sessionUser)
          )
        }
        onReject={(order) =>
          runOrderAction("Reprovando OS...", "OS devolvida para ajuste do colaborador.", () =>
            rejectOrder(order, sessionUser)
          )
        }
        onUploadImages={(order, files) =>
          runOrderAction("Enviando imagens...", "Imagens adicionadas com sucesso.", () =>
            uploadOrderImages(order, files, sessionUser)
          )
        }
      />
    </div>
  );
}

export default App;
