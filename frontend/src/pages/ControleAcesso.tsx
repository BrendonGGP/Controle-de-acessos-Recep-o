import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatPhone, formatName, normalizePhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, ArrowRightLeft, UserCheck, Loader2, X, Bell } from 'lucide-react'

type Collaborator = { id: string; name: string }
type AccessLog = {
  id: string
  action: string
  category: string
  visitor_name: string
  document: string
  created_at: string
}

export function ControleAcesso() {
  const { user } = useAuth()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [action, setAction] = useState('entrada')
  const [category, setCategory] = useState('visitas_reunioes')
  const [visitorName, setVisitorName] = useState('')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [observations, setObservations] = useState('')
  const [notify, setNotify] = useState(false)
  const [collaboratorId, setCollaboratorId] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    const [collabsRes, logsRes] = await Promise.all([
      supabase.from('collaborators').select('id, name').order('name'),
      supabase.from('access_logs').select('id, action, category, visitor_name, document, created_at').order('created_at', { ascending: false }).limit(20)
    ])
    if (collabsRes.data) setCollaborators(collabsRes.data)
    if (logsRes.data) setLogs(logsRes.data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    if (!visitorName) {
      setError('Nome do visitante é obrigatório')
      setFormLoading(false)
      return
    }

    if (notify && !collaboratorId) {
      setError('Selecione um colaborador para notificar')
      setFormLoading(false)
      return
    }

    try {
      // Telefone do visitante é opcional, mas se preenchido precisa ser válido
      let cleanPhone: string | null = null
      if (phone.trim()) {
        cleanPhone = normalizePhone(phone)
        if (!cleanPhone) {
          throw new Error('Telefone inválido. Informe DDD + número (ex: (11) 98765-4321).')
        }
      }

      const { data: newLog, error: insertError } = await supabase
        .from('access_logs')
        .insert({
          action,
          category,
          visitor_name: visitorName,
          document,
          phone: cleanPhone,
          observations,
          notify,
          notified_collaborator_id: notify ? collaboratorId : null,
          created_by: user?.id ?? null
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Se a notificação estiver ativada, chama a Edge Function diretamente!
      if (notify && newLog) {
        const { error: invokeError } = await supabase.functions.invoke('notify-access', {
          body: { record: newLog }
        })
        if (invokeError) {
          alert('Log salvo, mas erro ao notificar WhatsApp: ' + invokeError.message)
        }
      }

      setIsModalOpen(false)
      resetForm()
      fetchInitialData() // refresh logs
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar acesso')
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setAction('entrada')
    setCategory('visitas_reunioes')
    setVisitorName('')
    setDocument('')
    setPhone('')
    setObservations('')
    setNotify(false)
    setCollaboratorId('')
    setError(null)
  }

  const formatCategory = (cat: string) => {
    return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Controle de Acesso</h1>
          <p className="text-[var(--color-text-secondary)]">Registre entradas e saídas de visitantes e prestadores.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)] text-white shadow-lg">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Registrar Acesso
        </Button>
      </div>

      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="text-lg text-[var(--color-text)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" />
            Últimos Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-center p-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--color-text-secondary)] uppercase bg-[var(--color-preenchimento)]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Data/Hora</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Visitante</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 rounded-tr-lg">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-nav-hover)] transition-colors">
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.action === 'entrada' ? 'bg-[var(--color-sucesso)]/10 text-[var(--color-sucesso)] border border-emerald-500/20' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-rose-500/20'
                        }`}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text)] font-medium">{log.visitor_name}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCategory(log.category)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{log.document || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Customizado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgb(16_24_40/.45)] backdrop-blur-sm animate-fadeIn">
          <Card className="w-full max-w-lg bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border)] pb-4">
              <CardTitle className="text-xl text-[var(--color-text)]">Registrar Acesso</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action" className="text-[var(--color-text-secondary)]">Ação *</Label>
                  <select 
                    id="action" 
                    value={action} 
                    onChange={e => setAction(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[var(--color-text-secondary)]">Categoria *</Label>
                  <select 
                    id="category" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="visitas_reunioes">Visitas/Reuniões</option>
                    <option value="prestadores_servico">Prestadores de Serviço</option>
                    <option value="entregas_mercadoria">Entregas</option>
                    <option value="entrevista_rh">Entrevista RH</option>
                    <option value="stands">Stands</option>
                    <option value="treinamentos_onboarding">Treinamentos</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitorName" className="text-[var(--color-text-secondary)]">Nome do Visitante *</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-2.5 h-5 w-5 text-[var(--color-text-muted)]" />
                  <Input id="visitorName" value={visitorName} onChange={e => setVisitorName(formatName(e.target.value))} required className="pl-10 bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" placeholder="Nome completo" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document" className="text-[var(--color-text-secondary)]">Documento (RG/CPF)</Label>
                  <Input id="document" type="tel" inputMode="numeric" value={document} onChange={e => setDocument(e.target.value)} className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[var(--color-text-secondary)]">Telefone</Label>
                  <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Ex: (11) 99999-9999" className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations" className="text-[var(--color-text-secondary)]">Observações</Label>
                <Input id="observations" value={observations} onChange={e => setObservations(e.target.value)} className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-[var(--color-text-secondary)] text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#b45309]" />
                    Enviar aviso via WhatsApp para colaborador
                  </span>
                </label>

                {notify && (
                  <div className="space-y-2 animate-slide-down">
                    <Label htmlFor="collaborator" className="text-[var(--color-text-secondary)]">Selecione o Colaborador *</Label>
                    <select 
                      id="collaborator" 
                      value={collaboratorId} 
                      onChange={e => setCollaboratorId(e.target.value)} 
                      required={notify}
                      className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">Selecione...</option>
                      {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)] text-white">
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Registrar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
