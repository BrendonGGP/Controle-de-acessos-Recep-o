import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const bookingId = payload.booking_id

    if (!bookingId) {
      throw new Error('booking_id é obrigatório.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL ou Key não configurada.')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar dados do agendamento
    const { data: booking, error: bookingError } = await supabase
      .from('room_bookings')
      .select('title, booking_date, start_time, end_time, rooms(name)')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      throw new Error('Agendamento não encontrado.')
    }

    // Buscar participantes
    const { data: participants, error: partError } = await supabase
      .from('booking_participants')
      .select('collaborators(name, phone)')
      .eq('booking_id', bookingId)

    if (partError || !participants || participants.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum participante para notificar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Buscar template de agendamento
    const { data: templateData } = await supabase
      .from('message_templates')
      .select('message')
      .eq('type', 'agendamento')
      .single()

    const roomName = (booking.rooms as any)?.name || 'Sala Desconhecida'
    const waApiUrl = Deno.env.get('WA_API_URL')
    const waApiToken = Deno.env.get('WA_API_TOKEN')

    // Enviar mensagens em paralelo
    const results = await Promise.all(
      participants.map(async (p: any) => {
        const collab = p.collaborators
        if (!collab || !collab.phone) return null

        const dataStr = booking.booking_date.split('-').reverse().join('/')
        const horarioStr = `${booking.start_time.substring(0,5)} às ${booking.end_time.substring(0,5)}`
        
        let message = ''
        if (templateData && templateData.message) {
          message = templateData.message
            .replace(/\[NOME_PARTICIPANTE\]/g, collab.name)
            .replace(/\[TITULO\]/g, booking.title)
            .replace(/\[NOME_SALA\]/g, roomName)
            .replace(/\[DATA\]/g, dataStr)
            .replace(/\[HORA\]/g, horarioStr)
        } else {
          message = `Olá *${collab.name}*! 📅\n\nVocê foi convidado(a) para uma reunião:\n\n*Assunto:* ${booking.title}\n*Sala:* ${roomName}\n*Data:* ${dataStr}\n*Horário:* ${horarioStr}\n\n_Mensagem automática da Portaria Inteligente._`
        }

        if (!waApiUrl) {
          console.warn('WA_API_URL não configurada. Simulado:', collab.phone)
          return { phone: collab.phone, success: true, simulated: true }
        }

        try {
          const response = await fetch(waApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(waApiToken ? { 'Client-Token': waApiToken } : {})
            },
            body: JSON.stringify({
              phone: collab.phone.replace(/\D/g, ''), // Z-API exige apenas números
              message: message
            })
          })
          return { phone: collab.phone, success: response.ok }
        } catch (e) {
          return { phone: collab.phone, success: false }
        }
      })
    )

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
