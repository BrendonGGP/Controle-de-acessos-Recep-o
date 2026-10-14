import type { ReactNode } from 'react'

/**
 * Titulo grande da tela, no estilo Apple (o mesmo do GGPost): sobretitulo em
 * caixa alta, titulo de 34px e uma frase de abertura. Acoes da tela moram aqui,
 * alinhadas a base do titulo — nunca na barra do topo.
 */
export function CabecalhoPagina({ sobretitulo, titulo, descricao, acoes, className = '' }: {
  sobretitulo?: ReactNode
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
  className?: string
}) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1 pt-2 pb-5 md:pt-[30px] md:pb-[22px] ${className}`}>
      <div className="min-w-0">
        {sobretitulo && <p className="sobretitulo mb-1">{sobretitulo}</p>}
        <h1 className="titulo-grande">{titulo}</h1>
        {descricao && (
          <p className="mt-1.5 text-[17px] leading-6 tracking-[-.01em]" style={{ color: 'var(--color-text-secondary)' }}>
            {descricao}
          </p>
        )}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  )
}
