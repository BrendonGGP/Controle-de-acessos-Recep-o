import { useRef } from 'react'
import { Moon, Sun } from './icones'
import { alternarTema, useTema } from '@/lib/tema'

/** Botao redondo da barra que troca claro/escuro (o circulo nasce dele). */
export function AlternarTema({ className = '' }: { className?: string }) {
  const tema = useTema()
  const botao = useRef<HTMLButtonElement>(null)
  const rotulo = tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'
  return (
    <button
      ref={botao}
      type="button"
      onClick={() => alternarTema(botao.current)}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-[rgb(var(--tinta)/.055)] active:scale-95 ${className}`}
      style={{ color: 'var(--color-nav-text)' }}
      aria-label={rotulo}
      title={rotulo}
    >
      {tema === 'escuro' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
