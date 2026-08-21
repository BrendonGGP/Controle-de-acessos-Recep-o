import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPhone, formatName } from '@/lib/utils'
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
      let cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone
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
          notified_collaborator_id: notify ? collaboratorId : null
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Controle de Acesso</h1>
          <p className="text-slate-400">Registre entradas e saídas de visitantes e prestadores.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Registrar Acesso
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Últimos Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-slate-400 text-center p-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
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
                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.action === 'entrada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{log.visitor_name}</td>
                      <td className="px-4 py-3 text-slate-400">{formatCategory(log.category)}</td>
                      <td className="px-4 py-3 text-slate-400">{log.document || '-'}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-700 shadow-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <CardTitle className="text-xl text-white">Registrar Acesso</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action" className="text-slate-300">Ação *</Label>
                  <select 
                    id="action" 
                    value={action} 
                    onChange={e => setAction(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-300">Categoria *</Label>
                  <select 
                    id="category" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <Label htmlFor="visitorName" className="text-slate-300">Nome do Visitante *</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                  <Input id="visitorName" value={visitorName} onChange={e => setVisitorName(formatName(e.target.value))} required className="pl-10 bg-slate-950 border-slate-700 text-white" placeholder="Nome completo" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document" className="text-slate-300">Documento (RG/CPF)</Label>
                  <Input id="document" type="tel" inputMode="numeric" value={document} onChange={e => setDocument(e.target.value)} className="bg-slate-950 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Telefone</Label>
                  <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Ex: (11) 99999-9999" className="bg-slate-950 border-slate-700 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations" className="text-slate-300">Observações</Label>
                <Input id="observations" value={observations} onChange={e => setObservations(e.target.value)} className="bg-slate-950 border-slate-700 text-white" />
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-300 text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Enviar aviso via WhatsApp para colaborador
                  </span>
                </label>

                {notify && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="collaborator" className="text-slate-300">Selecione o Colaborador *</Label>
                    <select 
                      id="collaborator" 
                      value={collaboratorId} 
                      onChange={e => setCollaboratorId(e.target.value)} 
                      required={notify}
                      className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
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
