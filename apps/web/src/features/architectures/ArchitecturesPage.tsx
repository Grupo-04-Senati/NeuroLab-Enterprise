import { useEffect, useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import type { NetworkFamily } from '@/types/domain';
import { GraphCanvas } from '@/features/architectures/GraphCanvas';
import { InputPanel, LayerPanel } from '@/features/architectures/LayerPanel';
import { PropertiesPanel } from '@/features/architectures/PropertiesPanel';
import { SummaryPanel } from '@/features/architectures/SummaryPanel';
import {
  ARCHITECTURE_DRAFT_KEY,
  FAMILIES,
  computeArchitecture,
  createConnectionId,
  createLayer,
  createTemplate,
  familyById,
  formatParams,
  loadDraft,
  type ArchitectureConfig,
  type InputConfig,
  type LayerConfig,
  type LayerType,
  type NeuronConnection,
  type NeuronRef,
} from '@/features/architectures/model';

type NoticeTone = 'success' | 'error' | 'info';

interface Notice {
  tone: NoticeTone;
  text: string;
}

export function ArchitecturesPage() {
  const [config, setConfig] = useState<ArchitectureConfig>(
    () => loadDraft() ?? createTemplate('FEEDFORWARD'),
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'connect'>('connect');
  const [pendingSource, setPendingSource] = useState<NeuronRef | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const computation = useMemo(() => computeArchitecture(config), [config]);
  const errorCount = computation.issues.filter((issue) => issue.severity === 'error').length;
  const selectedIndex = config.layers.findIndex((layer) => layer.id === selectedLayerId);
  const selectedLayer = selectedIndex >= 0 ? config.layers[selectedIndex] : null;
  const selectedResult = selectedIndex >= 0 ? computation.results[selectedIndex] : undefined;
  const family = familyById[config.family];

  useEffect(() => {
    if (!pendingSource) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingSource(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingSource]);

  const selectFamily = (nextFamily: NetworkFamily) => {
    setConfig(createTemplate(nextFamily));
    setSelectedLayerId(null);
    setPendingSource(null);
    setMode('connect');
    setNotice({
      tone: 'info',
      text: `Plantilla ${familyById[nextFamily].label} cargada con sus capas predeterminadas.`,
    });
  };

  const changeMode = (nextMode: 'select' | 'connect') => {
    setMode(nextMode);
    setPendingSource(null);
  };

  const addLayer = (type: LayerType) => {
    const layer = createLayer(type);
    setConfig((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
    setSelectedLayerId(layer.id);
    setPendingSource(null);
    setNotice(null);
  };

  const patchLayer = (id: string, patch: Partial<LayerConfig>) => {
    setConfig((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    }));
    setPendingSource(null);
    setNotice(null);
  };

  const removeLayer = (id: string) => {
    setConfig((prev) => {
      const index = prev.layers.findIndex((layer) => layer.id === id);
      if (index < 0) return prev;
      const layers = prev.layers.filter((layer) => layer.id !== id);
      const shift = (value: number) => (value > index ? value - 1 : value);
      const connections = prev.connections
        .filter((connection) => connection.from.layer !== index && connection.to.layer !== index)
        .map((connection) => ({
          ...connection,
          from: { ...connection.from, layer: shift(connection.from.layer) },
          to: { ...connection.to, layer: shift(connection.to.layer) },
        }));
      return { ...prev, layers, connections };
    });
    setSelectedLayerId((prev) => (prev === id ? null : prev));
    setPendingSource(null);
    setNotice(null);
  };

  const moveLayer = (id: string, direction: -1 | 1) => {
    setConfig((prev) => {
      const index = prev.layers.findIndex((layer) => layer.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.layers.length) return prev;
      const layers = [...prev.layers];
      [layers[index], layers[target]] = [layers[target], layers[index]];
      const remap = (value: number) =>
        value === index ? target : value === target ? index : value;
      const connections = prev.connections.map((connection) => ({
        ...connection,
        from: { ...connection.from, layer: remap(connection.from.layer) },
        to: { ...connection.to, layer: remap(connection.to.layer) },
      }));
      return { ...prev, layers, connections };
    });
    setPendingSource(null);
    setNotice(null);
  };

  const patchInput = (key: keyof InputConfig, value: number) => {
    setConfig((prev) => ({ ...prev, input: { ...prev.input, [key]: value } }));
    setNotice(null);
  };

  const handleNeuronClick = (layerIndex: number, neuron: number) => {
    setSelectedLayerId(config.layers[layerIndex]?.id ?? null);

    if (mode === 'select') return;

    if (!pendingSource) {
      setPendingSource({ layer: layerIndex, neuron });
      return;
    }

    if (pendingSource.layer === layerIndex) {
      setPendingSource(
        pendingSource.neuron === neuron ? null : { layer: layerIndex, neuron },
      );
      return;
    }

    if (Math.abs(pendingSource.layer - layerIndex) !== 1) {
      setNotice({
        tone: 'error',
        text: 'Solo puedes conectar neuronas de capas adyacentes. Elige una neurona en la capa vecina.',
      });
      return;
    }

    const duplicate = computation.connections.some(
      (connection) =>
        (connection.from.layer === pendingSource.layer &&
          connection.from.neuron === pendingSource.neuron &&
          connection.to.layer === layerIndex &&
          connection.to.neuron === neuron) ||
        (connection.to.layer === pendingSource.layer &&
          connection.to.neuron === pendingSource.neuron &&
          connection.from.layer === layerIndex &&
          connection.from.neuron === neuron),
    );

    if (duplicate) {
      setNotice({ tone: 'info', text: 'Esa conexión ya existe en el grafo.' });
      setPendingSource(null);
      return;
    }

    const connection: NeuronConnection = {
      id: createConnectionId(),
      from: pendingSource,
      to: { layer: layerIndex, neuron },
    };
    setConfig((prev) => ({ ...prev, connections: [...prev.connections, connection] }));
    setPendingSource(null);
    setNotice({
      tone: 'success',
      text: `Conexión creada: capa ${pendingSource.layer + 1} · neurona ${
        pendingSource.neuron + 1
      } → capa ${layerIndex + 1} · neurona ${neuron + 1}.`,
    });
  };

  const removeConnection = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      connections: prev.connections.filter((connection) => connection.id !== id),
    }));
    setNotice({ tone: 'info', text: 'Conexión eliminada del grafo.' });
  };

  const resetTemplate = () => {
    setConfig(createTemplate(config.family));
    setSelectedLayerId(null);
    setPendingSource(null);
    setNotice({ tone: 'info', text: 'Plantilla restablecida con sus valores por defecto.' });
  };

  const saveArchitecture = () => {
    if (errorCount > 0) {
      setNotice({
        tone: 'error',
        text: 'Corrige los errores de validación antes de guardar la arquitectura.',
      });
      return;
    }
    const payload = {
      ...config,
      connections: computation.connections,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(ARCHITECTURE_DRAFT_KEY, JSON.stringify(payload));
      setNotice({
        tone: 'success',
        text: `«${config.name}» validada y guardada como borrador local.`,
      });
    } catch {
      setNotice({
        tone: 'error',
        text: 'No fue posible guardar el borrador en este navegador.',
      });
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <p className="page-head__eyebrow">
            <Icon name="layers" size={14} strokeWidth={2} />
            M04 · Diseñador de arquitecturas
          </p>
          <h1 className="page-head__title">Construye la topología de tu red neuronal</h1>
          <p className="page-head__lede">
            Selecciona la familia, ajusta capas y formas, y conecta neuronas en el lienzo. Cada
            conexión se dibuja con flujo animado y la configuración se valida antes de guardar un
            borrador trazable.
          </p>
        </div>
        <div className="page-head__actions">
          <Chip tone={errorCount === 0 ? 'completed' : 'failed'} dot>
            {errorCount === 0
              ? 'Configuración válida'
              : `${errorCount} ${errorCount === 1 ? 'error' : 'errores'}`}
          </Chip>
          <button type="button" className="btn btn--secondary" onClick={resetTemplate}>
            <Icon name="refresh" size={16} />
            Restablecer plantilla
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={saveArchitecture}
            disabled={errorCount > 0}
          >
            <Icon name="checkCircle" size={16} />
            Guardar arquitectura
          </button>
        </div>
      </div>

      <div className="dash">
        <section className="arch-families" aria-label="Familia de red neuronal">
          {FAMILIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="arch-family"
              data-family={item.id}
              aria-pressed={config.family === item.id}
              onClick={() => selectFamily(item.id)}
            >
              <span className="arch-family__glyph" aria-hidden="true">
                {item.glyph}
              </span>
              <span className="arch-family__text">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
              {config.family === item.id ? (
                <Icon className="arch-family__check" name="checkCircle" size={16} />
              ) : null}
            </button>
          ))}
        </section>

        {notice ? (
          <div className="arch-notice" data-tone={notice.tone} role="status">
            <Icon
              name={
                notice.tone === 'success'
                  ? 'checkCircle'
                  : notice.tone === 'error'
                    ? 'alertCircle'
                    : 'info'
              }
              size={16}
            />
            <p>{notice.text}</p>
            <button
              type="button"
              className="arch-notice__close"
              aria-label="Cerrar aviso"
              onClick={() => setNotice(null)}
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ) : null}

        <section className="arch-toolbar" aria-label="Configuración del diseño">
          <label className="arch-name-field">
            <span>Nombre de la arquitectura</span>
            <input
              className="arch-input"
              value={config.name}
              placeholder="Arquitectura sin título"
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>

          <div className="arch-toolbar__right">
            <Chip tone="outline">{family.label}</Chip>
            <Chip tone="outline">
              <Icon name="layers" size={12} />
              {config.layers.length} {config.layers.length === 1 ? 'capa' : 'capas'}
            </Chip>
            <Chip tone="outline">
              <Icon name="gauge" size={12} />
              {formatParams(computation.totalParams)} parámetros
            </Chip>
            <div className="filters" role="group" aria-label="Modo del lienzo">
              <button
                type="button"
                className="filter-btn"
                aria-pressed={mode === 'select'}
                onClick={() => changeMode('select')}
              >
                <Icon name="point" size={12} />
                Seleccionar
              </button>
              <button
                type="button"
                className="filter-btn"
                aria-pressed={mode === 'connect'}
                onClick={() => changeMode('connect')}
              >
                <Icon name="zap" size={12} />
                Conectar
              </button>
            </div>
          </div>
        </section>

        <div className="arch-workspace">
          <div className="arch-col">
            <LayerPanel
              layers={config.layers}
              selectedId={selectedLayerId}
              allowed={family.allowed}
              inputShape={computation.inputShape}
              outputShape={computation.outputShape}
              onSelect={setSelectedLayerId}
              onAdd={addLayer}
              onMove={moveLayer}
              onRemove={removeLayer}
            />
            <InputPanel family={config.family} input={config.input} onChange={patchInput} />
          </div>

          <div className="arch-col arch-col--canvas">
            <Panel
              title="Vista previa del grafo"
              icon="neuron"
              subtitle="Neuronas, capas y conexiones de la arquitectura."
              actions={
                <Chip tone="outline">
                  {computation.connections.length}{' '}
                  {computation.connections.length === 1 ? 'conexión' : 'conexiones'}
                </Chip>
              }
            >
              <GraphCanvas
                computation={computation}
                mode={mode}
                pendingSource={pendingSource}
                selectedLayerIndex={selectedIndex}
                onSelectLayer={(index) => setSelectedLayerId(config.layers[index]?.id ?? null)}
                onNeuronClick={handleNeuronClick}
                onRemoveConnection={removeConnection}
              />
            </Panel>
          </div>

          <div className="arch-col">
            <PropertiesPanel
              layer={selectedLayer}
              index={selectedIndex}
              total={config.layers.length}
              result={selectedResult}
              onChange={patchLayer}
              onMove={moveLayer}
              onRemove={removeLayer}
            />
            <SummaryPanel
              computation={computation}
              onRemoveConnection={removeConnection}
            />
          </div>
        </div>
      </div>
    </>
  );
}
