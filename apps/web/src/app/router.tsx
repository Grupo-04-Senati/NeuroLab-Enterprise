import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ArchitecturesPage } from '@/features/architectures/ArchitecturesPage';
import { FundamentalsPage } from '@/features/fundamentals/FundamentalsPage';
import { DatasetsPage } from '@/features/datasets/DatasetsPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { EvaluationPage } from '@/features/evaluation/EvaluationPage';
import { TrainingPage } from '@/features/training/TrainingPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { AdministrationPage } from '@/features/administration/AdministrationPage';
import { ModulePlaceholder } from '@/features/placeholder/ModulePlaceholder';
import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';

function NotFound() {
  return (
    <div className="dash">
      <Panel title="Ruta no registrada" icon="alertCircle" subtitle="El enlace no corresponde a un módulo de la plataforma.">
        <p className="panel__note">
          Revise la navegación lateral o regrese al panel de control para continuar con el flujo de
          experimentación.
        </p>
        <Link to="/" className="btn btn--primary" style={{ marginTop: 'var(--sp-4)' }}>
          <Icon name="dashboard" size={16} />
          Ir al inicio
        </Link>
      </Panel>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'fundamentals', element: <FundamentalsPage /> },
      { path: 'architectures', element: <ArchitecturesPage /> },
      { path: 'datasets', element: <DatasetsPage /> },
      { path: 'training', element: <TrainingPage /> },
      { path: 'evaluation', element: <EvaluationPage /> },
      { path: 'models', element: <ModulePlaceholder /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'admin', element: <AdministrationPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
