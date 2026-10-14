import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Check } from '../icones'
import { Flutuante } from './flutuante'

export interface OpcaoSelect {
  value: string
  label: string
}

/**
 * Seletor da marca GGPost (ui/Select de la), no lugar do <select> do
 * navegador: mesmo campo cinza de 40px, lista em vidro denso, teclado com
 * setas, Enter e Escape.
 */
export function Select({ label, options, placeholder = 'Selecione', value, onChange, disabled = false, className = '', id, invalido = false }: {
  label?: string
  options: OpcaoSelect[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  id?: string
  invalido?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const botao = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const gerado = useId()
  const selectId = id || gerado
  const listaId = `${selectId}-lista`

  const selected = options.find((o) => o.value === value)
  const fechar = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (open && focusedIndex >= 0 && lista.current) {
      const item = lista.current.children[focusedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex, open])

  function abrir() {
    setOpen(true)
    setFocusedIndex(Math.max(0, options.findIndex((o) => o.value === value)))
  }

  function escolher(v: string) {
    onChange?.(v)
    setOpen(false)
    botao.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) abrir()
        else if (focusedIndex >= 0) escolher(options[focusedIndex].value)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) abrir()
        else setFocusedIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <button
        ref={botao}
        type="button"
        id={selectId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listaId : undefined}
        aria-activedescendant={open && focusedIndex >= 0 ? `${listaId}-${focusedIndex}` : undefined}
        aria-invalid={invalido || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : abrir())}
        onKeyDown={handleKeyDown}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border px-3.5 text-left text-[15px] transition-[background-color,box-shadow,border-color] duration-200 focus:outline-none focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_4px_rgba(55,128,157,.14)] disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[0_0_0_4px_rgba(55,128,157,.14)]'
            : invalido
              ? 'border-[var(--color-danger)] bg-[var(--color-preenchimento)]'
              : 'border-transparent bg-[var(--color-preenchimento)] hover:bg-[var(--color-preenchimento-2)]'
        }`}
        style={{ color: selected ? 'var(--color-text)' : 'var(--color-placeholder-controle)' }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-secondary)' }}
        />
      </button>

      <Flutuante ancora={botao} aberto={open} aoFechar={fechar} className="rounded-[18px] p-1.5">
        <ul ref={lista} id={listaId} role="listbox" aria-label={label}>
          {options.map((opt, idx) => {
            const escolhido = opt.value === value
            return (
              <li
                key={opt.value}
                id={`${listaId}-${idx}`}
                role="option"
                aria-selected={escolhido}
                className="flex h-9 cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 text-sm transition-colors duration-100"
                style={{
                  backgroundColor: focusedIndex === idx ? 'rgb(var(--tinta) / .055)' : undefined,
                  color: escolhido ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: escolhido ? 600 : undefined,
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                onMouseDown={(e) => { e.preventDefault(); escolher(opt.value) }}
              >
                <span className="truncate">{opt.label}</span>
                {escolhido && <Check size={16} />}
              </li>
            )
          })}
        </ul>
      </Flutuante>
    </div>
  )
}
