import { useMemo, useState } from 'react';
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryTerm } from '@/features/fundamentals/content';
import { Icon } from '@/components/ui/Icon';

type CategoryFilter = 'Todas' | (typeof GLOSSARY_CATEGORIES)[number];

const FILTERS: CategoryFilter[] = ['Todas', ...GLOSSARY_CATEGORIES];

function matches(term: GlossaryTerm, query: string): boolean {
  if (!query) return true;
  const haystack = `${term.term} ${term.definition} ${term.category} ${term.related.join(' ')}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/** Ficha conceptual consultable exigida por la operación de la Semana 11. */
export function GlossaryPanel() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todas');

  const terms = useMemo(
    () =>
      GLOSSARY.filter(
        (term) => (category === 'Todas' || term.category === category) && matches(term, query),
      ),
    [query, category],
  );

  return (
    <div className="fund-glossary">
      <div className="fund-glossary__toolbar">
        <div className="filters" role="group" aria-label="Filtrar glosario por categoría">
          {FILTERS.map((item) => {
            const count =
              item === 'Todas'
                ? GLOSSARY.length
                : GLOSSARY.filter((term) => term.category === item).length;
            return (
              <button
                key={item}
                type="button"
                className="filter-btn"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
                <span className="filter-btn__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="search fund-glossary__search">
          <Icon name="search" size={16} />
          <label className="u-sr-only" htmlFor="fund-glossary-search">
            Buscar en el glosario
          </label>
          <input
            id="fund-glossary-search"
            type="search"
            placeholder="Buscar concepto, peso, activación…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {terms.length === 0 ? (
        <div className="empty">
          <Icon name="search" />
          <h3>Ningún concepto coincide</h3>
          <p>Pruebe con otro término o seleccione la categoría «Todas» para revisar el glosario completo.</p>
        </div>
      ) : (
        <dl className="fund-terms">
          {terms.map((term) => (
            <div key={term.term} className="fund-term">
              <dt>
                {term.term}
                <span className="fund-term__cat">{term.category}</span>
              </dt>
              <dd>{term.definition}</dd>
              {term.related.length ? (
                <dd className="fund-term__rel">
                  <span className="u-caps">Relacionado con</span> {term.related.join(' · ')}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      )}

      <p className="fund-glossary__meta">
        {terms.length} de {GLOSSARY.length} conceptos visibles
        {query ? ` para «${query}»` : ''}.
      </p>
    </div>
  );
}
