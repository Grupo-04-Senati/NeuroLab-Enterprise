import type { DatasetSplit } from '@/types/dataset';

export function SplitBar({ split, size = 'sm' }: { split: DatasetSplit; size?: 'sm' | 'lg' }) {
  return (
    <span className={`ds-split-bar ds-split-bar--${size}`} aria-hidden="true">
      <i data-part="train" style={{ width: `${split.train}%` }} />
      <i data-part="validation" style={{ width: `${split.validation}%` }} />
      <i data-part="test" style={{ width: `${split.test}%` }} />
    </span>
  );
}
