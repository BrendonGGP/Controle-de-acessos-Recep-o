import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCPF, formatPhone, formatName, normalizePhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserPlus, Loader2, X, Phone, Mail, FileText, Edit2 } from 'lucide-react'

type Collaborator = {
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  created_at: string
}

export function Cadastro() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')

  useEffect(() => {
    fetchCollaborators()
  }, [])

  async function fetchCollaborators() {
    setLoading(true)
    const { data } = await supabase
      .from('collaborators')
      .select('*')
      .order('name')
    
    if (data) setCollaborators(data)
    setLoading(false)
  }

  const openNewModal = () => {
    setEditingId(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (collab: Collaborator) => {
    setEditingId(collab.id)
    setName(collab.name)
    setEmail(collab.email || '')
    setPhone(formatPhone(collab.phone))
    setCpf(collab.cpf ? formatCPF(collab.cpf) : '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    if (!name || !phone) {
      setError('Nome e Telefone são obrigatórios (usado para o WhatsApp).')
      setFormLoading(false)
      return
    }

    try {
      const cleanPhone = normalizePhone(phone)
      if (!cleanPhone) {
        throw new Error('Telefone inválido. Informe DDD + número (ex: (11) 98765-4321).')
      }
      const cleanCpf = cpf.replace(/\D/g, '')

      if (editingId) {
        const { error: updateError } = await supabase
          .from('collaborators')
          .update({ name, email, phone: cleanPhone, cpf: cleanCpf })
          .eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('collaborators')
          .insert({ name, email, phone: cleanPhone, cpf: cleanCpf })
        if (insertError) throw insertError
      }

      setIsModalOpen(false)
      resetForm()
      fetchCollaborators() // refresh
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar colaborador')
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCpf('')
    setError(null)
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Colaboradores</h1>
          <p className="text-slate-400">Gerencie os colaboradores para receberem notificações.</p>
        </div>
        <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Colaborador
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : collaborators.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum colaborador cadastrado.</p>
          </div>
        ) : (
          collaborators.map((collab) => (
            <Card key={collab.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors group">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <CardTitle className="text-lg text-white font-semibold truncate flex-1 pr-2">{collab.name}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => openEditModal(collab)}
                  className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center text-slate-400 text-sm">
                  <Phone className="w-4 h-4 mr-2 text-slate-500" />
                  {formatPhone(collab.phone)}
                </div>
                {collab.email && (
                  <div className="flex items-center text-slate-400 text-sm">
                    <Mail className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="truncate">{collab.email}</span>
                  </div>
                )}
                {collab.cpf && (
                  <div className="flex items-center text-slate-400 text-sm">
                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                    {formatCPF(collab.cpf)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Customizado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 shadow-2xl flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <CardTitle className="text-xl text-white">{editingId ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Nome Completo *</Label>
                <Input id="name" value={name} onChange={e => setName(formatName(e.target.value))} required className="bg-slate-950 border-slate-700 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">Telefone (WhatsApp) *</Label>
                <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required placeholder="Ex: (11) 99999-9999" className="bg-slate-950 border-slate-700 text-white" />
                <p className="text-xs text-slate-500">O sistema irá formatar e incluir o 55 automaticamente.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-950 border-slate-700 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-slate-300">CPF</Label>
                <Input id="cpf" type="tel" inputMode="numeric" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} maxLength={14} className="bg-slate-950 border-slate-700 text-white" />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
