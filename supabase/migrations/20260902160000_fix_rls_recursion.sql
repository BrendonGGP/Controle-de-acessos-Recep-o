-- ==========================================
-- CORREÇÃO: recursão infinita no RLS
-- ==========================================
-- Problema (erro 42P17):
--   As policies checavam o papel com
--     exists (select 1 from system_users where id = auth.uid() and role = 'admin')
--   Só que, em `system_users`, esse próprio select dispara a policy da tabela
--   de novo — recursão infinita. E como as policies de `rooms`, `audit_log` e
--   `message_templates` também consultam `system_users`, TODA leitura do
--   sistema falhava, inclusive a busca de role feita pelo AuthContext.
--
-- Solução:
--   Uma função SECURITY DEFINER lê o papel ignorando o RLS, quebrando o ciclo.
--   `search_path` fixo evita sequestro por search_path malicioso.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from system_users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from system_users where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------
-- Recriar as policies usando is_admin()
-- ------------------------------------------

-- system_users: o usuário sempre pode ler a PRÓPRIA linha (necessário para o
-- AuthContext descobrir o papel no login). Admin gerencia todos.
drop policy if exists "Somente admin gerencia system_users" on system_users;

create policy "Usuário lê a própria linha em system_users"
  on system_users for select
  using (id = auth.uid());

create policy "Admin gerencia system_users"
  on system_users for all
  using (public.is_admin())
  with check (public.is_admin());

-- rooms
drop policy if exists "Somente admin gerencia salas" on rooms;
create policy "Admin gerencia salas"
  on rooms for all
  using (public.is_admin())
  with check (public.is_admin());

-- audit_log
drop policy if exists "Somente admin lê auditoria" on audit_log;
create policy "Admin lê auditoria"
  on audit_log for select
  using (public.is_admin());

-- message_templates
drop policy if exists "Somente admin gerencia templates" on message_templates;
create policy "Admin gerencia templates"
  on message_templates for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------
-- WITH CHECK nas policies permissivas
-- ------------------------------------------
-- `for all ... using (...)` sem WITH CHECK deixa o INSERT sem validação.
-- Recriadas explicitamente para valer também na escrita.

drop policy if exists "Autenticados gerenciam access_logs" on access_logs;
create policy "Autenticados gerenciam access_logs"
  on access_logs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Autenticados gerenciam collaborators" on collaborators;
create policy "Autenticados gerenciam collaborators"
  on collaborators for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Autenticados gerenciam room_bookings" on room_bookings;
create policy "Autenticados gerenciam room_bookings"
  on room_bookings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Autenticados gerenciam booking_participants" on booking_participants;
create policy "Autenticados gerenciam booking_participants"
  on booking_participants for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
