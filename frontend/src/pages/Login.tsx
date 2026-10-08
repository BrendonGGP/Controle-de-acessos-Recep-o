import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, Mail, Loader2 } from 'lucide-react'
import { LogoGGP } from '@/components/LogoGGP'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.to('.bg-gradient-anim', {
      rotation: 360,
      duration: 100,
      repeat: -1,
      ease: 'linear',
      transformOrigin: 'center center'
    })

    gsap.fromTo('.animate-slide-up', 
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: 'power3.out' }
    )
  }, { scope: containerRef })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      setLoading(false)
    } else {
      navigate('/salas')
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full pointer-events-none">
        <div className="bg-gradient-anim absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary-bg)] rounded-full blur-3xl mix-blend-screen" />
        <div className="bg-gradient-anim absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl mix-blend-screen" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="animate-slide-up flex flex-col items-center mb-8 select-none">
          <div className="flex flex-col items-center justify-center mb-6">
            <LogoGGP altura={72} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text)] tracking-tight">Portaria Inteligente</h1>
          <p className="text-[var(--color-text-secondary)] mt-2 tracking-[0.2em] uppercase text-xs font-medium">Grupo Gomes Pires</p>
        </div>

        <Card className="animate-slide-up bg-[var(--color-surface)]/60 border-[var(--color-border)] backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-[var(--color-text)]">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">
              Insira suas credenciais para continuar
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--color-text-secondary)]">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-[var(--color-text-muted)]" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nome@grupogomespires.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-[var(--color-preenchimento)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-[var(--color-primary)]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[var(--color-text-secondary)]">Senha</Label>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-5 w-5 text-[var(--color-text-muted)]" />
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-[var(--color-preenchimento)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-[var(--color-primary)]"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)] text-white shadow-lg transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
