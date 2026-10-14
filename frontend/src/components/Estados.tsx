import type { ReactNode } from 'react'
import { AlertCircle, RefreshCw } from './icones'

/**
 * Os estados de toda lista, como no GGPost: skeleton com a forma do conteudo,
 * vazio (icone numa peca neutra) e erro tratado com "Tentar novamente".
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function EstadoVazio({ icone, titulo, descricao, acao }: {
  icone?: ReactNode
  titulo: string
  descricao?: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 pb-[52px] pt-14 text-center">
      {icone && (
        <div
          className="grid size-12 place-items-center rounded-[15px]"
          style={{ backgroundColor: 'var(--color-preenchimento-2)', color: 'var(--color-icone)' }}
        >
          {icone}
        </div>
      )}
      <p className="mt-5 text-[19px] font-semibold tracking-[-.02em]" style={{ color: 'var(--color-text)' }}>{titulo}</p>
      {descricao && (
        <p className="mt-1.5 max-w-sm text-[14.5px] leading-[21px]" style={{ color: 'var(--color-text-secondary)' }}>{descricao}</p>
      )}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}

export function EstadoErro({ mensagem, onTentarNovamente }: { mensagem: string; onTentarNovamente?: () => void }) {
  return (
    <div className="folha flex items-start gap-3 p-5" role="alert">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-[13px]"
        style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
      >
        <AlertCircle size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
          Não foi possível carregar
        </p>
        <p className="mt-0.5 break-words text-sm" style={{ color: 'var(--color-text-secondary)' }}>{mensagem}</p>
        {onTentarNovamente && (
          <button
            type="button"
            onClick={onTentarNovamente}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors hover:bg-[var(--color-primary-bg-hover)]"
            style={{ color: 'var(--color-primary-hover)', backgroundColor: 'var(--color-primary-bg)' }}
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}

/** Erro de formulario: faixa calma na tinta de perigo, sem caixa contornada. */
export function AvisoErro({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-sm leading-5"
      style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
    >
      <AlertCircle size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** Tres pontos pulando — o gesto do logotipo para "carregando" e "salvando". */
export function Carregando({ rotulo = 'Carregando' }: { rotulo?: string }) {
  return (
    <span role="status" aria-label={rotulo} className="pontos-pulando" style={{ color: 'var(--color-primary)' }}>
      <i /><i /><i />
    </span>
  )
}
