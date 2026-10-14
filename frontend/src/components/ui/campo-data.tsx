import { useCallback, useId, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from '../icones'
import { Flutuante } from './flutuante'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function dataParaExibicao(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return ''
  const [a, m, d] = valor.split('-')
  return `${d}/${m}/${a}`
}

/**
 * Campo de data com calendario proprio, como o do GGPost (ui/CampoData de la):
 * o campo do navegador tem a cara do sistema operacional e destoa do resto. Aqui
 * ele tem a forma de campo de formulario (mesma altura, cinza e canto do Input).
 * O valor entra e sai como AAAA-MM-DD; quem le a tela ve dia/mes/ano.
 */
export function CampoData({ label, valor, aoMudar, id, className = '' }: {
  label?: string
  valor: string
  aoMudar: (iso: string) => void
  id?: string
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const hoje = new Date()
  const hojeIso = iso(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const inicial = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : hoje
  const [mes, setMes] = useState(inicial.getMonth())
  const [ano, setAno] = useState(inicial.getFullYear())
  const botao = useRef<HTMLButtonElement>(null)
  const gerado = useId()
  const campoId = id || gerado
  const fechar = useCallback(() => setAberto(false), [])

  function abrir() {
    // Reabre no mes da data escolhida, e nao no ultimo mes que se folheou.
    const base = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : hoje
    setMes(base.getMonth())
    setAno(base.getFullYear())
    setAberto(true)
  }

  function andar(passo: number) {
    const novo = new Date(ano, mes + passo, 1)
    setMes(novo.getMonth())
    setAno(novo.getFullYear())
  }

  function escolher(data: string) {
    aoMudar(data)
    setAberto(false)
    botao.current?.focus()
  }

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const celulas = [...Array(primeiroDiaSemana).fill(0), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={campoId} className="text-[13px] font-medium text-[var(--color-text-secondary)]">{label}</label>
      )}
      <button
        ref={botao}
        id={campoId}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border px-3.5 text-left text-[15px] tabular-nums transition-[background-color,box-shadow,border-color] duration-200 focus:outline-none focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_4px_rgba(55,128,157,.14)] ${
          aberto
            ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[0_0_0_4px_rgba(55,128,157,.14)]'
            : 'border-transparent bg-[var(--color-preenchimento)] hover:bg-[var(--color-preenchimento-2)]'
        }`}
        style={{ color: valor ? 'var(--color-text)' : 'var(--color-placeholder-controle)' }}
      >
        <span>{valor ? dataParaExibicao(valor) : 'dd/mm/aaaa'}{valor === hojeIso && <span className="ml-2 text-[13px]" style={{ color: 'var(--color-nav-text)' }}>hoje</span>}</span>
        <Calendar size={16} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
      </button>

      <Flutuante
        ancora={botao}
        aberto={aberto}
        aoFechar={fechar}
        largura={272}
        role="dialog"
        aria-label={`Escolher data${label ? ` — ${label}` : ''}`}
        className="rounded-[20px] p-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => andar(-1)}
            className="grid size-8 place-items-center rounded-full transition-colors hover:bg-[rgb(var(--tinta)/.055)]"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            {MESES[mes]} de {ano}
          </span>
          <button
            type="button"
            onClick={() => andar(1)}
            className="grid size-8 place-items-center rounded-full transition-colors hover:bg-[rgb(var(--tinta)/.055)]"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Próximo mês"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {DIAS.map((d, i) => (
            <span key={i} aria-hidden="true" className="py-1 text-center text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{d}</span>
          ))}
          {celulas.map((dia, i) => {
            if (!dia) return <span key={`v${i}`} />
            const data = iso(ano, mes, dia)
            const escolhido = data === valor
            const ehHoje = data === hojeIso
            return (
              <button
                key={data}
                type="button"
                onClick={() => escolher(data)}
                aria-label={`${dia} de ${MESES[mes]} de ${ano}`}
                aria-current={ehHoje ? 'date' : undefined}
                aria-pressed={escolhido}
                className={`h-8 rounded-full text-[12px] tabular-nums transition-colors ${escolhido ? '' : 'hover:bg-[rgb(var(--tinta)/.055)]'}`}
                style={{
                  backgroundColor: escolhido ? 'var(--color-primary)' : 'transparent',
                  color: escolhido ? '#ffffff' : ehHoje ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: escolhido || ehHoje ? 600 : 400,
                }}
              >
                {dia}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex justify-end border-t pt-2" style={{ borderColor: 'var(--color-filete)' }}>
          <button
            type="button"
            onClick={() => escolher(hojeIso)}
            className="h-8 rounded-full px-3 text-[13px] font-semibold transition-colors hover:bg-[var(--color-primary-bg)]"
            style={{ color: 'var(--color-primary)' }}
          >
            Hoje
          </button>
        </div>
      </Flutuante>
    </div>
  )
}
