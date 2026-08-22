import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Building2, 
  CalendarDays, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function AppLayout() {
  const { role, user, signOut } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.from('.logo-anim', {
      y: -20,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    })
    
    gsap.from('.nav-item', {
      x: -20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.2
    })
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
    <div className="h-screen bg-slate-950 flex overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside ref={sidebarRef} className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800">
        <div className="p-6 flex items-center justify-center border-b border-slate-800/50">
          <div className="logo-anim flex flex-col items-center select-none">
            <div className="text-4xl font-bold tracking-tighter text-white relative flex leading-none">
              <span>G</span>
              <span className="relative">
                G
                <div className="absolute top-[46%] -left-[40%] w-[170%] h-[4px] bg-[#00819c] z-10"></div>
              </span>
              <span className="text-[#00819c]">P</span>
            </div>
            <span className="text-[10px] font-light tracking-[0.15em] text-white mt-2 uppercase text-center w-full">
              Grupo Gomes Pires
            </span>
          </div>
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
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{role}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-950/30"
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
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center select-none">
            <div className="text-2xl font-bold tracking-tighter text-white relative flex leading-none">
              <span>G</span>
              <span className="relative">
                G
                <div className="absolute top-[46%] -left-[40%] w-[170%] h-[3px] bg-[#00819c] z-10"></div>
              </span>
              <span className="text-[#00819c]">P</span>
            </div>
            <span className="text-[8px] font-light tracking-[0.1em] text-slate-400 ml-2 uppercase border-l border-slate-700 pl-2">
              Grupo<br/>Gomes Pires
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="w-6 h-6 text-slate-300" />
          </Button>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-2 absolute top-16 w-full z-50 shadow-xl">
            {filteredNav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg ${
                  location.pathname.startsWith(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-slate-800">
               <Button variant="ghost" className="w-full justify-start text-red-400" onClick={signOut}>
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
