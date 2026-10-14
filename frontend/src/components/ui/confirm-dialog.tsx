import type { ReactNode } from 'react'
import { Modal } from './modal'
import { Button } from './button'
import { AlertTriangle } from '../icones'

/**
 * Confirmacao de acao destrutiva (ui/ConfirmDialog do GGPost), no lugar do
 * `confirm()` do navegador.
 */
export function ConfirmDialog({ aberto, aoFechar, aoConfirmar, titulo, mensagem, children, rotuloConfirmar = 'Excluir', carregando = false, erro }: {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  mensagem: ReactNode
  /** Detalhe opcional abaixo da mensagem (o que acontece ao confirmar). */
  children?: ReactNode
  rotuloConfirmar?: string
  carregando?: boolean
  erro?: string | null
}) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={titulo} tamanho="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle size={30} style={{ color: 'var(--color-danger)' }} />
        <p className="text-[15px] leading-[22px]" style={{ color: 'var(--color-text-secondary)' }}>{mensagem}</p>
        {children}
        {erro && <p role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>{erro}</p>}
        <div className="flex w-full gap-2.5 pt-1">
          <Button variant="secondary" className="flex-1" onClick={aoFechar} disabled={carregando}>
            Cancelar
          </Button>
          <Button variant="destructive" className="flex-1" onClick={aoConfirmar} disabled={carregando}>
            {carregando ? <span className="pontos-pulando" aria-label="Excluindo"><i /><i /><i /></span> : rotuloConfirmar}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
