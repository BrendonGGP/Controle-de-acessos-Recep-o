import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { MarcaRecepcao } from '@/components/Marca'
import { AlternarTema } from '@/components/AlternarTema'
import { IconContext } from '@/components/iconeContexto'
import { CalendarDays, DoorOpen, LogOut, MessageSquare, SlidersHorizontal, Users, type IconProps } from '@/components/icones'
import { useAgora } from '@/hooks/useAgora'
import { MOLA_LENTE, semMovimento } from '@/lib/movimento'
import { gsap, useGSAP, CURVA, COM_MOVIMENTO } from '@/lib/gsap'

type ItemNavegacao = {
  to: string
  rotulo: string
  /** Rotulo da barra inferior do celular, onde cinco itens dividem 390px. */
  curto: string
  Icone: ComponentType<IconProps>
}

const NAV: ItemNavegacao[] = [
  { to: '/salas', rotulo: 'Salas', curto: 'Salas', Icone: CalendarDays },
  { to: '/controle-acesso', rotulo: 'Controle de acesso', curto: 'Acesso', Icone: DoorOpen },
  { to: '/cadastro', rotulo: 'Colaboradores', curto: 'Pessoas', Icone: Users },
  { to: '/mensagens', rotulo: 'Mensagens', curto: 'Mensagens', Icone: MessageSquare },
]
const NAV_ADMIN: ItemNavegacao = { to: '/admin', rotulo: 'Administração', curto: 'Admin', Icone: SlidersHorizontal }

/** Posicao da rota na navegacao — define de que lado o painel entra. */
function ordemDaRota(caminho: string): number {
  const i = [...NAV, NAV_ADMIN].findIndex((item) => caminho.startsWith(item.to))
  return i < 0 ? 0 : i + 1
}

// Fora do React de proposito: a abertura roda uma vez por carregamento, e o
// StrictMode monta a casca duas vezes no desenvolvimento.
let aberturaFeita = false

const ROTULO_PAPEL = { admin: 'Administrador', recepcao: 'Recepção' } as const

/**
 * Item da ilha. O ativo carrega a LENTE: uma pilula branca com `layoutId`
 * unico, entao a Motion a faz viajar do item anterior ate este com mola.
 */
function ItemNav({ item }: { item: ItemNavegacao }) {
  const semMov = useReducedMotion()
  const { Icone } = item
  return (
    <NavLink
      to={item.to}
      draggable={false}
      className={({ isActive }) =>
        `group relative flex h-10 select-none items-center gap-3 rounded-[20px] pl-3.5 pr-2.5 text-sm tracking-[-.006em] transition-colors duration-200 ${
          isActive ? 'font-semibold' : 'font-medium hover:bg-[rgb(var(--tinta)/.045)]'
        }`
      }
      style={({ isActive }) => ({ color: isActive ? 'var(--color-text)' : 'var(--color-nav-text)' })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="lente-lateral"
              aria-hidden="true"
              className="absolute inset-0 rounded-[20px] bg-[var(--color-lente)]"
              style={{ boxShadow: 'var(--sombra-lente)' }}
              transition={semMov ? semMovimento : MOLA_LENTE}
            />
          )}
          {/* Selecionado, o traco do icone engrossa e ganha a cor principal;
              sob o ponteiro, o icone anda um passo — o mesmo gesto da lente. */}
          <IconContext.Provider value={{ weight: isActive ? 'fill' : 'regular', size: 20 }}>
            <span
              className={`relative flex transition-[color,translate] duration-300 [transition-timing-function:var(--curva-mola)] ${isActive ? '' : 'group-hover:translate-x-0.5'}`}
              style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-icone)' }}
            >
              <Icone />
            </span>
          </IconContext.Provider>
          <span className="relative truncate">{item.rotulo}</span>
        </>
      )}
    </NavLink>
  )
}

/** Capsula de vidro da barra do topo. */
function Capsula({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div data-capsula className={`vidro pointer-events-auto flex h-[52px] items-center rounded-[26px] ${className}`}>{children}</div>
}

/**
 * Relogio da barra. Na recepcao a hora e informacao de trabalho — quem chega
 * pergunta pela reuniao "das 14h" —, entao ela ocupa o lugar que no GGPost e
 * da busca.
 */
function Relogio() {
  const agora = useAgora()
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dia = agora.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
  return (
    <time dateTime={agora.toISOString()} className="flex items-baseline gap-2 pl-[18px] pr-2">
      <span className="text-[15px] font-semibold tabular-nums tracking-[-.01em]" style={{ color: 'var(--color-text)' }}>{hora}</span>
      <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{dia}</span>
    </time>
  )
}

function Iniciais({ nome, tamanho = 40 }: { nome: string; tamanho?: number }) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const iniciais = ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36), backgroundColor: 'var(--color-primary)' }}
    >
      {iniciais}
    </span>
  )
}

/**
 * Casca da recepcao — a mesma do GGPost: ilha de vidro na lateral com a lente
 * que viaja, crachá no pé, capsulas no topo e o conteudo em folhas solidas por
 * baixo. No celular, topo de vidro e barra inferior flutuante com lente.
 */
export function AppLayout() {
  const { role, user, name, signOut } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const semMov = useReducedMotion()

  const itens = role === 'admin' ? [...NAV, NAV_ADMIN] : NAV
  const nome = name || user?.email?.split('@')[0] || 'Recepção'

  async function sair() {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Troca de rota, derivada no proprio render (o padrao do React para "valor
  // anterior"): de que lado o painel entra e o logotipo voltando a digitar.
  const ordem = ordemDaRota(pathname)
  const [rota, setRota] = useState({ caminho: pathname, ordem, sentido: 0 })
  const [digitando, setDigitando] = useState(true)
  if (rota.caminho !== pathname) {
    setRota({ caminho: pathname, ordem, sentido: ordem === rota.ordem ? 0 : ordem > rota.ordem ? 1 : -1 })
    setDigitando(true)
  }
  const sentido = rota.sentido

  // Os tres pontos do "P" digitam na abertura e a cada troca de secao,
  // enquanto a lente viaja. Parado, o logotipo fica parado.
  useEffect(() => {
    if (!digitando) return
    const t = window.setTimeout(() => setDigitando(false), aberturaFeita ? 900 : 1500)
    return () => clearTimeout(t)
  }, [digitando, pathname])

  // Abertura: a ilha se forma, o crachá sobe, as capsulas descem e o
  // conteudo chega. Uma vez por carregamento.
  const raiz = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (aberturaFeita) return
    aberturaFeita = true
    const r = raiz.current
    if (!r) return
    const mm = gsap.matchMedia()
    mm.add(COM_MOVIMENTO, () => {
      const q = (s: string) => r.querySelectorAll(s)
      gsap.timeline({ defaults: { ease: CURVA.saida, clearProps: 'transform,opacity,filter' } })
        .from(q('[data-abertura-ilha]'), { y: -14, scale: 0.9, opacity: 0, filter: 'blur(10px)', duration: 0.9 }, 0.12)
        .from(q('[data-abertura-cracha]'), { y: 18, scale: 0.94, opacity: 0, duration: 0.8, ease: CURVA.mola }, 0.6)
        .from(q('[data-capsula]'), { y: -12, scale: 0.94, opacity: 0, duration: 0.7, ease: CURVA.mola, stagger: 0.06 }, 0.42)
        .from(q('[data-abertura-conteudo]'), { y: 18, opacity: 0, duration: 0.76 }, 0.5)
        .from(q('[data-abertura-barra]'), { yPercent: 110, duration: 0.8 }, 0.1)
    })
  }, { scope: raiz })

  return (
    <div ref={raiz} className="min-h-screen">
      <a
        href="#conteudo"
        className="vidro fixed left-4 top-4 z-[80] -translate-y-24 rounded-full px-4 py-2.5 text-sm font-semibold focus:translate-y-0"
        style={{ color: 'var(--color-text)' }}
      >
        Pular para o conteúdo
      </a>

      {/* ── Ilha lateral (>=768px) ── */}
      <aside
        data-abertura-ilha
        aria-label="Navegação"
        className={`vidro-painel fixed left-4 top-4 z-30 hidden max-h-[calc(100vh-14rem)] w-[236px] overflow-y-auto rounded-[28px] p-2 md:block ${digitando ? 'digitando' : ''}`}
      >
        <div className="flex h-[54px] items-center pl-3.5 pr-2">
          <Link to="/salas" aria-label="GGPost Recepção, ir para as salas" className="rounded-lg">
            <MarcaRecepcao tamanho={23} />
          </Link>
        </div>
        <nav className="mt-0.5 flex flex-col gap-0.5">
          {NAV.map((item) => <ItemNav key={item.to} item={item} />)}
          {role === 'admin' && (
            <>
              <div className="mx-3.5 my-2 h-px" style={{ backgroundColor: 'var(--color-filete)' }} />
              <ItemNav item={NAV_ADMIN} />
            </>
          )}
        </nav>
      </aside>

      {/* ── Crachá: porta-crachá de vidro com o cartão branco de quem está no balcão ── */}
      <section
        data-abertura-cracha
        aria-label="Sua conta"
        className="vidro-painel fixed bottom-4 left-4 z-30 hidden w-[236px] rounded-[28px] p-2 md:block"
      >
        <div className="rounded-[20px] bg-[var(--color-surface)] p-3.5" style={{ boxShadow: 'var(--sombra-lente)' }}>
          <div className="flex items-center gap-3">
            <Iniciais nome={nome} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-.01em]" style={{ color: 'var(--color-text)' }}>{nome}</p>
              {role && (
                <span
                  className="mt-1 inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-semibold"
                  style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary-hover)' }}
                >
                  {ROTULO_PAPEL[role]}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: 'var(--color-filete)' }}>
            <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--color-nav-text)' }}>
              <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--color-online)' }} />
              Conectado
            </span>
            <button
              type="button"
              onClick={() => void sair()}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] active:translate-y-px"
              style={{ color: 'var(--color-nav-text)' }}
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </section>

      {/* ── Area de rolagem: so o conteudo rola; a casca nao se mexe. ── */}
      <div data-rolagem className="h-dvh overflow-y-auto overscroll-contain">
        {/* Topo no celular: a lateral some abaixo de 768px e a marca continua aqui. */}
        <header className={`vidro sticky top-0 z-20 flex h-14 items-center gap-1 pl-4 pr-2 md:hidden ${digitando ? 'digitando' : ''}`} style={{ borderRadius: 0 }}>
          <MarcaRecepcao tamanho={22} />
          <AlternarTema className="ml-auto" />
          <button
            type="button"
            onClick={() => void sair()}
            className="grid size-10 place-items-center rounded-full transition-colors hover:bg-[rgb(var(--tinta)/.055)]"
            style={{ color: 'var(--color-nav-text)' }}
            aria-label="Sair"
          >
            <LogOut size={20} />
          </button>
        </header>

        {/* ── Conteudo: o recuo abre espaco para a ilha (16 + 236 + 16). ── */}
        <div className="md:ml-[252px] md:pl-5 md:pr-4">
          {/* Barra do topo (desktop): flutua sobre o conteudo que rola. A faixa
              nao captura clique, so as capsulas. */}
          <div className="pointer-events-none sticky top-4 z-20 hidden h-[52px] md:mt-4 md:block">
            <div className="mx-auto flex h-full max-w-[1064px] items-center justify-end gap-2.5">
              <Capsula className="gap-1 pr-1.5">
                <Relogio />
                <AlternarTema />
              </Capsula>
            </div>
          </div>

          <div className="mx-auto max-w-[1064px]">
            <main id="conteudo" tabIndex={-1} data-abertura-conteudo className="min-w-0 px-4 pb-28 outline-none md:px-0">
              <div
                key={pathname}
                className={sentido !== 0 ? 'painel-entra' : undefined}
                style={sentido !== 0 ? ({ '--painel-de': `${sentido * 18}px` } as CSSProperties) : undefined}
              >
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* ── Barra inferior (celular) ── */}
      <nav aria-label="Navegação" data-abertura-barra className="vidro fixed inset-x-2 bottom-2 z-30 flex h-16 rounded-[24px] p-1 md:hidden">
        {itens.map(({ to, curto, Icone }) => (
          <NavLink
            key={to}
            to={to}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px]"
            style={({ isActive }) => ({ color: isActive ? 'var(--color-text)' : 'var(--color-nav-text)' })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="lente-barra"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[20px] bg-[var(--color-lente)]"
                    style={{ boxShadow: '0 0 0 .5px rgba(16,24,40,.09), 0 4px 12px -6px rgba(16,24,40,.2)' }}
                    transition={semMov ? semMovimento : MOLA_LENTE}
                  />
                )}
                <span className="relative flex" style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-icone)' }}>
                  <Icone size={20} weight={isActive ? 'fill' : 'regular'} />
                </span>
                <span className={`relative text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{curto}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
