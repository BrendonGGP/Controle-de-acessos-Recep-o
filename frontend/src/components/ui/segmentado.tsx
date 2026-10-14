import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MOLA_LENTE, semMovimento } from '@/lib/movimento'

export interface OpcaoSegmentado<T extends string> {
  valor: T
  rotulo: ReactNode
}

/**
 * Controle segmentado do GGPost: trilho cinza e uma lente branca que desliza
 * com mola ate a opcao escolhida — a mesma lente da lateral, em ponto pequeno.
 *
 * `abas` troca o painel embaixo (tablist); `escolha` e um campo de formulario
 * (radiogroup), como Entrada/Saida e Com/Sem cafe.
 */
export function Segmentado<T extends string>({ opcoes, valor, aoMudar, rotulo, tipo = 'escolha', largo = false, className = '' }: {
  opcoes: ReadonlyArray<OpcaoSegmentado<T>>
  valor: T
  aoMudar: (v: T) => void
  /** Nome do grupo para leitor de tela. */
  rotulo: string
  tipo?: 'abas' | 'escolha'
  /** Ocupa a largura toda, com as opcoes divididas por igual (formularios). */
  largo?: boolean
  className?: string
}) {
  const id = useId()
  const semMov = useReducedMotion()
  const abas = tipo === 'abas'
  return (
    <div
      role={abas ? 'tablist' : 'radiogroup'}
      aria-label={rotulo}
      className={`relative ${largo ? 'flex w-full' : 'inline-flex'} rounded-full bg-[rgb(var(--tinta)/.06)] p-[3px] ${className}`}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role={abas ? 'tab' : 'radio'}
            aria-selected={abas ? ativo : undefined}
            aria-checked={abas ? undefined : ativo}
            onClick={() => aoMudar(o.valor)}
            className={`relative h-[34px] whitespace-nowrap rounded-full px-4 text-[13.5px] transition-colors duration-200 ${largo ? 'flex-1' : ''} ${
              ativo ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-nav-text)] hover:text-[var(--color-text)]'
            }`}
          >
            {ativo && (
              <motion.span
                layoutId={`lente-${id}`}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[var(--color-lente)]"
                style={{ boxShadow: '0 0 0 .5px rgba(16,24,40,.08), 0 2px 6px -2px rgba(16,24,40,.14)' }}
                transition={semMov ? semMovimento : MOLA_LENTE}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{o.rotulo}</span>
          </button>
        )
      })}
    </div>
  )
}
