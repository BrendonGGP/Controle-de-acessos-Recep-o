import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PATH_G, PATH_P, PATH_OST } from '@/components/marcaDesenho'
import { CalendarDays, DoorOpen, Whatsapp } from '@/components/icones'
import { dotGrid } from '@/components/entrada/dotGrid'
import { useTitulo } from '@/hooks/useTitulo'
import '@/components/entrada/entrada.css'

const GRAFITE = '#3E4347'
const PETROLEO = '#37809D'

type EstadoBotao = 'idle' | 'loading' | 'done'

const FEITOS = [
  { Icone: CalendarDays, titulo: 'Salas agora', texto: 'Quem está em cada sala e até que horas.' },
  { Icone: DoorOpen, titulo: 'Entradas e saídas', texto: 'Cada visitante e prestador registrado na chegada.' },
  { Icone: Whatsapp, titulo: 'Aviso no WhatsApp', texto: 'Quem recebe a visita fica sabendo na hora.' },
]

/**
 * Entrada da recepcao — irma da tela de entrada do GGPost: fundo de pontos,
 * logotipo da suite digitando, titulo em Jost e o cartao de acesso.
 */
export function Login() {
  useTitulo('Entrar')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [estado, setEstado] = useState<EstadoBotao>('idle')
  const [error, setError] = useState<string | null>(null)
  const [digitando, setDigitando] = useState(true)
  const canvas = useRef<HTMLCanvasElement>(null)
  const senha = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const parar = dotGrid(canvas.current!, reduce)
    // Os pontos do P digitam enquanto a tela se monta, depois param.
    const t = window.setTimeout(() => setDigitando(false), 1800)
    return () => { parar(); clearTimeout(t) }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setEstado('loading')
    setDigitando(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha não conferem. Confira e tente de novo.')
      setEstado('idle')
      setDigitando(false)
      senha.current?.select()
    } else {
      // Um instante no "Entrando" para o check aparecer antes da troca de tela.
      setEstado('done')
      window.setTimeout(() => navigate('/salas'), 420)
    }
  }

  return (
    <div className="gg-entrada">
      <canvas ref={canvas} className="dots" aria-hidden="true" />
      <div className="layout">
        <section className="story">
          <span className={`brand in-up ${digitando ? 'typing' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="22 28 504 170" role="img" aria-label="GGPost">
              <path d={PATH_G} fill={GRAFITE} />
              <path d={PATH_G} transform="translate(117 0)" fill={GRAFITE} />
              <path d={PATH_P} fill={PETROLEO} fillRule="evenodd" />
              <circle className="dot" cx="295" cy="72" r="4.8" fill={PETROLEO} />
              <circle className="dot" cx="307.5" cy="72" r="4.8" fill={PETROLEO} />
              <circle className="dot" cx="320" cy="72" r="4.8" fill={PETROLEO} />
              <path d={PATH_OST} transform="translate(-10 0)" fill={GRAFITE} />
            </svg>
            <span className="produto">Recepção</span>
          </span>

          <p className="headline in-up" style={{ '--d': '80ms' } as CSSProperties}>
            A porta de <span className="mv">entrada</span> do grupo.
          </p>
          <p className="lede in-up" style={{ '--d': '160ms' } as CSSProperties}>
            Salas, visitantes e avisos no WhatsApp, no mesmo lugar para quem está no balcão.
          </p>

          <ul className="feitos">
            {FEITOS.map(({ Icone, titulo, texto }, i) => (
              <li key={titulo} className="feito in-up" style={{ '--d': `${240 + i * 70}ms` } as CSSProperties}>
                <span className="tile"><Icone size={20} /></span>
                <span><b>{titulo}</b><small>{texto}</small></span>
              </li>
            ))}
          </ul>
        </section>

        <main className="auth">
          <div className="in-up" style={{ '--d': '120ms' } as CSSProperties}>
            <div className="card">
              <h1>Entrar na <span className="nm">Recepção</span></h1>
              <p className="sub">Use o e-mail e a senha que a administração cadastrou para você.</p>

              <form onSubmit={handleLogin}>
                <div className="lbl-row"><label htmlFor="email">E-mail corporativo</label></div>
                <div className={`inp${error ? ' invalid' : ''}`}>
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" />
                  </svg>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="nome@grupogomespires.com.br"
                    required
                    autoFocus
                    value={email}
                    aria-invalid={error ? true : undefined}
                    aria-describedby="login-err"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <p className="err" aria-hidden="true" />

                <div className="lbl-row"><label htmlFor="password">Senha</label></div>
                <div className={`inp pw${error ? ' invalid' : ''}`}>
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  <input
                    ref={senha}
                    id="password"
                    name="password"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    required
                    value={password}
                    aria-invalid={error ? true : undefined}
                    aria-describedby="login-err"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle"
                    aria-pressed={mostrarSenha}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => { setMostrarSenha((v) => !v); senha.current?.focus({ preventScroll: true }) }}
                  >
                    {mostrarSenha ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 5.4-1.4" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
                <p className="err" id="login-err" aria-live="polite">{error}</p>

                <button className={`btn${estado === 'idle' ? '' : ` ${estado}`}`} type="submit" aria-busy={estado === 'loading' || undefined}>
                  <span className="st st-idle">Entrar</span>
                  <span className="st st-load" aria-hidden="true"><i /><i /><i /></span>
                  <span className="st st-done" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    Entrando
                  </span>
                </button>
              </form>
            </div>
            <p className="note">Uso exclusivo da recepção do Grupo Gomes Pires.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
