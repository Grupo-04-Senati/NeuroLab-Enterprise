import { Chip } from '@/components/ui/Chip';
import { datasetStatusMeta } from '@/features/datasets/model';
import type { DatasetStatus } from '@/types/dataset';

export function DatasetStatusChip({ status }: { status: DatasetStatus }) {
  const meta = datasetStatusMeta[status];
  return (
    <Chip tone={meta.tone} dot pulse={status === 'VALIDATING'} title={meta.hint}>
      {meta.label}
    </Chip>
  );
}
