import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Repassa o agendamento para o n8n, que busca reserva e participantes,
 * monta a mensagem pelo template e dispara via Evolution API.
 *
 * Antes esta função consultava o banco, renderizava o template e enviava
 * para cada participante em paralelo. Toda essa lógica agora vive no
 * n8n, editável sem deploy.
 *
 * Secrets necessários:
 *   N8N_WEBHOOK_URL    ex: https://n8n.exemplo.com.br/webhook
 *   N8N_WEBHOOK_TOKEN  token que o n8n valida antes de processar
 *
 * Sem N8N_WEBHOOK_URL a função entra em modo simulado: a reserva é
 * salva normalmente e apenas o envio é ignorado.
 */
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

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    const webhookToken = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL não configurada. Envio simulado para a reserva', bookingId)
      return new Response(
        JSON.stringify({ success: true, simulado: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const response = await fetch(`${webhookUrl.replace(/\/+$/, '')}/recepcao/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken ? { 'x-webhook-token': webhookToken } : {}),
      },
      body: JSON.stringify({ booking_id: bookingId }),
    })

    const corpo = await response.text()

    if (!response.ok) {
      console.error('n8n respondeu erro:', { status: response.status, body: corpo.slice(0, 300) })
      throw new Error(`Falha ao notificar: ${corpo.slice(0, 200)}`)
    }

    // O n8n devolve { success, enviados, total } — repassamos para que o
    // frontend possa exibir quantos participantes foram notificados.
    let resultado: unknown = { success: true }
    try {
      resultado = JSON.parse(corpo)
    } catch {
      // resposta sem corpo JSON; mantém o padrão
    }

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: any) {
    console.error('Erro em notify-booking:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
