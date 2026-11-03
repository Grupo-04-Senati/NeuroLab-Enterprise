import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  MAX_VISIBLE_NEURONS,
  formatShape,
  layerCatalog,
  layerSummary,
  type ArchitectureComputation,
  type NeuronRef,
} from '@/features/architectures/model';

const COL_W = 124;
const GAP_X = 64;
const PAD_X = 28;
const PAD_Y = 26;
const HEADER_H = 52;
const ROW_H = 26;
const NODE_R = 5.5;
const MIN_H = 320;

interface Point {
  x: number;
  y: number;
}

interface Column {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  total: number;
  neurons: Point[];
}

function buildLayout(computation: ArchitectureComputation): {
  columns: Column[];
  width: number;
  height: number;
} {
  const sizes = computation.results.map((_, index) => {
    const total = Math.max(1, computation.neuronCounts[index] ?? 1);
    const visible = Math.min(total, MAX_VISIBLE_NEURONS);
    return {
      total,
      visible,
      width: COL_W,
      height: HEADER_H + visible * ROW_H + 20,
    };
  });

  const tallest = sizes.reduce((acc, size) => Math.max(acc, size.height), 0);
  const height = Math.max(MIN_H, tallest + PAD_Y * 2);
  const width = PAD_X * 2 + sizes.length * COL_W + Math.max(0, sizes.length - 1) * GAP_X;

  const columns: Column[] = sizes.map((size, index) => {
    const x = PAD_X + index * (COL_W + GAP_X);
    const y = (height - size.height) / 2;
    const neurons = Array.from({ length: size.visible }, (_, neuron) => ({
      x: x + COL_W / 2,
      y: y + HEADER_H + 8 + ROW_H / 2 + neuron * ROW_H,
    }));
    return {
      index,
      x,
      y,
      width: size.width,
      height: size.height,
      total: size.total,
      neurons,
    };
  });

  return { columns, width: Math.max(width, 320), height };
}

function curvePath(from: Point, to: Point): string {
  const dx = Math.max(30, Math.abs(to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

const COMPUTE_LAYERS = new Set(['Dense', 'Conv2D', 'LSTM', 'GRU']);

export interface GraphCanvasProps {
  computation: ArchitectureComputation;
  mode: 'select' | 'connect';
  pendingSource: NeuronRef | null;
  selectedLayerIndex: number;
  onSelectLayer: (index: number) => void;
  onNeuronClick: (layer: number, neuron: number) => void;
  onRemoveConnection: (id: string) => void;
}

export function GraphCanvas({
  computation,
  mode,
  pendingSource,
  selectedLayerIndex,
  onSelectLayer,
  onNeuronClick,
  onRemoveConnection,
}: GraphCanvasProps) {
  const { columns, width, height } = buildLayout(computation);
  const byLayer = new Map(columns.map((column) => [column.index, column]));

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [panning, setPanning] = useState(false);
  const [pannable, setPannable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = () =>
      setPannable(
        canvas.scrollWidth - canvas.clientWidth > 2 || canvas.scrollHeight - canvas.clientHeight > 2,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    if (svgRef.current) observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [width, height]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    suppressClickRef.current = false;
    if (event.button !== 0 || event.pointerType !== 'mouse') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.scrollWidth <= canvas.clientWidth && canvas.scrollHeight <= canvas.clientHeight) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop,
      moved: false,
    };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* La captura es opcional: el arrastre sigue funcionando dentro del lienzo. */
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const canvas = canvasRef.current;
    if (!pan || !canvas || event.pointerId !== pan.pointerId) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (!pan.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      pan.moved = true;
      setPanning(true);
    }
    event.preventDefault();
    canvas.scrollLeft = pan.scrollLeft - dx;
    canvas.scrollTop = pan.scrollTop - dy;
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const canvas = canvasRef.current;
    if (!pan || !canvas || event.pointerId !== pan.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    panRef.current = null;
    if (pan.moved) {
      suppressClickRef.current = true;
      setPanning(false);
    }
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current && event.pointerId === panRef.current.pointerId) {
      panRef.current = null;
      setPanning(false);
    }
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="arch-canvas-wrap">
      <div
        ref={canvasRef}
        className="arch-canvas"
        data-mode={mode}
        data-pannable={pannable ? 'true' : 'false'}
        data-panning={panning ? 'true' : 'false'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handleLostPointerCapture}
        onClickCapture={handleClickCapture}
      >
        {computation.results.length === 0 ? (
          <div className="arch-canvas__empty">
            <Icon name="layers" size={30} />
            <p>El lienzo está vacío. Añade una capa desde el panel izquierdo para ver el grafo.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="arch-canvas__svg"
            data-mode={mode}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="group"
            aria-label="Vista previa del grafo de la arquitectura"
          >
            {columns.slice(0, -1).map((column) => {
              const next = columns[column.index + 1];
              const from = { x: column.x + COL_W, y: column.y + column.height / 2 };
              const to = { x: next.x, y: next.y + next.height / 2 };
              return (
                <path
                  key={`flow-${column.index}`}
                  className="arch-flow"
                  d={curvePath(from, to)}
                />
              );
            })}

            {computation.connections.map((connection) => {
              const fromColumn = byLayer.get(connection.from.layer);
              const toColumn = byLayer.get(connection.to.layer);
              if (!fromColumn || !toColumn) return null;
              const fromNeuron = fromColumn.neurons[connection.from.neuron];
              const toNeuron = toColumn.neurons[connection.to.neuron];
              if (!fromNeuron || !toNeuron) return null;

              const forward = toColumn.x > fromColumn.x;
              const start = {
                x: forward ? fromColumn.x + COL_W : fromColumn.x,
                y: fromNeuron.y,
              };
              const end = {
                x: forward ? toColumn.x : toColumn.x + COL_W,
                y: toNeuron.y,
              };
              const d = curvePath(start, end);

              return (
                <g key={connection.id} className="arch-edge">
                  <path className="arch-edge__glow" d={d} />
                  <path className="arch-edge__core" d={d} pathLength={1} />
                  <path className="arch-edge__flow" d={d} pathLength={1} />
                  <path
                    className="arch-edge__hit"
                    d={d}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveConnection(connection.id);
                    }}
                  >
                    <title>Quitar conexión</title>
                  </path>
                </g>
              );
            })}

            {computation.results.map((result, index) => {
              const column = columns[index];
              const utility = !COMPUTE_LAYERS.has(result.layer.type);

              return (
                <g
                  key={result.layer.id}
                  className={
                    selectedLayerIndex === index
                      ? 'arch-block-group is-selected'
                      : 'arch-block-group'
                  }
                  onClick={() => onSelectLayer(index)}
                >
                  <rect
                    className="arch-block"
                    x={column.x}
                    y={column.y}
                    width={column.width}
                    height={column.height}
                    rx={14}
                  />
                  <text className="arch-block__index" x={column.x + 14} y={column.y + 19}>
                    {String(index + 1).padStart(2, '0')}
                  </text>
                  <text className="arch-block__title" x={column.x + 34} y={column.y + 19}>
                    {layerCatalog[result.layer.type].label}
                  </text>
                  <text className="arch-block__meta" x={column.x + 14} y={column.y + 36}>
                    {layerSummary(result.layer)}
                  </text>
                  <line
                    className="arch-block__rule"
                    x1={column.x + 12}
                    x2={column.x + column.width - 12}
                    y1={column.y + 44}
                    y2={column.y + 44}
                  />
                  <text className="arch-block__shape" x={column.x + 14} y={column.y + column.height - 8}>
                    {`salida ${formatShape(result.outputShape)}`}
                  </text>

                  {column.neurons.map((point, neuron) => {
                    const isSource =
                      pendingSource !== null &&
                      pendingSource.layer === index &&
                      pendingSource.neuron === neuron;
                    const classes = ['arch-neuron'];
                    if (utility) classes.push('arch-neuron--utility');
                    if (isSource) classes.push('is-source');

                    return (
                      <circle
                        key={`${result.layer.id}-${neuron}`}
                        className={classes.join(' ')}
                        cx={point.x}
                        cy={point.y}
                        r={NODE_R}
                        tabIndex={0}
                        role="button"
                        aria-label={`${layerCatalog[result.layer.type].label}, neurona ${neuron + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onNeuronClick(index, neuron);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            onNeuronClick(index, neuron);
                          }
                        }}
                      >
                        <title>{`${layerCatalog[result.layer.type].label} · neurona ${neuron + 1}`}</title>
                      </circle>
                    );
                  })}

                  <title>
                    {`${column.total} neuronas · ${layerSummary(result.layer)}`}
                  </title>
                </g>
              );
            })}

            {pendingSource
              ? (() => {
                  const column = byLayer.get(pendingSource.layer);
                  const neuron = column?.neurons[pendingSource.neuron];
                  if (!column || !neuron) return null;
                  return (
                    <circle
                      className="arch-neuron__ring"
                      cx={neuron.x}
                      cy={neuron.y}
                      r={NODE_R + 3}
                    />
                  );
                })()
              : null}

            {computation.connections.map((connection) => {
              const target = byLayer.get(connection.to.layer)?.neurons[connection.to.neuron];
              if (!target) return null;
              return (
                <circle
                  key={`ping-${connection.id}`}
                  className="arch-ping"
                  cx={target.x}
                  cy={target.y}
                  r={NODE_R + 2}
                />
              );
            })}
          </svg>
        )}
      </div>

      <p className="arch-hint">
        <Icon name={mode === 'connect' ? 'zap' : 'info'} size={15} />
        {mode === 'connect'
          ? 'Modo conectar: pulsa una neurona origen y luego una de una capa adyacente. La conexión se dibuja con flujo animado; pulsa una conexión para quitarla. Mantén pulsado el botón izquierdo y arrastra para mover el lienzo.'
          : 'Modo seleccionar: pulsa una neurona o una capa para editar sus propiedades. Cambia a Conectar para enlazar neuronas. Mantén pulsado el botón izquierdo y arrastra para mover el lienzo.'}
      </p>

      <div className="arch-legend">
        <span>
          <i className="arch-legend__line arch-legend__line--live" />
          Conexión animada
        </span>
        <span>
          <i className="arch-legend__line" />
          Flujo secuencial
        </span>
        <span>
          <Icon name="neuron" size={13} />
          {computation.connections.length} conexiones manuales
        </span>
      </div>
    </div>
  );
}
