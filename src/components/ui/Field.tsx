import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldBase =
  "w-full rounded-field bg-input border border-border-input text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-primary focus:bg-white";

export function Label({
  children,
  optional,
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { optional?: boolean }) {
  return (
    <label
      className={`block text-[13px] font-semibold text-ink-2 ${className}`}
      {...props}
    >
      {children}
      {optional && (
        <span className="ml-1 font-medium text-faint">(opsiyonel)</span>
      )}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={`${fieldBase} px-3.5 py-[13px] ${className}`} {...props} />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${fieldBase} px-3.5 py-[13px] leading-relaxed resize-y ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`${fieldBase} cursor-pointer appearance-none px-3 py-[11px] pr-9 font-bold text-ink-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b7bdcd]">
        ▾
      </span>
    </div>
  );
}
