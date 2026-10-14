import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ToastContainer, type ToastData } from '@/components/ui/toast'

type Avisar = (type: ToastData['type'], message: string) => void

const ToastContext = createContext<Avisar | undefined>(undefined)

/** Avisos de sucesso e erro, no lugar do `alert()` do navegador. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const avisar = useCallback<Avisar>((type, message) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const remover = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const valor = useMemo(() => avisar, [avisar])

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remover} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider')
  }
  return context
}
