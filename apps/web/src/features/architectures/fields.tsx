export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  wide?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  wide = false,
}: NumberFieldProps) {
  return (
    <label className={wide ? 'arch-field arch-field--wide' : 'arch-field'}>
      <span>{label}</span>
      <input
        className="arch-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="arch-field">
      <span>{label}</span>
      <select className="arch-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
