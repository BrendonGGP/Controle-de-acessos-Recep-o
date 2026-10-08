import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  CalendarDays,
  ShieldCheck, 
  Users, 
  MessageSquare, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoGGP } from '@/components/LogoGGP'
import { useState, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function AppLayout() {
  const { role, user, signOut } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.fromTo('.logo-anim', 
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    )
    
    gsap.fromTo('.nav-item', 
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.2 }
    )
  }, { scope: sidebarRef })

  const navItems = [
    { name: 'Salas de Reunião', href: '/salas', icon: CalendarDays, roles: ['admin', 'recepcao'] },
    { name: 'Controle de Acesso', href: '/controle-acesso', icon: ShieldCheck, roles: ['admin', 'recepcao'] },
    { name: 'Colaboradores', href: '/cadastro', icon: Users, roles: ['admin', 'recepcao'] },
    { name: 'Mensagens', href: '/mensagens', icon: MessageSquare, roles: ['admin', 'recepcao'] },
    { name: 'Administração', href: '/admin', icon: Settings, roles: ['admin'] },
  ]

  const filteredNav = navItems.filter(item => item.roles.includes(role || ''))

  return (
    <div className="h-screen bg-[var(--color-bg)] flex overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside ref={sidebarRef} className="hidden md:flex flex-col w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
        <div className="p-6 flex items-center justify-center border-b border-[var(--color-border)]">
          <LogoGGP altura={40} comAssinatura className="logo-anim" />
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 space-y-2">
          {filteredNav.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-[var(--color-primary)] text-white shadow-md' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-preenchimento-2)]/50 hover:text-[var(--color-text)]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">{user?.email}</p>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mt-1">{role}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair do sistema
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="flex items-center select-none">
            <LogoGGP altura={24} />
            <span className="text-[8px] font-light tracking-[0.1em] text-[var(--color-text-secondary)] ml-2 uppercase border-l border-[var(--color-border)] pl-2">
              Grupo<br/>Gomes Pires
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="w-6 h-6 text-[var(--color-text-secondary)]" />
          </Button>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-4 space-y-2 absolute top-16 w-full z-50 shadow-xl">
            {filteredNav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg ${
                  location.pathname.startsWith(item.href)
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-[var(--color-border)]">
               <Button variant="ghost" className="w-full justify-start text-[var(--color-danger)]" onClick={signOut}>
                <LogOut className="w-5 h-5 mr-3" />
                Sair
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
