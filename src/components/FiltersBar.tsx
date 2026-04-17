import type { Chapel, DueStatus, FiltersState, WorkflowStatus } from "../types";

interface FiltersBarProps {
  chapels: Chapel[];
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
}

const dueStatusOptions: Array<{ value: FiltersState["dueStatus"]; label: string }> = [
  { value: "all", label: "Todos os prazos" },
  { value: "overdue", label: "Atrasado" },
  { value: "due_soon", label: "Proximo" },
  { value: "on_track", label: "Em dia" }
];

const workflowStatusOptions: Array<{
  value: FiltersState["workflowStatus"];
  label: string;
}> = [
  { value: "all", label: "Todos os fluxos" },
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "in_review", label: "Em analise" },
  { value: "completed", label: "Concluida" }
];

export function FiltersBar({ chapels, filters, onChange }: FiltersBarProps) {
  const update = (patch: Partial<FiltersState>) => {
    onChange({ ...filters, ...patch });
  };

  const toggleChapel = (chapelId: string) => {
    const exists = filters.chapelIds.includes(chapelId);
    const next = exists
      ? filters.chapelIds.filter((item) => item !== chapelId)
      : [...filters.chapelIds, chapelId];

    update({ chapelIds: next });
  };

  const resetFilters = () =>
    onChange({
      search: "",
      chapelIds: [],
      dueStatus: "all",
      workflowStatus: "all",
      dateFrom: "",
      dateTo: "",
      groupedByChapel: filters.groupedByChapel,
      showCompleted: false
    });

  return (
    <section className="filters-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Leitura rapida da operacao</h2>
        </div>
      </div>

      <div className="filters-layout">
        <label className="field field-search">
          <span>Busca</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Capela, assunto ou descricao"
          />
        </label>

        <div className="field-group">
          <div className="field-copy">
            <p className="field-label">Fluxo da OS</p>
            <p className="field-helper">Controle o funil operacional e a validacao.</p>
          </div>
          <div className="chip-set">
            {workflowStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filters.workflowStatus === option.value ? "chip chip-active" : "chip"}
                onClick={() =>
                  update({ workflowStatus: option.value as "all" | WorkflowStatus })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <div className="field-copy">
            <p className="field-label">Saude do prazo</p>
            <p className="field-helper">Destaque por vencimento sem misturar com o fluxo.</p>
          </div>
          <div className="chip-set">
            {dueStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filters.dueStatus === option.value ? "chip chip-active" : "chip"}
                onClick={() => update({ dueStatus: option.value as "all" | DueStatus })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filters-grid">
          <label className="field">
            <span>Data inicial</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => update({ dateFrom: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Data final</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => update({ dateTo: event.target.value })}
            />
          </label>
        </div>

        <div className="field-group">
          <div className="field-copy">
            <p className="field-label">Capelas</p>
            <p className="field-helper">Multi-selecao com foco em atendimento mobile.</p>
          </div>

          <div className="chip-set">
            <button
              type="button"
              className={filters.chapelIds.length === 0 ? "chip chip-active" : "chip"}
              onClick={() => update({ chapelIds: [] })}
            >
              Todas
            </button>

            {chapels.map((chapel) => (
              <button
                key={chapel.id}
                type="button"
                className={
                  filters.chapelIds.includes(chapel.id) ? "chip chip-active" : "chip"
                }
                onClick={() => toggleChapel(chapel.id)}
              >
                {chapel.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="filters-actions">
        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.groupedByChapel}
            onChange={(event) => update({ groupedByChapel: event.target.checked })}
          />
          <span>Agrupar por capela</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.showCompleted}
            onChange={(event) => update({ showCompleted: event.target.checked })}
          />
          <span>Incluir historico</span>
        </label>

        <button type="button" className="ghost-button" onClick={resetFilters}>
          Limpar filtros
        </button>
      </div>
    </section>
  );
}
