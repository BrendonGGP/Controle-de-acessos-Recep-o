import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAgora } from '@/hooks/useAgora'
import { useTitulo } from '@/hooks/useTitulo'
import { dataPorExtenso, formatarDuracao, hojeLocal, minutesToTime, timeToMinutes } from '@/lib/horario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Segmentado } from '@/components/ui/segmentado'
import { CampoData } from '@/components/ui/campo-data'
import { Modal, RodapeModal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Flutuante } from '@/components/ui/flutuante'
import { CabecalhoPagina } from '@/components/CabecalhoPagina'
import { AvisoErro, Carregando, EstadoErro, EstadoVazio, Skeleton } from '@/components/Estados'
import { CalendarDays, Coffee, Pencil, Plus, Trash2, X } from '@/components/icones'

// Tipos baseados no schema
type Room = { id: string; name: string }
type Collaborator = { id: string; name: string; email: string }
type Booking = {
  id: string
  room_id: string
  title: string
  booking_date: string
  start_time: string
  end_time: string
  service: string
  rooms: { name: string }
  booking_participants: { collaborator_id: string }[]
}

// Opções fixas do seletor de duração, em minutos. Uma reserva com duração
// fora desta lista é tratada como personalizada.
const PRESET_DURATIONS = [30, 60, 90, 120, 180, 240]

// Limite de uma reunião: 12 horas. Evita erro de digitação virar uma
// reserva que ocupa a sala o dia inteiro.
const MAX_DURATION_MINUTES = 12 * 60

const OPCOES_DURACAO = [
  ...PRESET_DURATIONS.map((m) => ({ value: String(m), label: formatarDuracao(m) })),
  { value: 'custom', label: 'Personalizada' },
]

const BOOKING_FIELDS = 'id, room_id, title, booking_date, start_time, end_time, service, rooms(name), booking_participants(collaborator_id)'

// Régua do dia no cartão da sala: das 7h às 21h, o expediente da recepção.
const REGUA_INICIO = 7 * 60
const REGUA_FIM = 21 * 60

export function Salas() {
  useTitulo('Salas')
  const { user, role } = useAuth()
  const avisar = useToast()
  const agora = useAgora()
  const todayStr = hojeLocal(agora)
  const nowMins = agora.getHours() * 60 + agora.getMinutes()

  const [rooms, setRooms] = useState<Room[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  // Dashboard state
  const [dashboardBookings, setDashboardBookings] = useState<Booking[]>([])

  // Agenda Modal State
  const [isAgendaOpen, setIsAgendaOpen] = useState(false)
  const [agendaRoom, setAgendaRoom] = useState<Room | null>(null)
  const [agendaDate, setAgendaDate] = useState(todayStr)
  const [agendaBookings, setAgendaBookings] = useState<Booking[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)

  // Edit/New Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null)

  // Exclusão: guarda a reunião a confirmar, para o diálogo saber o título.
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState(todayStr)
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  // Duração personalizada: quando ativa, `duration` passa a ser calculada
  // a partir destes dois campos em vez de vir das opções fixas.
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [customHours, setCustomHours] = useState('0')
  const [customMinutes, setCustomMinutes] = useState('0')
  const [service, setService] = useState<'sem_cafe' | 'com_cafe'>('sem_cafe')
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([])

  useEffect(() => {
    fetchDashboard()
  }, [])

  useEffect(() => {
    if (agendaRoom) {
      fetchAgendaBookings(agendaRoom.id, agendaDate)
    }
  }, [agendaDate, agendaRoom])

  async function fetchDashboard() {
    setErroCarga(null)
    const [roomsRes, collabsRes, bookingsRes] = await Promise.all([
      supabase.from('rooms').select('id, name').order('name'),
      supabase.from('collaborators').select('id, name, email').order('name'),
      supabase.from('room_bookings')
        .select(BOOKING_FIELDS)
        .eq('booking_date', hojeLocal())
        .order('start_time')
    ])
    const falha = roomsRes.error || collabsRes.error || bookingsRes.error
    if (falha) setErroCarga(falha.message)
    if (roomsRes.data) setRooms(roomsRes.data)
    if (collabsRes.data) setCollaborators(collabsRes.data)
    if (bookingsRes.data) setDashboardBookings(bookingsRes.data as unknown as Booking[])
    setLoading(false)
  }

  async function fetchAgendaBookings(rId: string, dStr: string) {
    setLoadingAgenda(true)
    const { data } = await supabase
      .from('room_bookings')
      .select(BOOKING_FIELDS)
      .eq('room_id', rId)
      .eq('booking_date', dStr)
      .order('start_time')

    if (data) setAgendaBookings(data as unknown as Booking[])
    setLoadingAgenda(false)
  }

  const openNewModal = (preselectedRoomId?: string) => {
    resetForm()
    if (preselectedRoomId) setRoomId(preselectedRoomId)
    setIsModalOpen(true)
  }

  const openEditModal = (booking: Booking) => {
    setError(null)
    setEditingBookingId(booking.id)
    setTitle(booking.title)
    setRoomId(booking.room_id)
    setDate(booking.booking_date)
    setStartTime(booking.start_time.substring(0, 5))

    const totalMins = timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)
    setDuration(totalMins.toString())

    // Duração que não corresponde a nenhuma opção fixa abre no modo
    // personalizado, para que o valor real apareça ao editar.
    if (PRESET_DURATIONS.includes(totalMins)) {
      setIsCustomDuration(false)
      setCustomHours('0')
      setCustomMinutes('0')
    } else {
      setIsCustomDuration(true)
      setCustomHours(Math.floor(totalMins / 60).toString())
      setCustomMinutes((totalMins % 60).toString())
    }

    setService(booking.service === 'com_cafe' ? 'com_cafe' : 'sem_cafe')
    setSelectedCollabs(booking.booking_participants?.map(p => p.collaborator_id) || [])
    setIsModalOpen(true)
  }

  const openAgenda = (room: Room) => {
    setAgendaRoom(room)
    setAgendaDate(todayStr)
    setIsAgendaOpen(true)
  }

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    if (!title || !roomId || !date || !startTime || !duration) {
      setError('Preencha título, sala, data, início e duração.')
      setFormLoading(false)
      return
    }

    const durationMinutes = parseInt(duration)

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setError('Informe uma duração maior que zero.')
      setFormLoading(false)
      return
    }

    if (durationMinutes > MAX_DURATION_MINUTES) {
      setError(`A duração não pode passar de ${MAX_DURATION_MINUTES / 60} horas.`)
      setFormLoading(false)
      return
    }

    if (timeToMinutes(startTime) + durationMinutes > 24 * 60) {
      setError('A reunião ultrapassa o fim do dia. Ajuste o início ou a duração.')
      setFormLoading(false)
      return
    }

    try {
      // Validação de conflito (precisa buscar todos os bookings do dia para aquela sala, já que dashboard só tem de hoje)
      const { data: dayBookings } = await supabase
        .from('room_bookings')
        .select('id, start_time, end_time')
        .eq('room_id', roomId)
        .eq('booking_date', date)

      const startMinutes = timeToMinutes(startTime)
      const endMinutes = startMinutes + durationMinutes

      const hasConflict = (dayBookings || []).some(b => {
        if (editingBookingId && b.id === editingBookingId) return false
        const bStart = timeToMinutes(b.start_time)
        const bEnd = timeToMinutes(b.end_time)
        return startMinutes < bEnd && endMinutes > bStart
      })

      if (hasConflict) {
        throw new Error('Já existe uma reunião neste horário para esta sala.')
      }

      let currentBookingId = editingBookingId

      if (editingBookingId) {
        const { error: updateError } = await supabase
          .from('room_bookings')
          .update({
            room_id: roomId,
            title,
            booking_date: date,
            start_time: startTime,
            duration_minutes: durationMinutes,
            service
          })
          .eq('id', editingBookingId)
        if (updateError) throw updateError
        await supabase.from('booking_participants').delete().eq('booking_id', editingBookingId)
      } else {
        const { data: booking, error: bookingError } = await supabase
          .from('room_bookings')
          .insert({
            room_id: roomId,
            title,
            booking_date: date,
            start_time: startTime,
            duration_minutes: durationMinutes,
            service,
            created_by: user?.id ?? null
          })
          .select()
          .single()

        if (bookingError) throw bookingError
        currentBookingId = booking.id
      }

      if (selectedCollabs.length > 0 && currentBookingId) {
        const participants = selectedCollabs.map(collabId => ({
          booking_id: currentBookingId,
          collaborator_id: collabId
        }))
        const { error: partError } = await supabase.from('booking_participants').insert(participants)
        if (partError) throw partError

        if (!editingBookingId) {
          const { error: invokeError } = await supabase.functions.invoke('notify-booking', {
            body: { booking_id: currentBookingId }
          })
          if (invokeError) {
            console.error('Reunião criada, mas erro ao notificar WhatsApp: ' + invokeError.message)
            avisar('error', 'Reunião agendada, mas o aviso no WhatsApp não saiu.')
          }
        }
      }

      avisar('success', editingBookingId ? 'Reunião atualizada.' : 'Reunião agendada.')
      setIsModalOpen(false)
      resetForm()
      fetchDashboard()
      if (agendaRoom) {
        fetchAgendaBookings(agendaRoom.id, agendaDate)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar agendamento')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteBooking = async () => {
    if (!deletingBooking) return
    setDeleteLoading(true)
    const { error } = await supabase.from('room_bookings').delete().eq('id', deletingBooking.id)
    setDeleteLoading(false)
    if (error) {
      avisar('error', 'Não foi possível excluir: ' + error.message)
      return
    }
    avisar('success', 'Reunião excluída.')
    setDeletingBooking(null)
    fetchDashboard()
    if (agendaRoom) fetchAgendaBookings(agendaRoom.id, agendaDate)
  }

  const resetForm = () => {
    setTitle('')
    setRoomId('')
    setDate(hojeLocal())
    setStartTime('09:00')
    setDuration('60')
    setIsCustomDuration(false)
    setCustomHours('0')
    setCustomMinutes('0')
    setService('sem_cafe')
    setSelectedCollabs([])
    setError(null)
    setEditingBookingId(null)
  }

  const toggleCollaborator = (id: string) => {
    setSelectedCollabs(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  // Separando as agendas em próximas e passadas
  const isPastDate = agendaDate < todayStr
  const isFutureDate = agendaDate > todayStr

  const upcomingBookings = agendaBookings.filter(b => {
    if (isPastDate) return false
    if (isFutureDate) return true
    return timeToMinutes(b.end_time) > nowMins
  })

  const pastBookings = agendaBookings.filter(b => {
    if (isPastDate) return true
    if (isFutureDate) return false
    return timeToMinutes(b.end_time) <= nowMins
  })

  // Nome do primeiro participante, para identificar a reunião no cartão.
  const getFirstParticipantName = (booking: Booking) => {
    if (!booking.booking_participants || booking.booking_participants.length === 0) return null
    const firstCollab = collaborators.find(c => c.id === booking.booking_participants[0].collaborator_id)
    return firstCollab ? firstCollab.name : null
  }

  // Resumo do cabeçalho: quantas salas estão livres e quando é a próxima reunião.
  const ocupadas = new Set(
    dashboardBookings
      .filter(b => timeToMinutes(b.start_time) <= nowMins && timeToMinutes(b.end_time) > nowMins)
      .map(b => b.room_id)
  )
  const livres = rooms.filter(r => !ocupadas.has(r.id)).length
  const proximaGeral = dashboardBookings.find(b => timeToMinutes(b.start_time) > nowMins)
  const resumo = rooms.length === 0
    ? 'Quem está em cada sala e até que horas.'
    : `${livres === rooms.length ? 'Todas as salas livres' : `${livres} de ${rooms.length} salas livres`} agora${proximaGeral ? `. Próxima reunião às ${proximaGeral.start_time.substring(0, 5)}.` : '.'}`

  return (
    <div>
      <CabecalhoPagina
        sobretitulo={dataPorExtenso(agora)}
        titulo="Salas"
        descricao={loading ? 'Quem está em cada sala e até que horas.' : resumo}
        acoes={
          <Button onClick={() => openNewModal()}>
            <Plus /> Agendar reunião
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="folha space-y-4 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-full rounded-[14px]" />
              <Skeleton className="h-7 w-full" />
            </div>
          ))}
        </div>
      ) : erroCarga && rooms.length === 0 ? (
        <EstadoErro mensagem={erroCarga} onTentarNovamente={() => { setLoading(true); fetchDashboard() }} />
      ) : rooms.length === 0 ? (
        <div className="folha">
          <EstadoVazio
            icone={<CalendarDays size={22} />}
            titulo="Nenhuma sala cadastrada"
            descricao="As salas de reunião aparecem aqui assim que a administração cadastrá-las."
            acao={role === 'admin' ? (
              <Button asChild variant="tint"><Link to="/admin">Cadastrar salas</Link></Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map(room => {
            const roomBookings = dashboardBookings.filter(b => b.room_id === room.id)
            const currentBooking = roomBookings.find(b => timeToMinutes(b.start_time) <= nowMins && timeToMinutes(b.end_time) > nowMins)
            const nextBooking = roomBookings.find(b => timeToMinutes(b.start_time) > nowMins)
            return (
              <CartaoSala
                key={room.id}
                room={room}
                bookings={roomBookings}
                atual={currentBooking}
                proxima={nextBooking}
                nowMins={nowMins}
                responsavel={currentBooking ? getFirstParticipantName(currentBooking) : null}
                aoAgendar={() => openNewModal(room.id)}
                aoVerAgenda={() => openAgenda(room)}
              />
            )
          })}
        </div>
      )}

      {/* Agenda da sala (todas as reuniões de um dia) */}
      <Modal
        aberto={isAgendaOpen && !!agendaRoom}
        aoFechar={() => setIsAgendaOpen(false)}
        titulo={`Agenda da ${agendaRoom?.name ?? 'sala'}`}
        descricao="Reuniões marcadas para esta sala no dia escolhido."
        tamanho="lg"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CampoData label="Dia" valor={agendaDate} aoMudar={setAgendaDate} className="w-full sm:w-56" />
          <Button variant="tint" onClick={() => { const r = agendaRoom; setIsAgendaOpen(false); openNewModal(r?.id); setDate(agendaDate >= todayStr ? agendaDate : todayStr) }}>
            <Plus /> Agendar nesta sala
          </Button>
        </div>

        {loadingAgenda ? (
          <div className="flex justify-center py-10"><Carregando rotulo="Carregando a agenda" /></div>
        ) : (
          <div className="mt-6 space-y-6">
            <ListaReunioes
              titulo="Próximas"
              reunioes={upcomingBookings}
              vazio={isPastDate ? 'Este dia já passou.' : 'Nenhuma reunião marcada.'}
              participante={getFirstParticipantName}
              aoEditar={(b) => { setIsAgendaOpen(false); openEditModal(b) }}
              aoExcluir={setDeletingBooking}
            />
            {(pastBookings.length > 0 || !isFutureDate) && (
              <ListaReunioes
                titulo="Encerradas"
                reunioes={pastBookings}
                vazio="Nenhuma reunião encerrada neste dia."
                participante={getFirstParticipantName}
                aoEditar={(b) => { setIsAgendaOpen(false); openEditModal(b) }}
                encerradas
              />
            )}
          </div>
        )}
      </Modal>

      {/* Agendar / editar reunião */}
      <Modal
        aberto={isModalOpen}
        aoFechar={() => setIsModalOpen(false)}
        titulo={editingBookingId ? 'Editar reunião' : 'Agendar reunião'}
      >
        <form onSubmit={handleSaveBooking} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título da reunião</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex.: Alinhamento com o comercial" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Sala"
              value={roomId}
              onChange={setRoomId}
              options={rooms.map(r => ({ value: r.id, label: r.name }))}
              placeholder="Escolha a sala"
            />
            <CampoData label="Data" valor={date} aoMudar={setDate} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Início</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="tabular-nums [&::-webkit-calendar-picker-indicator]:opacity-50"
              />
            </div>
            <Select
              label="Duração"
              value={isCustomDuration ? 'custom' : duration}
              onChange={v => {
                if (v === 'custom') {
                  // Pré-preenche com a duração atual, para o usuário
                  // ajustar a partir dela em vez de começar do zero.
                  const atual = parseInt(duration) || 0
                  setCustomHours(Math.floor(atual / 60).toString())
                  setCustomMinutes((atual % 60).toString())
                  setIsCustomDuration(true)
                } else {
                  setIsCustomDuration(false)
                  setDuration(v)
                }
              }}
              options={OPCOES_DURACAO}
            />
          </div>

          {isCustomDuration && (
            <div className="space-y-3 rounded-[16px] bg-[var(--color-preenchimento)] p-3.5 animate-fadeIn">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="customHours">Horas</Label>
                  <Input
                    id="customHours"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="12"
                    value={customHours}
                    onChange={e => {
                      setCustomHours(e.target.value)
                      const h = parseInt(e.target.value) || 0
                      const m = parseInt(customMinutes) || 0
                      setDuration((h * 60 + m).toString())
                    }}
                    className="bg-[var(--color-surface)] hover:bg-[var(--color-surface)]"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="customMinutes">Minutos</Label>
                  <Input
                    id="customMinutes"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="59"
                    step="5"
                    value={customMinutes}
                    onChange={e => {
                      setCustomMinutes(e.target.value)
                      const h = parseInt(customHours) || 0
                      const m = parseInt(e.target.value) || 0
                      setDuration((h * 60 + m).toString())
                    }}
                    className="bg-[var(--color-surface)] hover:bg-[var(--color-surface)]"
                  />
                </div>
              </div>
              <p className="text-[13px] tabular-nums text-[var(--color-nav-text)]" aria-live="polite">
                {(() => {
                  const total = parseInt(duration) || 0
                  if (total <= 0) return 'Informe uma duração maior que zero.'
                  return `Total de ${formatarDuracao(total)}, termina às ${minutesToTime(timeToMinutes(startTime) + total)}.`
                })()}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium text-[var(--color-text-secondary)]">Serviço de copa</span>
            <Segmentado
              rotulo="Serviço de copa"
              largo
              valor={service}
              aoMudar={setService}
              opcoes={[
                { valor: 'sem_cafe', rotulo: 'Sem café' },
                { valor: 'com_cafe', rotulo: <><Coffee size={16} /> Com café</> },
              ]}
            />
          </div>

          <BuscaParticipantes
            colaboradores={collaborators}
            escolhidos={selectedCollabs}
            aoAlternar={toggleCollaborator}
          />

          {error && <AvisoErro>{error}</AvisoErro>}

          <RodapeModal>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading} className="min-w-32">
              {formLoading
                ? <span className="pontos-pulando" aria-label="Salvando"><i /><i /><i /></span>
                : editingBookingId ? 'Salvar alterações' : 'Agendar'}
            </Button>
          </RodapeModal>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!deletingBooking}
        aoFechar={() => setDeletingBooking(null)}
        aoConfirmar={handleDeleteBooking}
        titulo="Excluir reunião"
        mensagem={<>A reunião <strong className="text-[var(--color-text)]">{deletingBooking?.title}</strong> sai da agenda da sala. Esta ação não pode ser desfeita.</>}
        carregando={deleteLoading}
      />
    </div>
  )
}

/**
 * Cartão da sala: o status de agora em texto, a reunião em andamento com o
 * quanto já passou, e a régua do dia — o mesmo desenho da agenda do "Meu dia"
 * do GGPost, com a linha do agora atravessando.
 */
function CartaoSala({ room, bookings, atual, proxima, nowMins, responsavel, aoAgendar, aoVerAgenda }: {
  room: Room
  bookings: Booking[]
  atual?: Booking
  proxima?: Booking
  nowMins: number
  responsavel: string | null
  aoAgendar: () => void
  aoVerAgenda: () => void
}) {
  const fimAtual = atual ? timeToMinutes(atual.end_time) : 0
  const progresso = atual
    ? Math.min(100, Math.max(0, ((nowMins - timeToMinutes(atual.start_time)) / (fimAtual - timeToMinutes(atual.start_time))) * 100))
    : 0
  const pos = (min: number) => `${((Math.min(Math.max(min, REGUA_INICIO), REGUA_FIM) - REGUA_INICIO) / (REGUA_FIM - REGUA_INICIO)) * 100}%`
  const agoraNaRegua = nowMins >= REGUA_INICIO && nowMins <= REGUA_FIM

  return (
    <article className="folha flex flex-col p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold leading-[22px] tracking-[-.014em] text-[var(--color-text)]">{room.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)]">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: atual ? 'var(--color-reuniao)' : 'var(--color-online)' }}
            />
            <span>{atual ? <>Ocupada até <span className="tabular-nums">{atual.end_time.substring(0, 5)}</span></> : 'Livre agora'}</span>
          </p>
        </div>
      </header>

      <div className="mt-4 min-h-[86px] rounded-[16px] bg-[var(--color-preenchimento)] px-3.5 py-3">
        {atual ? (
          <>
            <p className="truncate text-[15px] font-semibold text-[var(--color-text)]" title={atual.title}>{atual.title}</p>
            <p className="mt-0.5 truncate text-[13px] text-[var(--color-nav-text)]">
              <span className="tabular-nums">{atual.start_time.substring(0, 5)} às {atual.end_time.substring(0, 5)}</span>
              {responsavel && <> · {responsavel}</>}
              {atual.service === 'com_cafe' && <> · com café</>}
            </p>
            <div
              className="mt-2.5 h-1 overflow-hidden rounded-full bg-[rgb(var(--tinta)/.08)]"
              role="progressbar"
              aria-label="Andamento da reunião"
              aria-valuenow={Math.round(progresso)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-700" style={{ width: `${progresso}%` }} />
            </div>
          </>
        ) : proxima ? (
          <>
            <p className="text-[15px] font-semibold text-[var(--color-text)]">
              Livre até <span className="tabular-nums">{proxima.start_time.substring(0, 5)}</span>
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[var(--color-nav-text)]" title={proxima.title}>
              Depois: {proxima.title}
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-[var(--color-text)]">Livre pelo resto do dia</p>
            <p className="mt-0.5 text-[13px] text-[var(--color-nav-text)]">
              {bookings.length === 0 ? 'Nenhuma reunião marcada hoje.' : 'As reuniões de hoje já terminaram.'}
            </p>
          </>
        )}
      </div>

      {/* Régua do dia: 7h às 21h. Decorativa para leitor de tela; o texto acima já diz o status. */}
      <div className="mt-4" aria-hidden="true">
        <div className="relative h-6 rounded-[8px] bg-[rgb(var(--tinta)/.045)]">
          {bookings.map(b => {
            const ini = timeToMinutes(b.start_time)
            const fim = timeToMinutes(b.end_time)
            if (fim <= REGUA_INICIO || ini >= REGUA_FIM) return null
            const passou = fim <= nowMins
            const emCurso = b.id === atual?.id
            return (
              <span
                key={b.id}
                title={`${b.title} · ${b.start_time.substring(0, 5)} às ${b.end_time.substring(0, 5)}`}
                className="absolute inset-y-1 rounded-[5px]"
                style={{
                  left: pos(ini),
                  width: `calc(${pos(fim)} - ${pos(ini)})`,
                  minWidth: 3,
                  backgroundColor: emCurso ? 'var(--color-primary)' : passou ? 'var(--color-preenchimento-3)' : 'color-mix(in oklab, var(--color-primary) 32%, transparent)',
                }}
              />
            )
          })}
          {agoraNaRegua && (
            <span className="absolute -inset-y-1 w-[2px] -translate-x-1/2 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-surface)]" style={{ left: pos(nowMins) }}>
              <span className="absolute -top-[3px] left-1/2 size-[7px] -translate-x-1/2 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-surface)]" />
            </span>
          )}
        </div>
        <div className="relative mt-1 h-4 text-[11px] tabular-nums text-[var(--color-text-secondary)]">
          {[8, 12, 16, 20].map(h => (
            <span key={h} className="absolute -translate-x-1/2" style={{ left: pos(h * 60) }}>{h}h</span>
          ))}
        </div>
      </div>

      <div className="h-4 shrink-0" />
      <footer className="mt-auto flex gap-2 border-t pt-4" style={{ borderColor: 'var(--color-filete)' }}>
        <Button variant="secondary" size="sm" className="flex-1" onClick={aoVerAgenda}>
          Ver agenda
        </Button>
        <Button variant="tint" size="sm" className="flex-1" onClick={aoAgendar}>
          <Plus /> Agendar
        </Button>
      </footer>
    </article>
  )
}

function ListaReunioes({ titulo, reunioes, vazio, participante, aoEditar, aoExcluir, encerradas = false }: {
  titulo: string
  reunioes: Booking[]
  vazio: string
  participante: (b: Booking) => string | null
  aoEditar: (b: Booking) => void
  aoExcluir?: (b: Booking) => void
  encerradas?: boolean
}) {
  return (
    <section>
      <h3 className="mb-1 flex items-baseline gap-2 text-[13px] font-semibold text-[var(--color-text-secondary)]">
        {titulo}
        {reunioes.length > 0 && <span className="font-medium tabular-nums text-[var(--color-text-secondary)]">{reunioes.length}</span>}
      </h3>
      {reunioes.length === 0 ? (
        <p className="py-3 text-sm text-[var(--color-text-secondary)]">{vazio}</p>
      ) : (
        <ul>
          {reunioes.map(b => {
            const quem = participante(b)
            return (
              <li key={b.id} className="flex items-center gap-4 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--color-filete)' }}>
                <div className="w-14 shrink-0 tabular-nums">
                  <p className={`text-[15px] font-semibold ${encerradas ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text)]'}`}>{b.start_time.substring(0, 5)}</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)]">até {b.end_time.substring(0, 5)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[15px] font-medium ${encerradas ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text)]'}`}>{b.title}</p>
                  <p className="truncate text-[13px] text-[var(--color-text-secondary)]">
                    {[quem, b.service === 'com_cafe' ? 'com café' : null].filter(Boolean).join(' · ') || 'Sem participantes'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" onClick={() => aoEditar(b)} aria-label={`Editar ${b.title}`} title="Editar">
                    <Pencil size={18} />
                  </Button>
                  {aoExcluir && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => aoExcluir(b)}
                      aria-label={`Excluir ${b.title}`}
                      title="Excluir"
                      className="hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Participantes da reunião: os escolhidos viram fichas, e a busca abre uma
 * lista em vidro (setas, Enter e Escape funcionam).
 */
function BuscaParticipantes({ colaboradores, escolhidos, aoAlternar }: {
  colaboradores: Collaborator[]
  escolhidos: string[]
  aoAlternar: (id: string) => void
}) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [foco, setFoco] = useState(0)
  const campo = useRef<HTMLInputElement>(null)
  const listaId = useId()
  const fechar = useCallback(() => setAberto(false), [])

  const filtrados = colaboradores.filter(c =>
    c.name.toLowerCase().includes(busca.toLowerCase()) && !escolhidos.includes(c.id)
  )

  function escolher(c: Collaborator) {
    aoAlternar(c.id)
    setBusca('')
    setFoco(0)
    campo.current?.focus()
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="participantes">Participantes</Label>
      <p className="text-[13px] text-[var(--color-text-secondary)]">Quem estiver aqui recebe o aviso da reunião no WhatsApp.</p>

      {escolhidos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Participantes escolhidos">
          {escolhidos.map(id => {
            const c = colaboradores.find(col => col.id === id)
            if (!c) return null
            return (
              <li key={c.id} className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--color-primary-bg)] pl-3 pr-1 text-[13px] font-medium text-[var(--color-primary-hover)]">
                {c.name}
                <button
                  type="button"
                  onClick={() => aoAlternar(c.id)}
                  className="grid size-6 place-items-center rounded-full transition-colors hover:bg-[var(--color-primary-bg-hover)]"
                  aria-label={`Tirar ${c.name}`}
                >
                  <X size={12} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Input
        ref={campo}
        id="participantes"
        role="combobox"
        aria-expanded={aberto && busca.length > 0}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={aberto && filtrados[foco] ? `${listaId}-${foco}` : undefined}
        autoComplete="off"
        placeholder="Buscar pelo nome"
        value={busca}
        onChange={e => { setBusca(e.target.value); setAberto(true); setFoco(0) }}
        onFocus={() => setAberto(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setFoco(i => Math.min(i + 1, filtrados.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setFoco(i => Math.max(i - 1, 0)) }
          if (e.key === 'Enter' && aberto && filtrados[foco]) { e.preventDefault(); escolher(filtrados[foco]) }
          if (e.key === 'Tab') setAberto(false)
        }}
      />

      <Flutuante ancora={campo} aberto={aberto && busca.length > 0} aoFechar={fechar} className="rounded-[18px] p-1.5">
        {filtrados.length === 0 ? (
          <p className="px-3 py-2.5 text-center text-sm text-[var(--color-text-secondary)]">Ninguém com esse nome.</p>
        ) : (
          <ul id={listaId} role="listbox" aria-label="Colaboradores">
            {filtrados.map((c, i) => (
              <li
                key={c.id}
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={i === foco}
                className="flex h-9 cursor-pointer items-center rounded-[10px] px-3 text-sm text-[var(--color-text)]"
                style={{ backgroundColor: i === foco ? 'rgb(var(--tinta) / .055)' : undefined }}
                onMouseEnter={() => setFoco(i)}
                onMouseDown={e => { e.preventDefault(); escolher(c) }}
              >
                <span className="truncate">{c.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Flutuante>
    </div>
  )
}
