-- ==========================================
-- USUÁRIO DE SERVIÇO PARA O N8N
-- ==========================================
-- A migration anterior criou o role de banco `n8n_notifier`, mas ele
-- exigiria um JWT assinado com o JWT Secret do projeto. Este projeto usa
-- chaves assimétricas (ES256) e não expõe secret compartilhado, então
-- não há como assinar esse token por fora.
--
-- Abordagem alternativa: o n8n faz login no Auth como um usuário comum
-- (e-mail + senha) e recebe um token legítimo do Supabase. As políticas
-- abaixo reconhecem esse usuário e liberam exatamente o necessário.
--
-- Vantagens sobre a service_role:
--   - a permissão é declarada aqui, auditável no versionamento
--   - o acesso pode ser revogado desativando o usuário, sem trocar chaves
--   - o n8n não enxerga system_users nem audit_log
--
-- O usuário de serviço é marcado em system_users com role 'servico',
-- o que também o mantém fora das telas de administração.

-- ------------------------------------------
-- Permitir o papel 'servico' em system_users
-- ------------------------------------------
alter table system_users
  drop constraint if exists system_users_role_check;

alter table system_users
  add constraint system_users_role_check
  check (role in ('admin', 'recepcao', 'servico'));

-- ------------------------------------------
-- Função que identifica o usuário de serviço
-- ------------------------------------------
-- SECURITY DEFINER pelo mesmo motivo de is_admin(): sem isso, a consulta
-- a system_users dentro de uma policy dispararia a policy da própria
-- tabela, criando recursão infinita (erro 42P17).
create or replace function public.is_n8n_service()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'servico' from system_users where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_n8n_service() from public, anon;
grant execute on function public.is_n8n_service() to authenticated;

-- ------------------------------------------
-- Políticas de leitura
-- ------------------------------------------
-- As tabelas abaixo já têm policies para 'authenticated', que cobrem o
-- usuário de serviço. As específicas ficam para message_templates, que
-- hoje só libera leitura a autenticados — e isso já basta.
--
-- O ponto sensível é a ESCRITA: sem uma policy própria, o usuário de
-- serviço herdaria as permissões amplas de 'authenticated' e poderia
-- alterar reservas, colaboradores e registros de acesso.

-- ------------------------------------------
-- Restringir a escrita do usuário de serviço
-- ------------------------------------------
-- As policies "Autenticados gerenciam X" usam `for all`, o que daria ao
-- n8n poder de INSERT/UPDATE/DELETE nessas tabelas. Recriamos cada uma
-- excluindo o usuário de serviço, e damos a ele apenas o que precisa.

drop policy if exists "Autenticados gerenciam room_bookings" on room_bookings;
create policy "Autenticados gerenciam room_bookings"
  on room_bookings for all
  using (auth.role() = 'authenticated' and not public.is_n8n_service())
  with check (auth.role() = 'authenticated' and not public.is_n8n_service());

create policy "Servico le room_bookings"
  on room_bookings for select
  using (public.is_n8n_service());

create policy "Servico marca reminder_sent"
  on room_bookings for update
  using (public.is_n8n_service())
  with check (public.is_n8n_service());

drop policy if exists "Autenticados gerenciam collaborators" on collaborators;
create policy "Autenticados gerenciam collaborators"
  on collaborators for all
  using (auth.role() = 'authenticated' and not public.is_n8n_service())
  with check (auth.role() = 'authenticated' and not public.is_n8n_service());

create policy "Servico le collaborators"
  on collaborators for select
  using (public.is_n8n_service());

drop policy if exists "Autenticados gerenciam access_logs" on access_logs;
create policy "Autenticados gerenciam access_logs"
  on access_logs for all
  using (auth.role() = 'authenticated' and not public.is_n8n_service())
  with check (auth.role() = 'authenticated' and not public.is_n8n_service());

create policy "Servico le access_logs"
  on access_logs for select
  using (public.is_n8n_service());

drop policy if exists "Autenticados gerenciam booking_participants" on booking_participants;
create policy "Autenticados gerenciam booking_participants"
  on booking_participants for all
  using (auth.role() = 'authenticated' and not public.is_n8n_service())
  with check (auth.role() = 'authenticated' and not public.is_n8n_service());

create policy "Servico le booking_participants"
  on booking_participants for select
  using (public.is_n8n_service());

-- rooms: leitura já é liberada a todo autenticado; a escrita exige
-- is_admin(), que o usuário de serviço não satisfaz. Nada a fazer.

-- ------------------------------------------
-- Impedir escalada de privilégio
-- ------------------------------------------
-- Sem isto, o usuário de serviço poderia ler a própria linha em
-- system_users. Não precisa, e é informação a menos exposta.
drop policy if exists "Usuário lê a própria linha em system_users" on system_users;
create policy "Usuario le a propria linha em system_users"
  on system_users for select
  using (id = auth.uid() and not public.is_n8n_service());

-- ------------------------------------------
-- Limpeza da abordagem anterior
-- ------------------------------------------
-- O role n8n_notifier não será usado: sem JWT Secret, não há como
-- emitir um token que o PostgREST aceite para ele.
drop policy if exists "n8n le room_bookings" on room_bookings;
drop policy if exists "n8n atualiza reminder_sent" on room_bookings;
drop policy if exists "n8n le booking_participants" on booking_participants;
drop policy if exists "n8n le collaborators" on collaborators;
drop policy if exists "n8n le rooms" on rooms;
drop policy if exists "n8n le access_logs" on access_logs;
drop policy if exists "n8n le message_templates" on message_templates;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_notifier') then
    revoke all on all tables in schema public from n8n_notifier;
    revoke usage on schema public from n8n_notifier;
    -- `authenticator` não existe num Postgres puro (CI)
    if exists (select 1 from pg_roles where rolname = 'authenticator') then
      revoke n8n_notifier from authenticator;
    end if;
    drop role n8n_notifier;
  end if;
end
$$;
