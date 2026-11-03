import type { IconName } from '@/components/ui/Icon';
import type { JobStatus, NetworkFamily } from '@/types/domain';

export interface NavItem {
  moduleId: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: IconName;
  end?: boolean;
  badge?: { count: number; tone?: 'brand' | 'warning' };
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Mapa de navegación por dominios: los diez módulos del §6 del Documento Maestro. */
export const navGroups: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      {
        moduleId: 'M01',
        label: 'Inicio / Dashboard',
        shortLabel: 'Inicio',
        path: '/',
        icon: 'dashboard',
        end: true,
      },
      { moduleId: 'M02', label: 'Proyectos de IA', shortLabel: 'Proyectos', path: '/projects', icon: 'projects' },
      {
        moduleId: 'M06',
        label: 'Entrenamientos',
        shortLabel: 'Entrenamientos',
        path: '/training',
        icon: 'training',
      },
    ],
  },
  {
    label: 'Modelado',
    items: [
      {
        moduleId: 'M03',
        label: 'Fundamentos neuronales',
        shortLabel: 'Fundamentos',
        path: '/fundamentals',
        icon: 'neuron',
      },
      {
        moduleId: 'M04',
        label: 'Diseñador de arquitecturas',
        shortLabel: 'Arquitecturas',
        path: '/architectures',
        icon: 'layers',
      },
      { moduleId: 'M05', label: 'Datasets', shortLabel: 'Datasets', path: '/datasets', icon: 'dataset' },
    ],
  },
  {
    label: 'Resultados',
    items: [
      { moduleId: 'M07', label: 'Evaluación y métricas', shortLabel: 'Evaluación', path: '/evaluation', icon: 'metrics' },
      { moduleId: 'M08', label: 'Registro de modelos', shortLabel: 'Modelos', path: '/models', icon: 'model' },
      { moduleId: 'M09', label: 'Reportes', shortLabel: 'Reportes', path: '/reports', icon: 'report' },
    ],
  },
  {
    label: 'Gobierno',
    items: [
      { moduleId: 'M10', label: 'Administración y seguridad', shortLabel: 'Administración', path: '/admin', icon: 'shield' },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return navItems.find((item) => item.end);
  return [...navItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

/** Etiquetas y tonos de la máquina de estados RN-02. */
export type StatusTone =
  | 'neutral'
  | 'preparing'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const statusMeta: Record<JobStatus, { label: string; tone: StatusTone }> = {
  QUEUED: { label: 'En cola', tone: 'neutral' },
  PREPARING: { label: 'Preparando', tone: 'preparing' },
  RUNNING: { label: 'Ejecutando', tone: 'running' },
  COMPLETED: { label: 'Completado', tone: 'completed' },
  FAILED: { label: 'Fallido', tone: 'failed' },
  CANCELLED: { label: 'Cancelado', tone: 'cancelled' },
};

export const familyMeta: Record<NetworkFamily, { label: string; glyph: string }> = {
  FEEDFORWARD: { label: 'Feedforward', glyph: 'FF' },
  RNN: { label: 'Recurrente', glyph: 'RNN' },
  CNN: { label: 'Convolucional', glyph: 'CNN' },
  GAN: { label: 'GAN', glyph: 'GAN' },
};

export const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  owner: 'Responsable de proyecto',
  engineer: 'Ingeniero de IA',
  reviewer: 'Revisor',
  reader: 'Lector',
};
