import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Configuração CORS básica
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Tratamento de requisição OPTIONS para CORS (se testado via frontend/postman)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // O Webhook do banco envia o payload no formato de Database Trigger (Insert)
    const record = payload.record || payload
    
    // Ignorar se notify for falso ou não houver colaborador a notificar
    if (!record.notify || !record.notified_collaborator_id) {
      return new Response(JSON.stringify({ message: 'Nenhuma notificação solicitada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 1. Inicializar cliente Supabase com Service Role Key para ignorar RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL ou Key não configurada nas variáveis de ambiente da Edge Function.')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Buscar o telefone do colaborador no banco
    const { data: collab, error: collabError } = await supabase
      .from('collaborators')
      .select('name, phone')
      .eq('id', record.notified_collaborator_id)
      .single()

    if (collabError || !collab) {
      throw new Error('Colaborador não encontrado para notificação.')
    }

    const { name: collabName, phone: collabPhone } = collab

    // 3. Buscar o template no banco.
    // Busca os templates do tipo com a categoria específica E o genérico (category null),
    // dando preferência ao específico quando existir.
    const templateType = record.action === 'entrada' ? 'entrada' : 'saida'
    const { data: templates } = await supabase
      .from('message_templates')
      .select('message, category')
      .eq('type', templateType)
      .or(`category.eq.${record.category},category.is.null`)

    const templateData =
      templates?.find((t: any) => t.category === record.category) ??
      templates?.find((t: any) => t.category === null)

    let message = ''
    if (templateData && templateData.message) {
      message = templateData.message
        .replace(/\{\{nome_colaborador\}\}/g, collabName)
        .replace(/\{\{nome_visitante\}\}/g, record.visitor_name)
        .replace(/\{\{acao\}\}/g, record.action)
    } else {
      // Fallback genérico caso a categoria não tenha template
      const actionText = record.action === 'entrada' ? 'chegou na recepção' : 'saiu da recepção'
      message = `Olá *${collabName}*! 🏢\n\nO(a) visitante/prestador *${record.visitor_name}* acabou de registrar uma *${actionText}*.\n\n_Mensagem automática da Portaria Inteligente._`
    }

    // 4. Disparar para a API do WhatsApp (Evolution API / Z-API)
    const waApiUrl = Deno.env.get('WA_API_URL')
    const waApiToken = Deno.env.get('WA_API_TOKEN')

    if (!waApiUrl) {
      console.warn('WA_API_URL não configurada. Apenas simulando disparo:', { phone: collabPhone, message })
      return new Response(JSON.stringify({ success: true, simulado: true, message: 'URL do WhatsApp não configurada, simulado com sucesso.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Exemplo genérico de chamada (Ajuste os campos `number` e `text` ou Headers conforme a documentação da sua API de disparo escolhida)
    const waResponse = await fetch(waApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(waApiToken ? { 'Client-Token': waApiToken } : {})
      },
      body: JSON.stringify({
        phone: collabPhone.replace(/\D/g, ''), // Z-API exige apenas números
        message: message
      })
    })

    if (!waResponse.ok) {
      const errorText = await waResponse.text()
      console.error('Erro na API do WhatsApp:', errorText)
      throw new Error(`Falha no envio do WhatsApp: ${errorText}`)
    }

    return new Response(JSON.stringify({ success: true, message: 'Notificação enviada com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
