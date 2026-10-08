import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Settings, Building, Users as UsersIcon, Trash2, Plus, X, Shield, User, Edit2 } from 'lucide-react'

type Room = { id: string; name: string }
type SystemUser = { id: string; name: string; email: string; role: string }

export function Admin() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'users' | 'templates'>('rooms')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Users State
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('recepcao')

  useEffect(() => {
    if (activeTab === 'rooms') fetchRooms()
    if (activeTab === 'users') fetchUsers()
  }, [activeTab])

  // --- ROOMS LOGIC ---
  async function fetchRooms() {
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase.from('rooms').select('*').order('name')
    if (error) setFetchError(error.message)
    if (data) setRooms(data)
    setLoading(false)
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoomName) return
    setLoading(true)
    const { error } = await supabase.from('rooms').insert({ name: newRoomName })
    if (!error) {
      setNewRoomName('')
      fetchRooms()
    } else {
      alert('Erro ao criar sala: ' + error.message)
      setLoading(false)
    }
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta sala?')) return
    setLoading(true)
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (!error) fetchRooms()
    else { alert('Erro: ' + error.message); setLoading(false); }
  }

  // --- USERS LOGIC ---
  async function fetchUsers() {
    setLoadingUsers(true)
    const { data } = await supabase.from('system_users').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoadingUsers(false)
  }

  const openNewUserModal = () => {
    setEditingUserId(null)
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('recepcao')
    setIsUserModalOpen(true)
  }

  const openEditUserModal = (user: SystemUser) => {
    setEditingUserId(user.id)
    setNewUserName(user.name)
    setNewUserEmail(user.email)
    setNewUserPassword('') // empty so it won't update unless typed
    setNewUserRole(user.role)
    setIsUserModalOpen(true)
  }

  // Com status != 2xx o supabase-js devolve um FunctionsHttpError genérico e a
  // mensagem real fica no corpo da resposta — esta função a extrai.
  async function extractFunctionError(error: any, data: any): Promise<string | null> {
    if (data?.error) return data.error
    if (!error) return null
    try {
      const body = await error.context?.json()
      if (body?.error) return body.error
    } catch {
      // corpo não era JSON; usa a mensagem genérica
    }
    return error.message
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault()
    setLoadingUsers(true)
    
    if (editingUserId) {
      // UPDATE
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'update', 
          payload: { 
            id: editingUserId,
            name: newUserName, 
            email: newUserEmail, 
            password: newUserPassword || undefined, // only send if typed
            role: newUserRole 
          } 
        }
      })
      const msg = await extractFunctionError(error, data)
      if (msg) alert('Erro ao atualizar usuário: ' + msg)
      else { setIsUserModalOpen(false); fetchUsers(); }
    } else {
      // CREATE
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create', 
          payload: { name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole } 
        }
      })
      const msg = await extractFunctionError(error, data)
      if (msg) alert('Erro ao criar usuário: ' + msg)
      else { setIsUserModalOpen(false); fetchUsers(); }
    }
    
    setLoadingUsers(false)
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Deseja excluir este usuário permanentemente?')) return
    setLoadingUsers(true)
    const { error, data } = await supabase.functions.invoke('manage-users', {
      body: { action: 'delete', payload: { id } }
    })
    const msg = await extractFunctionError(error, data)
    if (msg) {
      alert('Erro ao excluir usuário: ' + msg)
    } else {
      fetchUsers()
    }
    setLoadingUsers(false)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[var(--color-primary)]" />
          Painel Administrativo
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Gerencie as configurações globais do sistema.</p>
      </div>

      <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
        <Button 
          variant={activeTab === 'rooms' ? 'default' : 'ghost'} 
          className={activeTab === 'rooms' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'}
          onClick={() => setActiveTab('rooms')}
        >
          <Building className="w-4 h-4 mr-2" />
          Salas de Reunião
        </Button>
        <Button 
          variant={activeTab === 'users' ? 'default' : 'ghost'} 
          className={activeTab === 'users' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'}
          onClick={() => setActiveTab('users')}
        >
          <UsersIcon className="w-4 h-4 mr-2" />
          Usuários do Sistema
        </Button>
      </div>

      {activeTab === 'rooms' && (
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--color-text)]">Gerenciamento de Salas</CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">
              Adicione ou remova salas de reunião. Elas aparecerão no dropdown de agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fetchError && (
              <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm font-mono">
                Erro do Banco: {fetchError}
              </div>
            )}
            <form onSubmit={handleAddRoom} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="roomName" className="text-[var(--color-text-secondary)]">Nova Sala</Label>
                <Input 
                  id="roomName" 
                  value={newRoomName} 
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="Ex: Sala de Inovação" 
                  className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" 
                />
              </div>
              <Button type="submit" disabled={loading || !newRoomName} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </form>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3">Nome da Sala</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rooms.length === 0 ? (
                    <tr><td colSpan={2} className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
                  ) : rooms.length === 0 ? (
                    <tr><td colSpan={2} className="p-4 text-center text-[var(--color-text-muted)]">Nenhuma sala cadastrada.</td></tr>
                  ) : (
                    rooms.map(room => (
                      <tr key={room.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-nav-hover)]">
                        <td className="px-4 py-3 text-[var(--color-text)] font-medium">{room.name}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-[var(--color-text)]">Contas de Acesso</CardTitle>
              <CardDescription className="text-[var(--color-text-secondary)]">
                Gerencie quem pode logar no sistema.
              </CardDescription>
            </div>
            <Button onClick={openNewUserModal} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers && users.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-[var(--color-text-muted)]">Nenhum usuário cadastrado.</td></tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-nav-hover)]">
                        <td className="px-4 py-3 text-[var(--color-text)] font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-[var(--color-preenchimento-2)] text-[var(--color-text-secondary)]'}`}>
                            {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditUserModal(user)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Novo/Editar Usuário */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgb(16_24_40/.45)] backdrop-blur-sm">
          <Card className="w-full max-w-md bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border)] pb-4">
              <CardTitle className="text-xl text-[var(--color-text)]">
                {editingUserId ? 'Editar Usuário' : 'Criar Nova Conta'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsUserModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="u_name" className="text-[var(--color-text-secondary)]">Nome Completo</Label>
                <Input id="u_name" value={newUserName} onChange={e => setNewUserName(formatName(e.target.value))} required className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_email" className="text-[var(--color-text-secondary)]">E-mail (Login)</Label>
                <Input id="u_email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_pwd" className="text-[var(--color-text-secondary)]">{editingUserId ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha Provisória (Mínimo 6 caracteres)'}</Label>
                <Input id="u_pwd" type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required={!editingUserId} minLength={6} className="bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_role" className="text-[var(--color-text-secondary)]">Nível de Acesso</Label>
                <select 
                  id="u_role" 
                  value={newUserRole} 
                  onChange={e => setNewUserRole(e.target.value)} 
                  className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="recepcao">Recepção (Padrão)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loadingUsers} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)] text-white">
                  {loadingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
