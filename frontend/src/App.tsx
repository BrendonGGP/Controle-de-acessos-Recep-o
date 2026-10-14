import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Salas } from './pages/Salas'
import { ControleAcesso } from './pages/ControleAcesso'
import { Cadastro } from './pages/Cadastro'
import { Mensagens } from './pages/Mensagens'
import { Admin } from './pages/Admin'
import { NaoEncontrada } from './pages/NaoEncontrada'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/salas" replace />} />
              <Route path="/salas" element={<Salas />} />
              <Route path="/controle-acesso" element={<ControleAcesso />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/mensagens" element={<Mensagens />} />

              {/* Rota restrita para Admin */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
