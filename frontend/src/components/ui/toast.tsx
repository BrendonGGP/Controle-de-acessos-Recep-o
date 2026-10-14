import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle, XCircle, X } from '../icones'
import { MOLA_PADRAO, semMovimento } from '@/lib/movimento'

export interface ToastData {
  id: string
  type: 'success' | 'error'
  message: string
}

/** Recuo de cada camada: fechada, os avisos antigos afundam atras do mais novo. */
const SOBREPOSICAO_FECHADA = -34
const RESPIRO_ABERTA = 8
const ESCALA_POR_CAMADA = 0.055
const VISIVEIS = 3

function Toast({ toast, onRemove, profundidade, aberta }: {
  toast: ToastData
  onRemove: (id: string) => void
  profundidade: number
  aberta: boolean
}) {
  const semMov = useReducedMotion()

  useEffect(() => {
    // Erro fica mais tempo: costuma ter algo para ler.
    const base = toast.type === 'error' ? 7000 : 4000
    const t = setTimeout(() => onRemove(toast.id), base + profundidade * 400)
    return () => clearTimeout(t)
  }, [toast.id, toast.type, onRemove, profundidade])

  return (
    <motion.div
      layout
      className="vidro-denso vidro-flutuante flex min-h-12 items-center gap-2.5 rounded-[24px] py-1.5 pl-4 pr-1.5 text-sm font-medium"
      style={{ color: 'var(--color-text)', transformOrigin: 'top center', zIndex: 100 - profundidade }}
      initial={{ opacity: 0, y: -14, scale: 0.94 }}
      animate={{
        scale: aberta ? 1 : 1 - profundidade * ESCALA_POR_CAMADA,
        opacity: profundidade >= VISIVEIS ? 0 : 1,
        marginBottom: aberta ? RESPIRO_ABERTA : SOBREPOSICAO_FECHADA,
        pointerEvents: profundidade >= VISIVEIS ? 'none' : 'auto',
      }}
      exit={{ opacity: 0, x: 28, scale: 0.94 }}
      transition={semMov ? semMovimento : MOLA_PADRAO}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      {toast.type === 'success' ? (
        <CheckCircle size={18} className="shrink-0" style={{ color: 'var(--color-sucesso)' }} />
      ) : (
        <XCircle size={18} className="shrink-0" style={{ color: 'var(--color-danger)' }} />
      )}
      <span className="flex-1 py-1.5">{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[rgb(var(--tinta)/.055)]"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label="Fechar aviso"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

/**
 * Pilha de avisos do GGPost: no desktop abaixo da capsula do topo, no celular
 * acima da barra inferior. O mais novo na frente; passar o ponteiro abre a
 * pilha numa lista legivel.
 */
export function ToastContainer({ toasts, onRemove }: { toasts: ToastData[]; onRemove: (id: string) => void }) {
  const [aberta, setAberta] = useState(false)
  const ordenados = [...toasts].reverse()

  return (
    <div
      className="fixed bottom-[88px] right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col md:bottom-auto md:right-5 md:top-[84px]"
      onMouseEnter={() => setAberta(true)}
      onMouseLeave={() => setAberta(false)}
    >
      <AnimatePresence initial={false}>
        {ordenados.map((t, i) => (
          <Toast key={t.id} toast={t} onRemove={onRemove} profundidade={i} aberta={aberta} />
        ))}
      </AnimatePresence>
    </div>
  )
}
