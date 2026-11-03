import type { DatasetRecord } from '@/types/dataset';
import { formatRelativeTime } from '@/lib/format';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { DATASET_FILTERS, formatBytes, formatRows, type DatasetFilter } from '@/features/datasets/model';
import { DatasetStatusChip } from '@/features/datasets/DatasetStatusChip';
import { SplitBar } from '@/features/datasets/SplitBar';

interface DatasetCatalogProps {
  datasets: DatasetRecord[];
  total: number;
  selectedId: string | null;
  filter: DatasetFilter;
  counts: Record<DatasetFilter, number>;
  term: string;
  onSelect: (id: string) => void;
  onFilter: (filter: DatasetFilter) => void;
  onTerm: (term: string) => void;
}

export function DatasetCatalog({
  datasets,
  total,
  selectedId,
  filter,
  counts,
  term,
  onSelect,
  onFilter,
  onTerm,
}: DatasetCatalogProps) {
  return (
    <Panel
      title="Catálogo de datasets"
      subtitle="Metadatos, versión vigente y particiones declaradas por registro."
      icon="dataset"
      body="tight"
      actions={<span className="u-caps">{datasets.length} de {total}</span>}
      footer={
        <>
          <span>
            {datasets.length === 0
              ? 'Ningún dataset coincide con la búsqueda'
              : `${datasets.length} ${datasets.length === 1 ? 'dataset visible' : 'datasets visibles'} · metadatos sincronizados con la API`}
          </span>
          <a href="/admin">Política de retención</a>
        </>
      }
    >
      <div className="ds-toolbar">
        <div className="filters" role="group" aria-label="Filtrar datasets por estado">
          {DATASET_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="filter-btn"
              aria-pressed={filter === option.id}
              onClick={() => onFilter(option.id)}
            >
              {option.label}
              <span className="filter-btn__count">{counts[option.id]}</span>
            </button>
          ))}
        </div>
        <label className="search ds-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={term}
            placeholder="Buscar dataset, etiqueta o proyecto"
            aria-label="Buscar datasets"
            onChange={(event) => onTerm(event.target.value)}
          />
        </label>
      </div>

      <div className="table-wrap">
        {datasets.length === 0 ? (
          <div className="empty">
            <Icon name="search" />
            <h3>Sin resultados para este filtro</h3>
            <p>Ajusta la búsqueda o selecciona otro estado para volver a ver datasets.</p>
          </div>
        ) : (
          <table className="table ds-table">
            <caption className="u-sr-only">
              Datasets registrados con su proyecto, particiones, tamaño, estado y fecha de actualización
            </caption>
            <thead>
              <tr>
                <th scope="col">Dataset</th>
                <th scope="col">Proyecto</th>
                <th scope="col">Particiones</th>
                <th scope="col">Filas</th>
                <th scope="col">Tamaño</th>
                <th scope="col">Estado</th>
                <th scope="col" className="is-right">
                  Actualizado
                </th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => {
                const selected = dataset.id === selectedId;
                return (
                  <tr
                    key={dataset.id}
                    className={selected ? 'is-selected' : undefined}
                    onClick={() => onSelect(dataset.id)}
                  >
                    <td data-col="name" data-label="Dataset">
                      <button
                        type="button"
                        className="ds-row-name"
                        aria-pressed={selected}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(dataset.id);
                        }}
                      >
                        <strong>{dataset.name}</strong>
                        <span>
                          {dataset.id} · v{dataset.currentVersion} · {dataset.format}
                        </span>
                      </button>
                    </td>
                    <td data-label="Proyecto">
                      <span className="table__name">
                        <strong>{dataset.project}</strong>
                        <span className="table__sub">{dataset.owner}</span>
                      </span>
                    </td>
                    <td data-label="Particiones">
                      <span className="ds-split-cell">
                        <SplitBar split={dataset.split} />
                        <span>
                          {dataset.split.train} / {dataset.split.validation} / {dataset.split.test}
                        </span>
                      </span>
                    </td>
                    <td data-label="Filas" data-numeric>
                      {formatRows(dataset.rows)}
                    </td>
                    <td data-label="Tamaño" data-numeric>
                      {formatBytes(dataset.sizeBytes)}
                    </td>
                    <td data-label="Estado">
                      <DatasetStatusChip status={dataset.status} />
                    </td>
                    <td data-col="meta" data-label="Actualizado" className="is-right" data-numeric>
                      {formatRelativeTime(dataset.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
