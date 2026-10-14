import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useTitulo } from '@/hooks/useTitulo'
import { dataPorExtenso } from '@/lib/horario'
import { formatName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmentado } from '@/components/ui/segmentado'
import { Modal, RodapeModal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CabecalhoPagina } from '@/components/CabecalhoPagina'
import { AvisoErro, EstadoErro, EstadoVazio, Skeleton } from '@/components/Estados'
import { CalendarDays, Pencil, Plus, Trash2, Users } from '@/components/icones'

type Room = { id: string; name: string }
type SystemUser = { id: string; name: string; email: string; role: string }

const PAPEIS = {
  recepcao: { rotulo: 'Recepção', dica: 'Agenda salas, registra acessos e cadastra colaboradores.' },
  admin: { rotulo: 'Administrador', dica: 'Tudo o que a recepção faz, mais salas e contas de acesso.' },
} as const

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}

function TituloFolha({ id, titulo, descricao, acao }: { id: string; titulo: string; descricao: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-5">
      <div>
        <h2 id={id} className="text-[17px] font-semibold leading-[22px] tracking-[-.014em] text-[var(--color-text)]">{titulo}</h2>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{descricao}</p>
      </div>
      {acao}
    </div>
  )
}

function LinhasCarregando() {
  return (
    <div className="space-y-5 px-5 pb-6 pt-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function Admin() {
  useTitulo('Administração')
  const avisar = useToast()
  const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [savingRoom, setSavingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)

  // Users State
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'recepcao' | 'admin'>('recepcao')

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
    setSavingRoom(true)
    const { error } = await supabase.from('rooms').insert({ name: newRoomName })
    setSavingRoom(false)
    if (!error) {
      avisar('success', `${newRoomName} foi adicionada.`)
      setNewRoomName('')
      fetchRooms()
    } else {
      avisar('error', 'Não foi possível criar a sala: ' + error.message)
    }
  }

  async function handleDeleteRoom() {
    if (!deletingRoom) return
    setDeleteLoading(true)
    const { error } = await supabase.from('rooms').delete().eq('id', deletingRoom.id)
    setDeleteLoading(false)
    if (!error) {
      avisar('success', `${deletingRoom.name} foi excluída.`)
      setDeletingRoom(null)
      fetchRooms()
    } else {
      avisar('error', 'Não foi possível excluir: ' + error.message)
    }
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
    setUserError(null)
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('recepcao')
    setIsUserModalOpen(true)
  }

  const openEditUserModal = (user: SystemUser) => {
    setEditingUserId(user.id)
    setUserError(null)
    setNewUserName(user.name)
    setNewUserEmail(user.email)
    setNewUserPassword('') // empty so it won't update unless typed
    setNewUserRole(user.role === 'admin' ? 'admin' : 'recepcao')
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
    setSavingUser(true)
    setUserError(null)

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
      if (msg) setUserError('Não foi possível atualizar: ' + msg)
      else { avisar('success', 'Conta atualizada.'); setIsUserModalOpen(false); fetchUsers() }
    } else {
      // CREATE
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          payload: { name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole }
        }
      })
      const msg = await extractFunctionError(error, data)
      if (msg) setUserError('Não foi possível criar a conta: ' + msg)
      else { avisar('success', `Conta de ${newUserName} criada.`); setIsUserModalOpen(false); fetchUsers() }
    }

    setSavingUser(false)
  }

  async function handleDeleteUser() {
    if (!deletingUser) return
    setDeleteLoading(true)
    const { error, data } = await supabase.functions.invoke('manage-users', {
      body: { action: 'delete', payload: { id: deletingUser.id } }
    })
    const msg = await extractFunctionError(error, data)
    setDeleteLoading(false)
    if (msg) {
      avisar('error', 'Não foi possível excluir: ' + msg)
    } else {
      avisar('success', `Conta de ${deletingUser.name} excluída.`)
      setDeletingUser(null)
      fetchUsers()
    }
  }

  return (
    <div>
      <CabecalhoPagina
        sobretitulo={dataPorExtenso()}
        titulo="Administração"
        descricao="Salas de reunião e quem pode entrar na recepção."
        acoes={
          <Segmentado
            tipo="abas"
            rotulo="Seção da administração"
            valor={activeTab}
            aoMudar={setActiveTab}
            opcoes={[
              { valor: 'rooms', rotulo: 'Salas' },
              { valor: 'users', rotulo: 'Contas' },
            ]}
          />
        }
      />

      {activeTab === 'rooms' && (
        fetchError && rooms.length === 0 ? (
          <EstadoErro mensagem={fetchError} onTentarNovamente={fetchRooms} />
        ) : (
          <section className="folha" role="tabpanel" aria-labelledby="titulo-salas">
            <TituloFolha id="titulo-salas" titulo="Salas de reunião" descricao="Aparecem no status das salas e na hora de agendar." />

            <form onSubmit={handleAddRoom} className="flex items-end gap-2.5 px-5 pb-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="roomName">Nova sala</Label>
                <Input
                  id="roomName"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="Ex.: Sala Ipê, 3º andar"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" variant="tint" disabled={savingRoom || !newRoomName}>
                <Plus /> Adicionar
              </Button>
            </form>

            {loading && rooms.length === 0 ? (
              <LinhasCarregando />
            ) : rooms.length === 0 ? (
              <EstadoVazio icone={<CalendarDays size={22} />} titulo="Nenhuma sala ainda" descricao="Escreva o nome da primeira sala acima." />
            ) : (
              <ul className="border-t px-2 pb-2" style={{ borderColor: 'var(--color-filete)' }}>
                {rooms.map(room => (
                  <li key={room.id} className="flex items-center gap-3 rounded-[16px] border-t px-3 py-2 transition-colors first:border-t-0 hover:bg-[rgb(var(--tinta)/.03)]" style={{ borderColor: 'var(--color-filete)' }}>
                    <span className="flex-1 truncate text-[15px] font-medium text-[var(--color-text)]">{room.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingRoom(room)}
                      aria-label={`Excluir ${room.name}`}
                      title="Excluir"
                      className="hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      )}

      {activeTab === 'users' && (
        <section className="folha" role="tabpanel" aria-labelledby="titulo-contas">
          <TituloFolha
            id="titulo-contas"
            titulo="Contas de acesso"
            descricao="Quem pode entrar na recepção, e com que permissão."
            acao={<Button variant="tint" onClick={openNewUserModal}><Plus /> Nova conta</Button>}
          />
          {loadingUsers && users.length === 0 ? (
            <LinhasCarregando />
          ) : users.length === 0 ? (
            <EstadoVazio icone={<Users size={22} />} titulo="Nenhuma conta" descricao="Crie a conta de quem vai usar a recepção." />
          ) : (
            <ul className="border-t px-2 pb-2" style={{ borderColor: 'var(--color-filete)' }}>
              {users.map(user => (
                <li key={user.id} className="flex items-center gap-3 rounded-[16px] border-t px-3 py-3 transition-colors first:border-t-0 hover:bg-[rgb(var(--tinta)/.03)]" style={{ borderColor: 'var(--color-filete)' }}>
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold"
                    style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
                  >
                    {iniciais(user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-.01em] text-[var(--color-text)]">{user.name}</p>
                    <p className="truncate text-[13px] text-[var(--color-text-secondary)]">{user.email}</p>
                  </div>
                  <span
                    className="hidden h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold sm:inline-flex"
                    style={user.role === 'admin'
                      ? { backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary-hover)' }
                      : { backgroundColor: 'var(--color-preenchimento-2)', color: 'var(--color-nav-text)' }}
                  >
                    {user.role === 'admin' ? 'Administrador' : 'Recepção'}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button variant="ghost" size="icon" onClick={() => openEditUserModal(user)} aria-label={`Editar ${user.name}`} title="Editar">
                      <Pencil size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingUser(user)}
                      aria-label={`Excluir ${user.name}`}
                      title="Excluir"
                      className="hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Modal
        aberto={isUserModalOpen}
        aoFechar={() => setIsUserModalOpen(false)}
        titulo={editingUserId ? 'Editar conta' : 'Nova conta'}
        tamanho="sm"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u_name">Nome completo</Label>
            <Input id="u_name" value={newUserName} onChange={e => setNewUserName(formatName(e.target.value))} required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u_email">E-mail de acesso</Label>
            <Input id="u_email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u_pwd">{editingUserId ? 'Nova senha' : 'Senha provisória'}</Label>
            <Input id="u_pwd" type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required={!editingUserId} minLength={6} aria-describedby="u_pwd_dica" autoComplete="new-password" />
            <p id="u_pwd_dica" className="text-[13px] text-[var(--color-text-secondary)]">
              {editingUserId ? 'Deixe em branco para manter a senha atual.' : 'Pelo menos 6 caracteres. Passe para a pessoa trocar no primeiro acesso.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium text-[var(--color-text-secondary)]">Permissão</span>
            <Segmentado
              rotulo="Permissão"
              largo
              valor={newUserRole}
              aoMudar={setNewUserRole}
              opcoes={[
                { valor: 'recepcao', rotulo: PAPEIS.recepcao.rotulo },
                { valor: 'admin', rotulo: PAPEIS.admin.rotulo },
              ]}
            />
            <p className="text-[13px] text-[var(--color-text-secondary)]">{PAPEIS[newUserRole].dica}</p>
          </div>

          {userError && <AvisoErro>{userError}</AvisoErro>}

          <RodapeModal>
            <Button type="button" variant="secondary" onClick={() => setIsUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingUser} className="min-w-28">
              {savingUser ? <span className="pontos-pulando" aria-label="Salvando"><i /><i /><i /></span> : editingUserId ? 'Salvar' : 'Criar conta'}
            </Button>
          </RodapeModal>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!deletingRoom}
        aoFechar={() => setDeletingRoom(null)}
        aoConfirmar={handleDeleteRoom}
        titulo="Excluir sala"
        mensagem={<>Excluir <strong className="text-[var(--color-text)]">{deletingRoom?.name}</strong>? Sala com reunião na agenda não pode ser excluída. Esta ação não pode ser desfeita.</>}
        carregando={deleteLoading}
      />

      <ConfirmDialog
        aberto={!!deletingUser}
        aoFechar={() => setDeletingUser(null)}
        aoConfirmar={handleDeleteUser}
        titulo="Excluir conta"
        mensagem={<><strong className="text-[var(--color-text)]">{deletingUser?.name}</strong> deixa de conseguir entrar na recepção. Esta ação não pode ser desfeita.</>}
        carregando={deleteLoading}
      />
    </div>
  )
}
