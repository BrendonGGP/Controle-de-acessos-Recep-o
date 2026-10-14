import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

/**
 * Painel que flutua preso a um controle (lista do Select, calendario do campo
 * de data, busca de participantes).
 *
 * Vai para o <body> com posicao fixa, medida a partir do controle: dentro de um
 * modal o corpo rola (`overflow-y-auto`) e um painel absoluto ficaria cortado
 * por ele. Abre para baixo; sem espaco, abre para cima.
 */
export function Flutuante({ ancora, aberto, aoFechar, children, largura, className = '', ...aria }: {
  ancora: RefObject<HTMLElement | null>
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
  /** Largura fixa em px; sem ela, acompanha a largura do controle. */
  largura?: number
  className?: string
  role?: string
  id?: string
  'aria-label'?: string
}) {
  const painel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null)

  useLayoutEffect(() => {
    if (!aberto) return
    const medir = () => {
      const r = ancora.current?.getBoundingClientRect()
      if (!r) return
      const w = largura ?? r.width
      const left = Math.max(8, Math.min(r.left, innerWidth - w - 8))
      const abaixo = innerHeight - r.bottom - 12
      const acima = r.top - 12
      if (abaixo >= 240 || abaixo >= acima) {
        setPos({ left, top: r.bottom + 6, width: w, maxHeight: Math.max(160, abaixo) })
      } else {
        setPos({ left, bottom: innerHeight - r.top + 6, width: w, maxHeight: Math.max(160, acima) })
      }
    }
    medir()
    // Captura: a rolagem do corpo do modal (ou da area de conteudo) tambem move o controle.
    window.addEventListener('scroll', medir, true)
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('scroll', medir, true)
      window.removeEventListener('resize', medir)
    }
  }, [aberto, ancora, largura])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node
      if (painel.current?.contains(alvo) || ancora.current?.contains(alvo)) return
      aoFechar()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // O Escape fecha o painel, nao o modal por baixo dele.
      e.stopPropagation()
      aoFechar()
      ancora.current?.focus()
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc, true)
    }
  }, [aberto, aoFechar, ancora])

  if (!aberto || !pos) return null
  return createPortal(
    <div
      ref={painel}
      {...aria}
      className={`vidro-denso vidro-flutuante fixed z-[70] overflow-auto animate-scaleIn ${className}`}
      style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: Math.min(pos.maxHeight, 320), transformOrigin: pos.top !== undefined ? 'top center' : 'bottom center' }}
    >
      {children}
    </div>,
    document.body,
  )
}
