import type { ReactNode } from 'react'
import { Check } from '../icones'

/**
 * Caixa de marcar da marca GGPost (ui/Checkbox de la), no lugar da nativa:
 * quadrado de 20px com canto 6, preenchido de petroleo quando marcado.
 */
export function Checkbox({ label, checked = false, onChange, disabled = false, className = '' }: {
  label?: ReactNode
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`group inline-flex select-none items-center gap-2.5 rounded-[8px] text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span
        className="grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-[background-color,border-color,scale] duration-200 group-active:scale-90"
        style={{
          backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-surface)',
          borderColor: checked ? 'var(--color-primary)' : 'var(--color-text-muted)',
        }}
      >
        {checked && <Check size={13} weight="bold" color="white" />}
      </span>
      {label && <span className="text-sm" style={{ color: 'var(--color-text)' }}>{label}</span>}
    </button>
  )
}
