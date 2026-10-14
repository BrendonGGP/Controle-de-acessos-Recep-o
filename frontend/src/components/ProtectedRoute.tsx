import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Carregando } from '@/components/Estados'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'recepcao'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, role, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Carregando rotulo="Abrindo a recepção" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    // Se a rota exige admin, e o usuário não é admin (é recepcao)
    return <Navigate to="/salas" replace />
  }

  return <>{children}</>
}
