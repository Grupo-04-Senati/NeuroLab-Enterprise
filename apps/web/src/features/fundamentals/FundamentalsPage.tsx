import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { familyMeta } from '@/lib/nav';
import type { NetworkFamily } from '@/types/domain';
import { Panel } from '@/components/ui/Panel';
import { Chip } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CONCEPTS } from '@/features/fundamentals/content';
import { NeuronDiagram } from '@/features/fundamentals/NeuronDiagram';
import { LayerAnatomy } from '@/features/fundamentals/LayerAnatomy';
import { ActivationExplorer } from '@/features/fundamentals/ActivationExplorer';
import { NeuronCalculator } from '@/features/fundamentals/NeuronCalculator';
import { GlossaryPanel } from '@/features/fundamentals/GlossaryPanel';

type SectionId = 'concepto' | 'anatomia' | 'activaciones' | 'ejemplo' | 'glosario';

const SECTIONS: Array<{ id: SectionId; label: string; icon: IconName }> = [
  { id: 'concepto', label: 'Concepto', icon: 'info' },
  { id: 'anatomia', label: 'Neurona y capas', icon: 'neuron' },
  { id: 'activaciones', label: 'Activaciones', icon: 'zap' },
  { id: 'ejemplo', label: 'Ejemplo guiado', icon: 'metrics' },
  { id: 'glosario', label: 'Glosario', icon: 'report' },
];

const EVIDENCE: Array<{ operation: string; section: string; evidence: string }> = [
  {
    operation: 'Definir la red neuronal y su importancia en IA',
    section: 'Conceptos de red neuronal',
    evidence: 'Ficha conceptual consultable',
  },
  {
    operation: 'Describir su estructura: neuronas, capas y conexiones',
    section: 'Diagrama de neurona y pila de capas',
    evidence: 'Estructura explorada parte por parte',
  },
  {
    operation: 'Identificar pesos, sesgos y funciones de activación',
    section: 'Explorador de activaciones y ejemplo guiado',
    evidence: 'Salida calculada y verificable paso a paso',
  },
  {
    operation: 'Reconocer familias de red antes de modelar',
    section: 'Ficha rápida y glosario',
    evidence: 'Tipo elegido con justificación en M04',
  },
];

const FAMILIES: NetworkFamily[] = ['FEEDFORWARD', 'RNN', 'CNN', 'GAN'];

const FAMILY_NOTE: Record<NetworkFamily, string> = {
  FEEDFORWARD: 'Capas densas sobre variables tabulares ya codificadas.',
  RNN: 'Secuencias donde el orden de las muestras importa.',
  CNN: 'Mallas de píxeles con patrones locales repetidos.',
  GAN: 'Generador y discriminador compitiendo sobre la distribución.',
};

function isSectionId(value: string): value is SectionId {
  return SECTIONS.some((section) => section.id === value);
}

function readHash(): SectionId {
  const hash = window.location.hash.replace('#', '');
  return isSectionId(hash) ? hash : 'concepto';
}

function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'concepto':
      return (
        <Panel
          id="concepto"
          title="Conceptos de red neuronal"
          subtitle="Definición, importancia en IA y el ciclo con el que la red aprende de los datos."
          icon="info"
        >
          <div className="fund-concepts">
            {CONCEPTS.map((concept) => (
              <article key={concept.id} className="fund-concept">
                <h3>{concept.title}</h3>
                <p>{concept.lead}</p>
                <ul>
                  {concept.points.map((point) => (
                    <li key={point}>
                      <Icon name="point" size={13} strokeWidth={2.4} />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Panel>
      );
    case 'anatomia':
      return (
        <Panel
          id="anatomia"
          title="Neuronas, capas y conexiones"
          subtitle="Consulte cada parte de la neurona y después la pila completa: la estructura es lo que el constructor del M04 validará."
          icon="neuron"
        >
          <h3 className="fund-block__title">La neurona artificial</h3>
          <NeuronDiagram />
          <h3 className="fund-block__title">Capas y conexiones</h3>
          <LayerAnatomy />
        </Panel>
      );
    case 'activaciones':
      return (
        <Panel
          id="activaciones"
          title="Funciones de activación"
          subtitle="La no linealidad es lo que permite que varias capas representen fronteras de decisión complejas."
          icon="zap"
        >
          <ActivationExplorer />
        </Panel>
      );
    case 'ejemplo':
      return (
        <Panel
          id="ejemplo"
          title="Ejemplo guiado: salida de una neurona"
          subtitle="Mueva las entradas y los pesos para ver cómo se propagan los valores hasta la activación."
          icon="metrics"
          actions={<Chip tone="outline">Verificable a mano</Chip>}
        >
          <NeuronCalculator />
        </Panel>
      );
    case 'glosario':
      return (
        <Panel
          id="glosario"
          title="Glosario de la Semana 11"
          subtitle="Ficha conceptual consultable: busque un término o filtre por su papel dentro de la red."
          icon="report"
        >
          <GlossaryPanel />
        </Panel>
      );
  }
}

export function FundamentalsPage() {
  const [active, setActive] = useState<SectionId>(readHash);
  const tabRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});

  const select = (id: SectionId) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  useEffect(() => {
    tabRefs.current[active]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = SECTIONS.findIndex((section) => section.id === active);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (current + 1) % SECTIONS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (current - 1 + SECTIONS.length) % SECTIONS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = SECTIONS.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const next = SECTIONS[nextIndex];
    select(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="neuron" size={14} strokeWidth={2} />
            M03 · Fundamentos neuronales
          </p>
          <h1 className="page-head__title">Anatomía de una red neuronal artificial</h1>
          <p className="page-head__lede">
            Base conceptual de la Semana 11: qué es una red y por qué importa, cómo se organizan sus
            neuronas, capas y conexiones, y qué hacen los pesos, los sesgos y las activaciones antes
            de configurar una arquitectura en el M04.
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/architectures" className="btn btn--primary">
            <Icon name="layers" size={16} />
            Diseñar una arquitectura
          </Link>
          <Link to="/" className="btn btn--secondary">
            <Icon name="dashboard" size={16} />
            Volver al panel
          </Link>
        </div>
      </div>

      <div className="fund-tabs" role="tablist" aria-label="Secciones del módulo">
        {SECTIONS.map((section) => {
          const selected = active === section.id;
          return (
            <button
              key={section.id}
              ref={(node) => {
                tabRefs.current[section.id] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${section.id}`}
              className="fund-tabs__tab"
              aria-selected={selected}
              aria-controls={`panel-${section.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(section.id)}
              onKeyDown={handleTabKey}
            >
              <Icon name={section.icon} size={15} />
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="dash">
        <div className="dash__main">
          <div className="dash__col">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={`panel-${section.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${section.id}`}
                tabIndex={0}
                hidden={active !== section.id}
                className="fund-tabpanel"
              >
                <SectionContent id={section.id} />
              </section>
            ))}
          </div>

          <div className="dash__col">
            <Panel title="Ficha rápida" subtitle="Lo que toda arquitectura del M04 debe respetar." icon="model">
              <p className="fund-formula">
                <span className="u-mono">z = Σ wᵢx + b</span>
                <span className="u-mono">a = f(z)</span>
              </p>
              <p className="panel__note">
                Cada capa multiplica sus entradas por un tensor de pesos, suma un sesgo por neurona y
                aplica una activación. Apilar capas sin no linealidad equivaldría a una sola
                transformación lineal.
              </p>
            </Panel>

            <Panel title="Familias reconocibles" subtitle="El punto de partida del selector de arquitecturas." icon="layers">
              <ul className="fund-families">
                {FAMILIES.map((family) => (
                  <li key={family}>
                    <span className="fund-families__glyph" aria-hidden="true">
                      {familyMeta[family].glyph}
                    </span>
                    <span>
                      <strong>{familyMeta[family].label}</strong>
                      <em>{FAMILY_NOTE[family]}</em>
                    </span>
                  </li>
                ))}
              </ul>
              <Link to="/architectures" className="btn btn--secondary btn--sm" style={{ marginTop: 'var(--sp-4)' }}>
                <Icon name="arrowRight" size={14} />
                Abrir el constructor validado
              </Link>
            </Panel>

            <Panel title="Dependencias del módulo" icon="server">
              <p className="panel__note">
                El módulo es contenido estático del cliente: no consume la API ni ejecuta TensorFlow en
                el navegador. Las cifras que se calculan aquí son aritmética de una neurona con fines
                didácticos (RN-03); el entrenamiento real ocurre en <code>workers/training</code>.
              </p>
            </Panel>
          </div>
        </div>

        <Panel
          title="Evidencia curricular"
          subtitle="Correspondencia entre los descriptores de la Semana 11 y las secciones de este módulo (§3 del Documento Maestro)."
          icon="checkCircle"
          body="tight"
        >
          <div className="table-wrap">
            <table className="table fund-evidence">
              <caption className="u-sr-only">
                Operaciones de aprendizaje de la Semana 11 con su sección del módulo y la evidencia generada
              </caption>
              <thead>
                <tr>
                  <th scope="col">Operación / contenido</th>
                  <th scope="col">Sección del módulo</th>
                  <th scope="col" className="is-right">
                    Evidencia verificable
                  </th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE.map((row) => (
                  <tr key={row.operation}>
                    <td data-label="Operación">{row.operation}</td>
                    <td data-label="Sección">{row.section}</td>
                    <td data-label="Evidencia" className="fund-evidence__value">
                      {row.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
