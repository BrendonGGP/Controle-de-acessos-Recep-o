-- ==========================================
-- INATIVAÇÃO TEMPORÁRIA DE SALA
-- ==========================================
-- Uma sala pode sair de uso por um tempo (manutenção, reforma, ar-condicionado
-- quebrado) sem ser excluída: excluir perderia o histórico de reservas e
-- exigiria recadastrar depois.
--
-- A recepção pode inativar e reativar, porque é quem percebe o problema na
-- hora. Criar e excluir sala continua restrito ao admin.

alter table rooms
  add column if not exists ativa boolean not null default true,
  add column if not exists motivo_inatividade text,
  add column if not exists inativada_em timestamptz,
  add column if not exists inativada_por uuid references system_users(id);

comment on column rooms.ativa is
  'Falsa enquanto a sala estiver fora de uso. Não aceita reservas novas; as já marcadas seguem valendo.';
comment on column rooms.motivo_inatividade is
  'Texto livre exibido no selo da tela de Salas. Ex: "em manutenção".';

-- Índice parcial: a tela de Salas lista as ativas a cada carga, e as
-- inativas são a minoria.
create index if not exists idx_rooms_ativas on rooms (name) where ativa;

-- ------------------------------------------
-- Consistência dos campos
-- ------------------------------------------
-- Sala ativa não carrega motivo nem carimbo de quem inativou: sem isso, o
-- selo "em manutenção" continuaria aparecendo depois de reativada.
create or replace function public.limpa_inatividade_sala()
returns trigger
language plpgsql
as $$
begin
  if new.ativa then
    new.motivo_inatividade := null;
    new.inativada_em := null;
    new.inativada_por := null;
  elsif old.ativa or old.inativada_em is null then
    -- Passou de ativa para inativa agora: carimba quem e quando.
    new.inativada_em := now();
    new.inativada_por := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limpa_inatividade_sala on rooms;
create trigger trg_limpa_inatividade_sala
  before update on rooms
  for each row execute function public.limpa_inatividade_sala();

-- ------------------------------------------
-- Permissões
-- ------------------------------------------
-- O RLS do Postgres autoriza a linha inteira, não coluna a coluna. Para a
-- recepção poder alternar a disponibilidade sem poder renomear a sala, a
-- policy libera o UPDATE e um trigger rejeita a mudança de qualquer outro
-- campo quando quem edita não é admin.
create or replace function public.protege_campos_sala()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.name is distinct from old.name
     or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'Somente administradores podem alterar o cadastro da sala.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protege_campos_sala on rooms;
create trigger trg_protege_campos_sala
  before update on rooms
  for each row execute function public.protege_campos_sala();

-- A policy `for all` do admin cobre insert/update/delete e continua valendo.
-- Esta acrescenta o update para os demais autenticados, limitado pelo trigger.
create policy "Autenticados alteram disponibilidade da sala"
  on rooms for update
  using (auth.role() = 'authenticated' and not public.is_n8n_service())
  with check (auth.role() = 'authenticated' and not public.is_n8n_service());
