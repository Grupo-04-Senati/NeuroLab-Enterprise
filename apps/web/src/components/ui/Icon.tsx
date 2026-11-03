import type { SVGProps } from 'react';

/**
 * Set de iconos de trazo propio (24×24). Evita una dependencia externa y mantiene
 * el grosor de línea coherente con la tipografía de la interfaz.
 */
export const iconPaths = {
  point: 'M13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  dashboard: 'M3.5 3.5h6v6h-6zM14.5 3.5h6v6h-6zM14.5 14.5h6v6h-6zM3.5 14.5h6v6h-6z',
  projects:
    'M3 7a2 2 0 0 1 2-2h4l2 2.2h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10.5h18',
  training: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM10.2 8.4 16 12l-5.8 3.6z',
  neuron:
    'M8.5 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8.5 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM19.5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM10.3 7.6 17.4 11M10.3 16.4 17.4 13',
  layers: 'M12 3 3 7.4l9 4.4 9-4.4zM3 12.4 12 16.8l9-4.4M3 16.9 12 21.3l9-4.4',
  dataset:
    'M20 6c0 1.7-3.6 3-8 3S4 7.7 4 6s3.6-3 8-3 8 1.3 8 3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  metrics: 'M3 20.5h18M7 20.5V11M12 20.5V4.5M17 20.5v-6.5',
  model:
    'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.4 7.2 12 12l8.6-4.8M12 21.8V12.2',
  report: 'M14 3.2H7a2 2 0 0 0-2 2v13.6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.2zM14 3.2v5h5M8.8 13h6.4M8.8 16.6h6.4',
  shield: 'M12 21s7-3.4 7-9V6l-7-3-7 3v6c0 5.6 7 9 7 9zM9.2 11.8 11.4 14l3.6-3.6',
  bell: 'M6 8.2a6 6 0 0 1 12 0c0 6.6 2.6 8.6 2.6 8.6H3.4S6 14.8 6 8.2M10.2 20.2a2 2 0 0 0 3.6 0',
  search: 'M18.4 10.4a7.6 7.6 0 1 1-15.2 0 7.6 7.6 0 0 1 15.2 0zM15.8 15.8 20.6 20.6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8',
  chevronRight: 'M9.6 5.4 16.2 12l-6.6 6.6',
  chevronLeft: 'M14.4 5.4 7.8 12l6.6 6.6',
  chevronDown: 'M5.4 9.6 12 16.2l6.6-6.6',
  plus: 'M12 5.2v13.6M5.2 12h13.6',
  upload: 'M20.4 15.6v3a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-3M12 3.6v10.8M7.4 8.6 12 3.8l4.6 4.8',
  download: 'M20.4 15.6v3a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-3M12 3.6v10.8M7.4 10.4 12 15.2l4.6-4.8',
  arrowRight: 'M4.4 12h15M13 5.6 19.4 12 13 18.4',
  alertTriangle:
    'M10.3 4.2 2.5 17.9a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0zM12 9.4v4.4M12 17.4h.01',
  alertCircle: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7.6v5.2M12 16.4h.01',
  info: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 16.6v-5.2M12 8h.01',
  checkCircle: 'M21.2 11.2V12a9.2 9.2 0 1 1-5.4-8.4M21.6 5 12 14.6l-3.1-3.1',
  clock: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7.2V12l3.6 2.2',
  server:
    'M4.2 4h15.6a1.4 1.4 0 0 1 1.4 1.4v4.2a1.4 1.4 0 0 1-1.4 1.4H4.2a1.4 1.4 0 0 1-1.4-1.4V5.4A1.4 1.4 0 0 1 4.2 4zM4.2 15h15.6a1.4 1.4 0 0 1 1.4 1.4v4.2a1.4 1.4 0 0 1-1.4 1.4H4.2a1.4 1.4 0 0 1-1.4-1.4v-4.2A1.4 1.4 0 0 1 4.2 15zM7 8.4h.01M7 19.2h.01',
  storage:
    'M21.6 12.4H2.4M5.6 5.4 2.4 12v5a2 2 0 0 0 2 2h15.2a2 2 0 0 0 2-2v-5L18.4 5.4a2 2 0 0 0-1.8-1.1H7.4a2 2 0 0 0-1.8 1.1zM6.4 16.4h.01M10 16.4h.01',
  zap: 'M13.2 2.4 4.4 14h7l-1.6 7.6L19.6 10h-7z',
  users:
    'M16 20.8v-1.8a3.8 3.8 0 0 0-3.8-3.8H6.4a3.8 3.8 0 0 0-3.8 3.8v1.8M9.7 11.4a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6zM21.4 20.8v-1.8a3.8 3.8 0 0 0-2.8-3.7M16.2 3.9a3.8 3.8 0 0 1 0 7.4',
  trendingUp: 'M21.6 6.4 13.4 14.6l-3.8-3.8L2.4 18.4M15.6 6.4h6v6',
  trendingDown: 'M21.6 17.6 13.4 9.4l-3.8 3.8L2.4 5.6M15.6 17.6h6v-6',
  minus: 'M5.4 12h13.2',
  refresh: 'M21.6 4.8v5.4h-5.4M2.4 19.2v-5.4H7.8M3.6 9.4a8.6 8.6 0 0 1 14.2-3.2l3.8 3.4M2.4 14.4l3.8 3.4a8.6 8.6 0 0 0 14.2-3.2',
  queue: 'M8.4 6.2h12.4M8.4 12h12.4M8.4 17.8h12.4M3.4 6.2h.01M3.4 12h.01M3.4 17.8h.01',
  gauge: 'M12 14.4 16.4 9.6M3.6 17.6a9.4 9.4 0 1 1 16.8 0',
  settings: 'M4.2 21v-6.6M4.2 10.8V3M12 21v-9.4M12 8.4V3M19.8 21v-4.6M19.8 12.8V3M1.6 14.4h5.2M9.4 8.4h5.2M17.2 16.4h5.2',
  edit: 'M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
  tag: 'M20.5 13.2 13.2 20.5a2 2 0 0 1-2.8 0L3.5 13.6V4.5h9.1l7.9 7.9a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  fileText:
    'M14 3.2H7a2 2 0 0 0-2 2v13.6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.2zM14 3.2v5h5M8.8 12h6.4M8.8 15.6h4.4',
  userPlus:
    'M15.4 20.8v-1.8a3.8 3.8 0 0 0-3.8-3.8H6.4a3.8 3.8 0 0 0-3.8 3.8v1.8M9 11.4a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM18.4 8.2v6M21.4 11.2h-6',
  lock:
    'M6.2 10.4h11.6a1.8 1.8 0 0 1 1.8 1.8v7a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8v-7a1.8 1.8 0 0 1 1.8-1.8zM8 10.4V7.6a4 4 0 0 1 8 0v2.8M12 14.6v3.2',
  archive:
    'M3.8 4.2h16.4a1 1 0 0 1 1 1v2.6a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V5.2a1 1 0 0 1 1-1zM5 8.8v10a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-10M9.4 12.4h5.2',
  mail:
    'M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17V7A1.5 1.5 0 0 1 4 5.5zM3 7l9 6 9-6',
  dots: 'M12 6.4h.01M12 12h.01M12 17.6h.01',
  logout: 'M9.4 20.8H6.2a2 2 0 0 1-2-2V5.2a2 2 0 0 1 2-2h3.2M16.4 16.6 21 12l-4.6-4.6M20.8 12H9.6',
  logo: 'M8 6.4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 17.6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9.6 6.8 16 11M9.6 17.2 16 13',
} as const;

export type IconName = keyof typeof iconPaths;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Sólo si el icono transmite información por sí mismo. */
  title?: string;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.7,
  title,
  ...svgProps
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable={false}
      {...svgProps}
    >
      {title ? <title>{title}</title> : null}
      <path d={iconPaths[name]} />
    </svg>
  );
}
