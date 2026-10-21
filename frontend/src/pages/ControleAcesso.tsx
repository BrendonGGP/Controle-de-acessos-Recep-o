import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTitulo } from '@/hooks/useTitulo'
import { formatPhone, formatName, normalizePhone } from '@/lib/utils'
import { dataPorExtenso, hojeLocal } from '@/lib/horario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Segmentado } from '@/components/ui/segmentado'
import { Checkbox } from '@/components/ui/checkbox'
import { Modal, RodapeModal } from '@/components/ui/modal'
import { CabecalhoPagina } from '@/components/CabecalhoPagina'
import { AvisoErro, EstadoErro, EstadoVazio, Skeleton } from '@/components/Estados'
import { DoorOpen, LogIn, LogOut, Plus, Whatsapp } from '@/components/icones'

type Collaborator = { id: string; name: string }
type AccessLog = {
  id: string
  action: string
  category: string
  visitor_name: string
  document: string
  created_at: string
}

const CATEGORIAS = [
  { value: 'visitas_reunioes', label: 'Visita ou reunião' },
  { value: 'prestadores_servico', label: 'Prestador de serviço' },
  { value: 'entregas_mercadoria', label: 'Entrega de mercadoria' },
  { value: 'entregas_alimento', label: 'Entrega de alimento' },
  { value: 'entrevista_rh', label: 'Entrevista RH' },
  { value: 'stands', label: 'Stand' },
  { value: 'treinamentos_onboarding', label: 'Treinamento' },
]

const nomeCategoria = (cat: string) =>
  CATEGORIAS.find(c => c.value === cat)?.label
  ?? cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** "hoje, 09:32" ou "13/10, 17:05". */
function quando(iso: string) {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (hojeLocal(d) === hojeLocal()) return { dia: 'hoje', hora }
  return { dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), hora }
}

export function ControleAcesso() {
  useTitulo('Controle de acesso')
  const { user } = useAuth()
  const avisar = useToast()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [action, setAction] = useState<'entrada' | 'saida'>('entrada')
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
    setErroCarga(null)
    const [collabsRes, logsRes] = await Promise.all([
      supabase.from('collaborators').select('id, name').order('name'),
      supabase.from('access_logs').select('id, action, category, visitor_name, document, created_at').order('created_at', { ascending: false }).limit(20)
    ])
    if (logsRes.error) setErroCarga(logsRes.error.message)
    if (collabsRes.data) setCollaborators(collabsRes.data)
    if (logsRes.data) setLogs(logsRes.data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    if (!visitorName) {
      setError('Informe o nome do visitante.')
      setFormLoading(false)
      return
    }

    if (notify && !collaboratorId) {
      setError('Escolha quem recebe o aviso no WhatsApp.')
      setFormLoading(false)
      return
    }

    try {
      // Telefone do visitante é opcional, mas se preenchido precisa ser válido
      let cleanPhone: string | null = null
      if (phone.trim()) {
        cleanPhone = normalizePhone(phone)
        if (!cleanPhone) {
          throw new Error('Telefone inválido. Informe DDD e número, como (11) 98765-4321.')
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
      let avisoFalhou = false
      if (notify && newLog) {
        const { error: invokeError } = await supabase.functions.invoke('notify-access', {
          body: { record: newLog }
        })
        if (invokeError) {
          avisoFalhou = true
          avisar('error', 'Registro salvo, mas o aviso no WhatsApp não saiu: ' + invokeError.message)
        }
      }

      if (!avisoFalhou) {
        const registro = action === 'entrada' ? 'Entrada registrada.' : 'Saída registrada.'
        avisar('success', notify ? `${registro} Aviso enviado no WhatsApp.` : registro)
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

  const entradasHoje = logs.filter(l => l.action === 'entrada' && hojeLocal(new Date(l.created_at)) === hojeLocal()).length

  return (
    <div>
      <CabecalhoPagina
        sobretitulo={dataPorExtenso()}
        titulo="Controle de acesso"
        descricao="Entradas e saídas de visitantes e prestadores."
        acoes={
          <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
            <Plus /> Registrar acesso
          </Button>
        }
      />

      {erroCarga && logs.length === 0 && !loading ? (
        <EstadoErro mensagem={erroCarga} onTentarNovamente={() => { setLoading(true); fetchInitialData() }} />
      ) : (
        <section className="folha" aria-labelledby="titulo-registros">
          <div className="flex items-baseline justify-between gap-4 px-5 pb-2 pt-5">
            <h2 id="titulo-registros" className="text-[17px] font-semibold leading-[22px] tracking-[-.014em] text-[var(--color-text)]">Últimos registros</h2>
            {!loading && logs.length > 0 && (
              <p className="text-[13px] tabular-nums text-[var(--color-text-secondary)]">
                {entradasHoje === 0 ? 'Nenhuma entrada hoje' : entradasHoje === 1 ? '1 entrada hoje' : `${entradasHoje} entradas hoje`}
              </p>
            )}
          </div>

          {loading ? (
            <div className="space-y-4 px-5 pb-6 pt-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EstadoVazio
              icone={<DoorOpen size={22} />}
              titulo="Nenhum registro ainda"
              descricao="A primeira entrada que você registrar aparece aqui."
            />
          ) : (
            <div className="overflow-x-auto px-2 pb-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[12px] text-[var(--color-text-secondary)]">
                    <th scope="col" className="px-3 py-2.5 font-medium">Quando</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Visitante</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Movimento</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Categoria</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const q = quando(log.created_at)
                    const entrada = log.action === 'entrada'
                    return (
                      <tr key={log.id} className="border-t transition-colors hover:bg-[rgb(var(--tinta)/.03)]" style={{ borderColor: 'var(--color-filete)' }}>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                          <span className="text-[var(--color-text)]">{q.hora}</span>
                          <span className="ml-1.5 text-[13px] text-[var(--color-text-secondary)]">{q.dia}</span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-[var(--color-text)]">{log.visitor_name}</p>
                          <p className="text-[13px] text-[var(--color-text-secondary)] md:hidden">{nomeCategoria(log.category)}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-nav-text)]">
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full"
                              style={{ backgroundColor: entrada ? 'var(--color-online)' : 'var(--color-ausente)' }}
                            />
                            {entrada ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="hidden px-3 py-3 text-[var(--color-text-secondary)] md:table-cell">{nomeCategoria(log.category)}</td>
                        <td className="hidden px-3 py-3 tabular-nums text-[var(--color-text-secondary)] sm:table-cell">{log.document || 'não informado'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal aberto={isModalOpen} aoFechar={() => setIsModalOpen(false)} titulo="Registrar acesso">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Segmentado
            rotulo="Movimento"
            largo
            valor={action}
            aoMudar={setAction}
            opcoes={[
              { valor: 'entrada', rotulo: <><LogIn size={16} /> Entrada</> },
              { valor: 'saida', rotulo: <><LogOut size={16} /> Saída</> },
            ]}
          />

          <div className="space-y-1.5">
            <Label htmlFor="visitorName">Nome do visitante</Label>
            <Input id="visitorName" value={visitorName} onChange={e => setVisitorName(formatName(e.target.value))} required placeholder="Nome completo" autoComplete="off" />
          </div>

          <Select label="Categoria" value={category} onChange={setCategory} options={CATEGORIAS} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="document">Documento (RG ou CPF)</Label>
              <Input id="document" type="tel" inputMode="numeric" value={document} onChange={e => setDocument(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" autoComplete="off" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observations">Observações</Label>
            <Input id="observations" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--color-filete)' }}>
            <Checkbox
              checked={notify}
              onChange={setNotify}
              label={<span className="inline-flex items-center gap-1.5"><Whatsapp size={16} className="text-[var(--color-icone)]" /> Avisar um colaborador no WhatsApp</span>}
            />
            {notify && (
              <div className="animate-fadeIn">
                <Select
                  label="Quem recebe o aviso"
                  value={collaboratorId}
                  onChange={setCollaboratorId}
                  options={collaborators.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Escolha o colaborador"
                  invalido={!!error && !collaboratorId}
                />
              </div>
            )}
          </div>

          {error && <AvisoErro>{error}</AvisoErro>}

          <RodapeModal>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading} className="min-w-32">
              {formLoading
                ? <span className="pontos-pulando" aria-label="Registrando"><i /><i /><i /></span>
                : action === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
            </Button>
          </RodapeModal>
        </form>
      </Modal>
    </div>
  )
}
