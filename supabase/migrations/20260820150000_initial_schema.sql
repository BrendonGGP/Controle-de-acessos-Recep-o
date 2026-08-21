-- ==========================================
-- CONTAS DE LOGIN DO SISTEMA
-- ==========================================
create table system_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'recepcao')),
  created_at timestamptz default now()
);

-- ==========================================
-- COLABORADORES
-- ==========================================
create table collaborators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text not null,
  cpf text,
  created_at timestamptz default now()
);

-- ==========================================
-- SALAS DE REUNIÃO
-- ==========================================
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- ==========================================
-- AGENDAMENTOS DE SALA
-- ==========================================
create table room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  title text not null,
  booking_date date not null,
  start_time time not null,
  duration_minutes int not null check (duration_minutes > 0),
  end_time time generated always as (start_time + (duration_minutes * interval '1 minute')) stored,
  service text check (service in ('com_cafe', 'sem_cafe')) default 'sem_cafe',
  created_by uuid references system_users(id),
  reminder_sent boolean default false,
  created_at timestamptz default now()
);

create table booking_participants (
  booking_id uuid references room_bookings(id) on delete cascade,
  collaborator_id uuid references collaborators(id) on delete cascade,
  primary key (booking_id, collaborator_id)
);

create index idx_bookings_room_date on room_bookings (room_id, booking_date);

-- ==========================================
-- CONTROLE DE ACESSO
-- ==========================================
create table access_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('entrada', 'saida')),
  category text not null check (category in (
    'entregas_mercadoria', 'atendimento', 'entrevista_rh',
    'prestadores_servico', 'stands', 'treinamentos_onboarding', 'visitas_reunioes'
  )),
  visitor_name text not null,
  phone text,
  document text,
  observations text,
  notify boolean default false,
  notified_collaborator_id uuid references collaborators(id),
  created_by uuid references system_users(id),
  created_at timestamptz default now()
);

create index idx_access_logs_created_at on access_logs (created_at desc);

-- ==========================================
-- TEMPLATES DE MENSAGEM
-- ==========================================
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  category text, 
  type text not null check (type in ('entrada', 'saida', 'agendamento', 'lembrete')),
  subject text,
  message text not null,
  is_default boolean default true,
  updated_at timestamptz default now()
);

-- ==========================================
-- LOG DE AUDITORIA
-- ==========================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references system_users(id),
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz default now()
);

-- ==========================================
-- TRIGGERS DE VALIDAÇÃO
-- ==========================================
create or replace function check_email_domain()
returns trigger as $$
begin
  if new.email !~* '@grupogomespires\.com\.br$' then
    raise exception 'E-mail deve pertencer ao domínio @grupogomespires.com.br';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_email_domain
  before insert or update on system_users
  for each row execute function check_email_domain();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table rooms enable row level security;
alter table system_users enable row level security;
alter table audit_log enable row level security;
alter table collaborators enable row level security;
alter table room_bookings enable row level security;
alter table booking_participants enable row level security;
alter table access_logs enable row level security;
alter table message_templates enable row level security;

-- Rooms
create policy "Usuários autenticados podem ver salas" on rooms for select using (auth.role() = 'authenticated');
create policy "Somente admin gerencia salas" on rooms for all using (exists (select 1 from system_users where id = auth.uid() and role = 'admin'));

-- Audit Log
create policy "Somente admin lê auditoria" on audit_log for select using (exists (select 1 from system_users where id = auth.uid() and role = 'admin'));

-- System Users
create policy "Somente admin gerencia system_users" on system_users for all using (exists (select 1 from system_users where id = auth.uid() and role = 'admin'));

-- Access Logs
create policy "Autenticados gerenciam access_logs" on access_logs for all using (auth.role() = 'authenticated');

-- Collaborators
create policy "Autenticados gerenciam collaborators" on collaborators for all using (auth.role() = 'authenticated');

-- Room Bookings & Participants
create policy "Autenticados gerenciam room_bookings" on room_bookings for all using (auth.role() = 'authenticated');
create policy "Autenticados gerenciam booking_participants" on booking_participants for all using (auth.role() = 'authenticated');

-- Message Templates
create policy "Somente admin gerencia templates" on message_templates for all using (exists (select 1 from system_users where id = auth.uid() and role = 'admin'));
create policy "Autenticados podem ler templates" on message_templates for select using (auth.role() = 'authenticated');
