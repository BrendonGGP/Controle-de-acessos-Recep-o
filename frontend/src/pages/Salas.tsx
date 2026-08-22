import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar as CalendarIcon, Clock, Users, Coffee, Loader2, X, Edit2, Trash2, User } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

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

export function Salas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dashboard state
  const [dashboardBookings, setDashboardBookings] = useState<Booking[]>([])
  const todayStr = new Date().toISOString().split('T')[0]

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

  // Form state
  const [title, setTitle] = useState('')
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState(todayStr)
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [service, setService] = useState('sem_cafe')
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([])
  
  // Participant search state
  const [participantSearch, setParticipantSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  useGSAP(() => {
    if (!loading && rooms.length > 0) {
      gsap.fromTo('.room-card', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.2)' }
      )
    }
  }, { scope: containerRef, dependencies: [loading, rooms] })

  useEffect(() => {
    if (agendaRoom) {
      fetchAgendaBookings(agendaRoom.id, agendaDate)
    }
  }, [agendaDate, agendaRoom])

  async function fetchDashboard() {
    setLoading(true)
    const [roomsRes, collabsRes, bookingsRes] = await Promise.all([
      supabase.from('rooms').select('id, name').order('name'),
      supabase.from('collaborators').select('id, name, email').order('name'),
      supabase.from('room_bookings')
        .select('id, room_id, title, booking_date, start_time, end_time, service, rooms(name), booking_participants(collaborator_id)')
        .eq('booking_date', todayStr)
        .order('start_time')
    ])
    if (roomsRes.data) setRooms(roomsRes.data)
    if (collabsRes.data) setCollaborators(collabsRes.data)
    if (bookingsRes.data) setDashboardBookings(bookingsRes.data as unknown as Booking[])
    setLoading(false)
  }

  async function fetchAgendaBookings(rId: string, dStr: string) {
    setLoadingAgenda(true)
    const { data } = await supabase
      .from('room_bookings')
      .select('id, room_id, title, booking_date, start_time, end_time, service, rooms(name), booking_participants(collaborator_id)')
      .eq('room_id', rId)
      .eq('booking_date', dStr)
      .order('start_time')
    
    if (data) setAgendaBookings(data as unknown as Booking[])
    setLoadingAgenda(false)
  }

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const openNewModal = (preselectedRoomId?: string) => {
    resetForm()
    if (preselectedRoomId) setRoomId(preselectedRoomId)
    setIsModalOpen(true)
  }

  const openEditModal = (booking: Booking) => {
    setEditingBookingId(booking.id)
    setTitle(booking.title)
    setRoomId(booking.room_id)
    setDate(booking.booking_date)
    setStartTime(booking.start_time.substring(0, 5))
    
    const startMins = timeToMinutes(booking.start_time)
    const endMins = timeToMinutes(booking.end_time)
    setDuration((endMins - startMins).toString())
    
    setService(booking.service)
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
      setError('Preencha todos os campos obrigatórios')
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
      const endMinutes = startMinutes + parseInt(duration)

      const hasConflict = (dayBookings || []).some(b => {
        if (editingBookingId && b.id === editingBookingId) return false
        const bStart = timeToMinutes(b.start_time)
        const bEnd = timeToMinutes(b.end_time)
        return startMinutes < bEnd && endMinutes > bStart
      })

      if (hasConflict) {
        throw new Error('Já existe um agendamento neste horário para esta sala.')
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
            duration_minutes: parseInt(duration),
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
            duration_minutes: parseInt(duration),
            service
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
          const { data: invokeData, error: invokeError } = await supabase.functions.invoke('notify-booking', {
            body: { booking_id: currentBookingId }
          })
          if (invokeError) {
            console.error('Reunião criada, mas erro ao notificar WhatsApp: ' + invokeError.message)
          }
        }
      }

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

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Deseja realmente cancelar e excluir este agendamento?')) return
    const { error } = await supabase.from('room_bookings').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else {
      fetchDashboard()
      if (agendaRoom) fetchAgendaBookings(agendaRoom.id, agendaDate)
    }
  }

  const resetForm = () => {
    setTitle('')
    setRoomId('')
    setStartTime('09:00')
    setDuration('60')
    setService('sem_cafe')
    setSelectedCollabs([])
    setParticipantSearch('')
    setError(null)
    setEditingBookingId(null)
  }

  const toggleCollaborator = (id: string) => {
    setSelectedCollabs(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  const filteredCollaborators = collaborators.filter(c => 
    c.name.toLowerCase().includes(participantSearch.toLowerCase()) && 
    !selectedCollabs.includes(c.id)
  )

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

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

  // Retorna o nome do primeiro participante pra mostrar bonito igual no mockup
  const getFirstParticipantName = (booking: Booking) => {
    if (!booking.booking_participants || booking.booking_participants.length === 0) return null
    const firstCollab = collaborators.find(c => c.id === booking.booking_participants[0].collaborator_id)
    return firstCollab ? firstCollab.name : null
  }

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Status das Salas</h1>
          <p className="text-slate-400">Disponibilidade em tempo real para hoje.</p>
        </div>
        <Button onClick={() => openNewModal()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map(room => {
            const roomBookings = dashboardBookings.filter(b => b.room_id === room.id)
            const currentBooking = roomBookings.find(b => timeToMinutes(b.start_time) <= nowMins && timeToMinutes(b.end_time) > nowMins)
            const nextBooking = roomBookings.find(b => timeToMinutes(b.start_time) > nowMins)
            const isOccupied = !!currentBooking

            return (
              <Card key={room.id} className={`room-card bg-slate-900 border ${isOccupied ? 'border-rose-500/50' : 'border-slate-800'} transition-colors relative overflow-hidden`}>
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-white font-semibold">{room.name}</CardTitle>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isOccupied ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                    {isOccupied ? 'Ocupada' : 'Disponível'}
                  </span>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg flex flex-col items-center justify-center text-center min-h-[100px] border ${isOccupied ? 'bg-rose-500/5 border-rose-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                    {isOccupied ? (
                      <>
                        <h4 className="text-rose-300 font-medium truncate w-full px-2" title={currentBooking.title}>{currentBooking.title}</h4>
                        {getFirstParticipantName(currentBooking) && (
                          <div className="flex items-center text-slate-400 text-xs mt-2">
                            <User className="w-3 h-3 mr-1" />
                            {getFirstParticipantName(currentBooking)}
                          </div>
                        )}
                        <div className="flex items-center text-rose-400/80 text-xs mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          Até {currentBooking.end_time.substring(0, 5)}
                        </div>
                      </>
                    ) : (
                      <span className="text-emerald-400/90 font-medium">Livre para uso agora</span>
                    )}
                  </div>

                  <div className="text-center text-slate-500 text-xs flex items-center justify-center gap-1.5 py-1">
                    <Clock className="w-3.5 h-3.5" />
                    {nextBooking ? `Próxima reserva às ${nextBooking.start_time.substring(0, 5)}` : 'Nenhuma próxima reserva hoje'}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/50">
                    <Button onClick={() => openNewModal(room.id)} className="w-full bg-blue-600 hover:bg-blue-700">
                      Agendar Sala
                    </Button>
                    <Button onClick={() => openAgenda(room)} variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-slate-800">
                      Ver todas reuniões
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Agenda (Ver todas as reuniões) */}
      {isAgendaOpen && agendaRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 shadow-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <CardTitle className="text-xl text-white">Agenda: {agendaRoom.name}</CardTitle>
                <p className="text-slate-400 text-sm mt-1">Todos os agendamentos realizados para esta sala</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAgendaOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <div className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="mb-6">
                <Label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block font-semibold">Filtrar por data</Label>
                <div className="relative max-w-xs">
                  <Input 
                    type="date" 
                    value={agendaDate}
                    onChange={(e) => setAgendaDate(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker() } catch (err) {}
                    }}
                    className="bg-slate-950 border-slate-700 text-white cursor-pointer pl-10 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="overflow-y-auto pr-2 space-y-6 flex-1">
                {loadingAgenda ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : (
                  <>
                    <div>
                      <Label className="text-slate-400 text-xs uppercase tracking-wider mb-3 block font-semibold">Próximas Reuniões</Label>
                      {upcomingBookings.length === 0 ? (
                        <div className="text-center p-4 bg-slate-950 rounded-lg border border-slate-800/50 text-slate-500 text-sm">
                          Nenhuma próxima reunião encontrada.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {upcomingBookings.map(booking => (
                            <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 group hover:border-blue-500/30 transition-colors">
                              <div>
                                <h4 className="text-white font-medium mb-1">{booking.title}</h4>
                                <div className="flex items-center gap-3 text-slate-400 text-sm">
                                  <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {booking.booking_date.split('-').reverse().join('/')}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getFirstParticipantName(booking) && (
                                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                                    <User className="w-3.5 h-3.5" />
                                    {getFirstParticipantName(booking)}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(booking)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBooking(booking.id)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-slate-400 text-xs uppercase tracking-wider mb-3 block font-semibold">Histórico (Encerradas)</Label>
                      {pastBookings.length === 0 ? (
                        <div className="text-center p-4 bg-slate-950 rounded-lg border border-slate-800/50 text-slate-500 text-sm">
                          Nenhum histórico encontrado.
                        </div>
                      ) : (
                        <div className="space-y-3 opacity-60">
                          {pastBookings.map(booking => (
                            <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                              <div>
                                <h4 className="text-slate-300 font-medium mb-1">{booking.title}</h4>
                                <div className="flex items-center gap-3 text-slate-500 text-sm">
                                  <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {booking.booking_date.split('-').reverse().join('/')}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getFirstParticipantName(booking) && (
                                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full text-sm text-slate-400">
                                    <User className="w-3.5 h-3.5" />
                                    {getFirstParticipantName(booking)}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(booking)} className="h-8 w-8 text-slate-500 hover:text-white">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <Button onClick={() => setIsAgendaOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white">
                Fechar Agenda
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-700 shadow-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <CardTitle className="text-xl text-white">
                {editingBookingId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSaveBooking} className="overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">Título da Reunião *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required className="bg-slate-950 border-slate-700 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room" className="text-slate-300">Sala *</Label>
                  <select 
                    id="room" 
                    value={roomId} 
                    onChange={e => setRoomId(e.target.value)} 
                    required 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-slate-300">Data *</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required 
                    onClick={(e) => {
                      try { e.currentTarget.showPicker() } catch (err) {}
                    }}
                    className="bg-slate-950 border-slate-700 text-white cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-slate-300">Início *</Label>
                  <Input 
                    id="startTime" 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    required 
                    onClick={(e) => { try { e.currentTarget.showPicker() } catch (err) {} }}
                    className="bg-slate-950 border-slate-700 text-white cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-slate-300">Duração (minutos) *</Label>
                  <select 
                    id="duration" 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="30">30 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30m</option>
                    <option value="120">2 horas</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service" className="text-slate-300">Serviço de Copa</Label>
                <select 
                  id="service" 
                  value={service} 
                  onChange={e => setService(e.target.value)} 
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sem_cafe">Sem Café</option>
                  <option value="com_cafe">Com Café</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  Participantes (Notificações)
                </Label>
                
                {selectedCollabs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedCollabs.map(id => {
                      const c = collaborators.find(col => col.id === id)
                      if (!c) return null
                      return (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded-md text-xs border border-blue-600/30">
                          {c.name}
                          <button type="button" onClick={() => toggleCollaborator(c.id)} className="hover:text-blue-200 focus:outline-none">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                <div className="relative">
                  <Input 
                    placeholder="Digite o nome para buscar..." 
                    value={participantSearch}
                    onChange={e => {
                      setParticipantSearch(e.target.value)
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="bg-slate-950 border-slate-700 text-white" 
                  />
                  
                  {showDropdown && filteredCollaborators.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50">
                      {filteredCollaborators.map(c => (
                        <div 
                          key={c.id} 
                          className="p-2 text-sm text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            toggleCollaborator(c.id)
                            setParticipantSearch('')
                            setShowDropdown(false)
                          }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {showDropdown && participantSearch && filteredCollaborators.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 p-3 text-sm text-slate-400 text-center">
                      Nenhum colaborador encontrado.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Salvar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
