import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from '../icones'
import { MOLA_PADRAO, SOBREPOSICAO, SUAVE, semMovimento } from '@/lib/movimento'

const LARGURA = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Modal do GGPost (ui/Modal de la): veu escuro, folha branca de canto 28 que
 * entra com mola. Folha, e nao vidro: modal carrega formulario, e o campo cinza
 * some sobre fundo translucido.
 *
 * Escape e clique no veu fecham; o foco entra no modal ao abrir e volta para
 * quem o abriu ao fechar.
 */
export function Modal({ aberto, aoFechar, titulo, descricao, children, tamanho = 'md' }: {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  descricao?: ReactNode
  children: ReactNode
  tamanho?: 'sm' | 'md' | 'lg'
}) {
  const veu = useRef<HTMLDivElement>(null)
  const folha = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const semMov = useReducedMotion()
  // As telas passam `aoFechar` inline; num ref, o efeito abaixo roda so ao
  // abrir e fechar — e nao a cada tecla digitada, devolvendo o foco ao topo.
  const fechar = useRef(aoFechar)
  useEffect(() => { fechar.current = aoFechar })

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    // Espera a folha montar para focar o primeiro campo.
    const t = window.setTimeout(() => {
      const alvo = folha.current?.querySelector<HTMLElement>('input, textarea, [role="combobox"], [role="radio"][aria-checked="true"], button:not([data-fechar])')
      ;(alvo ?? folha.current)?.focus()
    }, 30)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar.current() }
    document.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
      anterior?.focus?.()
    }
  }, [aberto])

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          ref={veu}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-veu)] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={semMov ? semMovimento : SUAVE}
          onMouseDown={(e) => { if (e.target === veu.current) aoFechar() }}
        >
          <motion.div
            ref={folha}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            tabIndex={-1}
            className={`vidro-flutuante flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden bg-[var(--color-surface)] outline-none ${LARGURA[tamanho]}`}
            style={{ borderRadius: 28 }}
            initial={SOBREPOSICAO.initial}
            animate={SOBREPOSICAO.animate}
            exit={SOBREPOSICAO.exit}
            transition={semMov ? semMovimento : MOLA_PADRAO}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 pb-2 pl-6 pr-3 pt-4">
              <div className="min-w-0 pt-2">
                <h2 id={tituloId} className="text-[17px] font-semibold leading-[22px] tracking-[-.014em]" style={{ color: 'var(--color-text)' }}>{titulo}</h2>
                {descricao && <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{descricao}</p>}
              </div>
              <button
                type="button"
                data-fechar
                onClick={aoFechar}
                className="grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-[rgb(var(--tinta)/.055)] active:scale-95"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-6 pb-6 pt-2">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Rodape de formulario em modal: filete em cima, acoes a direita. */
export function RodapeModal({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2.5 border-t pt-4 sm:flex-row sm:justify-end" style={{ borderColor: 'var(--color-filete)' }}>
      {children}
    </div>
  )
}
