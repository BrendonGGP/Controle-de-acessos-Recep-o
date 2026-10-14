import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useTitulo } from '@/hooks/useTitulo'
import { dataPorExtenso } from '@/lib/horario'
import { formatCPF, formatPhone, formatName, normalizePhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, RodapeModal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CabecalhoPagina } from '@/components/CabecalhoPagina'
import { AvisoErro, EstadoErro, EstadoVazio, Skeleton } from '@/components/Estados'
import { Pencil, Trash2, UserPlus, Users } from '@/components/icones'

type Collaborator = {
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  created_at: string
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}

export function Cadastro() {
  useTitulo('Colaboradores')
  const avisar = useToast()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Exclusão: guarda o colaborador a confirmar, para o modal saber o nome.
  const [deletingCollab, setDeletingCollab] = useState<Collaborator | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')

  useEffect(() => {
    fetchCollaborators()
  }, [])

  async function fetchCollaborators() {
    setErroCarga(null)
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('name')

    if (error) setErroCarga(error.message)
    if (data) setCollaborators(data)
    setLoading(false)
  }

  const openNewModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (collab: Collaborator) => {
    setError(null)
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
      setError('Nome e telefone são obrigatórios: o telefone é o do WhatsApp.')
      setFormLoading(false)
      return
    }

    try {
      const cleanPhone = normalizePhone(phone)
      if (!cleanPhone) {
        throw new Error('Telefone inválido. Informe DDD e número, como (11) 98765-4321.')
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

      avisar('success', editingId ? 'Cadastro atualizado.' : `${name} foi cadastrado.`)
      setIsModalOpen(false)
      resetForm()
      fetchCollaborators() // refresh
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar colaborador')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCollab) return
    setDeleteLoading(true)
    setDeleteError(null)

    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', deletingCollab.id)

    if (error) {
      setDeleteError(error.message)
      setDeleteLoading(false)
      return
    }

    avisar('success', `${deletingCollab.name} foi excluído.`)
    setDeletingCollab(null)
    setDeleteLoading(false)
    fetchCollaborators()
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
    <div>
      <CabecalhoPagina
        sobretitulo={dataPorExtenso()}
        titulo="Colaboradores"
        descricao="Quem recebe no WhatsApp os avisos de visita e de reunião."
        acoes={
          <Button onClick={openNewModal}>
            <UserPlus /> Novo colaborador
          </Button>
        }
      />

      {erroCarga && collaborators.length === 0 && !loading ? (
        <EstadoErro mensagem={erroCarga} onTentarNovamente={() => { setLoading(true); fetchCollaborators() }} />
      ) : (
        <section className="folha" aria-labelledby="titulo-colaboradores">
          <div className="flex items-baseline justify-between gap-4 px-5 pb-2 pt-5">
            <h2 id="titulo-colaboradores" className="text-[17px] font-semibold leading-[22px] tracking-[-.014em] text-[var(--color-text)]">Cadastrados</h2>
            {!loading && collaborators.length > 0 && (
              <p className="text-[13px] tabular-nums text-[var(--color-text-secondary)]">
                {collaborators.length === 1 ? '1 pessoa' : `${collaborators.length} pessoas`}
              </p>
            )}
          </div>

          {loading ? (
            <div className="space-y-5 px-5 pb-6 pt-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : collaborators.length === 0 ? (
            <EstadoVazio
              icone={<Users size={22} />}
              titulo="Nenhum colaborador cadastrado"
              descricao="Cadastre quem recebe visitas para poder avisá-lo no WhatsApp."
              acao={<Button variant="tint" onClick={openNewModal}><UserPlus /> Cadastrar o primeiro</Button>}
            />
          ) : (
            <ul className="px-2 pb-2">
              {collaborators.map((collab) => (
                <li
                  key={collab.id}
                  className="flex items-center gap-3 rounded-[16px] border-t px-3 py-3 transition-colors first:border-t-0 hover:bg-[rgb(var(--tinta)/.03)]"
                  style={{ borderColor: 'var(--color-filete)' }}
                >
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold"
                    style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
                  >
                    {iniciais(collab.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-.01em] text-[var(--color-text)]">{collab.name}</p>
                    <p className="truncate text-[13px] text-[var(--color-text-secondary)]">
                      <span className="tabular-nums">{formatPhone(collab.phone)}</span>
                      {collab.email && <> · {collab.email}</>}
                    </p>
                  </div>
                  {collab.cpf && (
                    <p className="hidden shrink-0 text-[13px] tabular-nums text-[var(--color-text-secondary)] lg:block">
                      CPF {formatCPF(collab.cpf)}
                    </p>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(collab)}
                      title="Editar"
                      aria-label={`Editar ${collab.name}`}
                    >
                      <Pencil size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setDeleteError(null); setDeletingCollab(collab) }}
                      title="Excluir"
                      aria-label={`Excluir ${collab.name}`}
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
        aberto={isModalOpen}
        aoFechar={() => setIsModalOpen(false)}
        titulo={editingId ? 'Editar colaborador' : 'Novo colaborador'}
        tamanho="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" value={name} onChange={e => setName(formatName(e.target.value))} required autoComplete="off" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required placeholder="(11) 99999-9999" aria-describedby="phone-dica" autoComplete="off" />
            <p id="phone-dica" className="text-[13px] text-[var(--color-text-secondary)]">O código do país (55) entra sozinho.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Opcional" autoComplete="off" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" type="tel" inputMode="numeric" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} maxLength={14} placeholder="Opcional" autoComplete="off" />
          </div>

          {error && <AvisoErro>{error}</AvisoErro>}

          <RodapeModal>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading} className="min-w-28">
              {formLoading ? <span className="pontos-pulando" aria-label="Salvando"><i /><i /><i /></span> : 'Salvar'}
            </Button>
          </RodapeModal>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!deletingCollab}
        aoFechar={() => setDeletingCollab(null)}
        aoConfirmar={handleDelete}
        titulo="Excluir colaborador"
        mensagem={<>Excluir <strong className="text-[var(--color-text)]">{deletingCollab?.name}</strong> do cadastro? Esta ação não pode ser desfeita.</>}
        carregando={deleteLoading}
        erro={deleteError}
      >
        <ul className="w-full space-y-1.5 rounded-[16px] bg-[var(--color-preenchimento)] p-3.5 text-left text-sm text-[var(--color-nav-text)]">
          <li>Deixa de aparecer para avisos e reuniões.</li>
          <li>Sai dos participantes das reuniões futuras.</li>
          <li>O histórico de acessos fica, sem o vínculo com a pessoa.</li>
        </ul>
      </ConfirmDialog>
    </div>
  )
}
