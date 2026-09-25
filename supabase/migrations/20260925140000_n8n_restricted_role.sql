-- ==========================================
-- ROLE RESTRITO PARA O N8N
-- ==========================================
-- O n8n precisa ler dados para montar as notificações (participantes,
-- telefones, templates) e marcar lembretes já enviados.
--
-- Usar a service_role para isso seria excessivo: ela ignora todo o RLS e
-- dá acesso irrestrito ao banco. Se o n8n for comprometido, o estrago
-- seria total.
--
-- Este role tem exatamente o necessário:
--   LEITURA  : room_bookings, booking_participants, collaborators,
--              rooms, access_logs, message_templates
--   ESCRITA  : apenas room_bookings.reminder_sent
--   NEGADO   : system_users, audit_log, e qualquer escrita fora do acima
--
-- O n8n autentica no PostgREST com um JWT assinado com o JWT secret do
-- projeto, contendo {"role": "n8n_notifier"}.

-- ------------------------------------------
-- Criação do role
-- ------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'n8n_notifier') then
    create role n8n_notifier nologin noinherit;
  end if;
end
$$;

-- O PostgREST precisa poder assumir este role
grant n8n_notifier to authenticator;

-- Acesso ao schema (sem isso, nada é visível)
grant usage on schema public to n8n_notifier;

-- ------------------------------------------
-- Permissões de LEITURA
-- ------------------------------------------
grant select on room_bookings        to n8n_notifier;
grant select on booking_participants to n8n_notifier;
grant select on collaborators        to n8n_notifier;
grant select on rooms                to n8n_notifier;
grant select on access_logs          to n8n_notifier;
grant select on message_templates    to n8n_notifier;

-- Leitura restrita em system_users: o n8n NÃO precisa ver e-mails nem
-- papéis. Nenhum grant aqui — a tabela fica inacessível.

-- ------------------------------------------
-- Permissão de ESCRITA (mínima)
-- ------------------------------------------
-- Só a coluna reminder_sent, para marcar lembretes já disparados.
-- Um UPDATE em qualquer outra coluna é rejeitado pelo Postgres.
grant update (reminder_sent) on room_bookings to n8n_notifier;

-- ------------------------------------------
-- Políticas de RLS
-- ------------------------------------------
-- As tabelas têm RLS ativo. Sem políticas para este role, as consultas
-- voltariam vazias mesmo com os grants acima.

create policy "n8n le room_bookings"
  on room_bookings for select
  to n8n_notifier
  using (true);

create policy "n8n atualiza reminder_sent"
  on room_bookings for update
  to n8n_notifier
  using (true)
  with check (true);

create policy "n8n le booking_participants"
  on booking_participants for select
  to n8n_notifier
  using (true);

create policy "n8n le collaborators"
  on collaborators for select
  to n8n_notifier
  using (true);

create policy "n8n le rooms"
  on rooms for select
  to n8n_notifier
  using (true);

create policy "n8n le access_logs"
  on access_logs for select
  to n8n_notifier
  using (true);

create policy "n8n le message_templates"
  on message_templates for select
  to n8n_notifier
  using (true);

-- ------------------------------------------
-- Índice para o workflow de lembretes
-- ------------------------------------------
-- O workflow roda a cada minuto procurando reuniões que começam em
-- breve e ainda não foram avisadas. Sem índice, isso vira varredura
-- completa da tabela 1440 vezes por dia.
create index if not exists idx_bookings_reminder_pendente
  on room_bookings (booking_date, start_time)
  where reminder_sent = false;
