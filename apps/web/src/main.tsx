import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/shell.css';
import '@/styles/ui.css';
import '@/styles/dashboard.css';
import '@/styles/fundamentals.css';
import '@/styles/architectures.css';
import '@/styles/datasets.css';
import '@/styles/projects.css';
import '@/styles/evaluation.css';
import '@/styles/training.css';
import '@/styles/reports.css';
import '@/styles/administration.css';

import { AppRouter } from '@/app/router';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
