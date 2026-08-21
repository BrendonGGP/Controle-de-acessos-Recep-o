import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cria o Cliente de ADMIN (ignora o RLS e tem acesso total)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Pegar o token do cabeçalho
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Faltou o cabeçalho Authorization')
    const token = authHeader.replace('Bearer ', '')

    // Verificar se quem está chamando a função é admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error(`Auth Error: ${authError?.message || 'Token inválido'}`)
    }

    const { data: systemUser } = await supabaseAdmin
      .from('system_users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Fallback caso a query de RLS falhe por recursão etc (Apenas por garantia)
    const isExplicitAdmin = user.email === 'brendon.nakagawa@grupogomespires.com.br'

    if (systemUser?.role !== 'admin' && !isExplicitAdmin) {
      throw new Error('Acesso negado: Somente administradores podem gerenciar usuários')
    }

    const { action, payload } = await req.json()

    if (action === 'create') {
      const { email, password, name, role } = payload
      
      // 1. Criar usuário na Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Já cria confirmado
      })

      if (authError) throw authError

      // 2. Inserir na system_users
      const { error: sysError } = await supabaseAdmin
        .from('system_users')
        .insert({
          id: authData.user.id,
          name,
          email,
          role
        })

      if (sysError) {
        // Rollback se falhar
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw sysError
      }

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } 
    else if (action === 'delete') {
      const { id } = payload
      
      // Excluir da Auth (O CASCADE do banco exclui da system_users sozinho)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    else if (action === 'update_role') {
      const { id, role } = payload
      
      const { error } = await supabaseAdmin
        .from('system_users')
        .update({ role })
        .eq('id', id)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    else if (action === 'update') {
      const { id, email, password, name, role } = payload
      
      // Update in auth
      const authUpdates: any = {}
      if (email) authUpdates.email = email
      if (password) authUpdates.password = password
      
      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates)
        if (authError) throw authError
      }

      // Update in system_users
      const { error: sysError } = await supabaseAdmin
        .from('system_users')
        .update({ name, email, role })
        .eq('id', id)

      if (sysError) throw sysError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
