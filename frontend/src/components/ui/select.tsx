import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Check } from '../icones'
import { Flutuante } from './flutuante'

export interface OpcaoSelect {
  value: string
  label: string
}

/**
 * A partir de quantas opções a busca aparece sozinha. Abaixo disso, rolar a
 * lista é mais rápido que digitar; acima, procurar no olho vira trabalho.
 */
const MINIMO_PARA_BUSCA = 8

/**
 * Seletor da marca GGPost (ui/Select de la), no lugar do <select> do
 * navegador: mesmo campo cinza de 40px, lista em vidro denso, teclado com
 * setas, Enter e Escape.
 *
 * Listas longas (colaboradores, por exemplo) ganham um campo de busca no
 * topo: com dezenas de nomes, rolar até achar é inviável.
 */
export function Select({ label, options, placeholder = 'Selecione', value, onChange, disabled = false, className = '', id, invalido = false, comBusca }: {
  label?: string
  options: OpcaoSelect[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  id?: string
  invalido?: boolean
  /** Força mostrar ou esconder a busca. Por padrão, aparece em listas longas. */
  comBusca?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [busca, setBusca] = useState('')
  const botao = useRef<HTMLButtonElement>(null)
  const campoBusca = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const gerado = useId()
  const selectId = id || gerado
  const listaId = `${selectId}-lista`

  const mostraBusca = comBusca ?? options.length >= MINIMO_PARA_BUSCA
  const termo = busca.trim().toLowerCase()
  const visiveis = termo
    ? options.filter((o) => o.label.toLowerCase().includes(termo))
    : options

  const selected = options.find((o) => o.value === value)
  const fechar = useCallback(() => {
    setOpen(false)
    setBusca('')
  }, [])

  useEffect(() => {
    if (open && focusedIndex >= 0 && lista.current) {
      const item = lista.current.children[focusedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex, open])

  // Ao abrir com busca, o cursor já vai para o campo: a recepcionista digita
  // o nome direto, sem um clique a mais.
  useEffect(() => {
    if (open && mostraBusca) campoBusca.current?.focus()
  }, [open, mostraBusca])

  function abrir() {
    setOpen(true)
    setBusca('')
    setFocusedIndex(Math.max(0, options.findIndex((o) => o.value === value)))
  }

  function escolher(v: string) {
    onChange?.(v)
    setOpen(false)
    setBusca('')
    botao.current?.focus()
  }

  /** Teclado da lista, compartilhado entre o botão e o campo de busca. */
  function navegar(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (!open) abrir()
        else if (visiveis[focusedIndex]) escolher(visiveis[focusedIndex].value)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) abrir()
        else setFocusedIndex((i) => Math.min(i + 1, visiveis.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Escape':
        if (open) { e.preventDefault(); fechar(); botao.current?.focus() }
        break
      case 'Tab':
        fechar()
        break
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    // Espaço escolhe no botão, mas dentro da busca precisa escrever espaço.
    if (e.key === ' ' && !open) {
      e.preventDefault()
      abrir()
      return
    }
    navegar(e)
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
        onClick={() => (open ? fechar() : abrir())}
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
        {mostraBusca && (
          <input
            ref={campoBusca}
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setFocusedIndex(0) }}
            onKeyDown={navegar}
            placeholder="Buscar…"
            aria-label="Buscar nas opções"
            aria-controls={listaId}
            autoComplete="off"
            className="mb-1 h-9 w-full rounded-[10px] border border-transparent bg-[var(--color-preenchimento)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:outline-none"
          />
        )}

        <ul ref={lista} id={listaId} role="listbox" aria-label={label} className="max-h-[260px] overflow-y-auto">
          {visiveis.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
              Nada encontrado.
            </li>
          ) : (
            visiveis.map((opt, idx) => {
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
            })
          )}
        </ul>
      </Flutuante>
    </div>
  )
}
