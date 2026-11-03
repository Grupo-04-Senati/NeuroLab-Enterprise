import type { ProjectStatus } from '@/types/project';
import { Chip } from '@/components/ui/Chip';
import { projectStatusMeta } from '@/features/projects/model';

export function ProjectStatusChip({ status }: { status: ProjectStatus }) {
  const meta = projectStatusMeta[status];
  return (
    <Chip tone={meta.tone} dot title={meta.hint}>
      {meta.label}
    </Chip>
  );
}
