import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Configuração CORS básica
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Repassa o evento de entrada/saída para o n8n, que busca os dados,
 * monta a mensagem pelo template e dispara via Evolution API.
 *
 * Antes esta função fazia tudo: consultava o banco, renderizava o
 * template e chamava a API de WhatsApp. Isso significava um deploy a
 * cada ajuste de texto. Com o n8n no meio, a mensagem e o provedor de
 * envio são editados visualmente, sem tocar em código.
 *
 * Secrets necessários:
 *   N8N_WEBHOOK_URL    ex: https://n8n.exemplo.com.br/webhook
 *   N8N_WEBHOOK_TOKEN  token que o n8n valida antes de processar
 *
 * Sem N8N_WEBHOOK_URL a função entra em modo simulado: o registro de
 * acesso é salvo normalmente e apenas o envio é ignorado.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Aceita tanto o formato de Database Webhook quanto a chamada direta
    const record = payload.record || payload

    if (!record.notify || !record.notified_collaborator_id) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma notificação solicitada.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    const webhookToken = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL não configurada. Envio simulado para:', record.visitor_name)
      return new Response(
        JSON.stringify({ success: true, simulado: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const response = await fetch(`${webhookUrl.replace(/\/+$/, '')}/recepcao/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken ? { 'x-webhook-token': webhookToken } : {}),
      },
      body: JSON.stringify({
        collaborator_id: record.notified_collaborator_id,
        action: record.action,
        category: record.category,
        visitor_name: record.visitor_name,
      }),
    })

    if (!response.ok) {
      const detalhe = await response.text()
      // Não logamos a URL nem o token, apenas o status e o corpo do erro.
      console.error('n8n respondeu erro:', { status: response.status, body: detalhe.slice(0, 300) })
      throw new Error(`Falha ao notificar: ${detalhe.slice(0, 200)}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: any) {
    console.error('Erro em notify-access:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
