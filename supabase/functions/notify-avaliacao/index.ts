import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Repassa ao n8n o pedido de envio do link de avaliação ao visitante que
 * acabou de sair. Igual à notify-booking: esta função só encaminha — quem
 * busca os dados, escolhe o texto e envia é o n8n, editável sem deploy.
 *
 * O lembrete de 24h não passa por aqui: é um fluxo agendado no n8n, que
 * varre sozinho quem recebeu o link ontem.
 *
 * Secrets necessários:
 *   N8N_WEBHOOK_URL    ex: https://n8n.exemplo.com.br/webhook
 *   N8N_WEBHOOK_TOKEN  token que o n8n valida antes de processar
 *
 * Sem N8N_WEBHOOK_URL a função entra em modo simulado: a saída já foi
 * registrada e apenas o envio é ignorado.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const entradaId = payload.entrada_id

    if (!entradaId) {
      throw new Error('entrada_id é obrigatório.')
    }

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    const webhookToken = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL não configurada. Envio simulado para a entrada', entradaId)
      return new Response(
        JSON.stringify({ success: true, simulado: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const response = await fetch(`${webhookUrl.replace(/\/+$/, '')}/recepcao/avaliacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken ? { 'x-webhook-token': webhookToken } : {}),
      },
      body: JSON.stringify({ entrada_id: entradaId }),
    })

    const corpo = await response.text()

    if (!response.ok) {
      console.error('n8n respondeu erro:', { status: response.status, body: corpo.slice(0, 300) })
      throw new Error(`Falha ao notificar: ${corpo.slice(0, 200)}`)
    }

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
    console.error('Erro em notify-avaliacao:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
