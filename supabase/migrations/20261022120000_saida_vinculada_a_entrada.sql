-- ==========================================
-- SAÍDA VINCULADA À ENTRADA
-- ==========================================
-- Até aqui entrada e saída eram registros soltos: para dar baixa, a
-- recepcionista digitava o nome do visitante de novo. Nada ligava os dois,
-- então o sistema nunca soube quem ainda estava na empresa.
--
-- Com o vínculo, a tela de saída passa a listar quem entrou e não saiu, e
-- a baixa vira um clique.

alter table access_logs
  add column if not exists entrada_id uuid references access_logs(id) on delete set null,
  add column if not exists saida_em timestamptz;

comment on column access_logs.entrada_id is
  'Na linha de saída, aponta para a entrada correspondente.';
comment on column access_logs.saida_em is
  'Na linha de entrada, quando a baixa foi dada. Nulo = visitante ainda presente.';

-- Quem ainda está na empresa: a consulta que a tela de saída faz a cada
-- carga. Índice parcial porque as entradas em aberto são a minoria.
create index if not exists idx_access_logs_presentes
  on access_logs (created_at desc)
  where action = 'entrada' and saida_em is null;

-- ------------------------------------------
-- Entradas anteriores a esta migration
-- ------------------------------------------
-- Sem isto, todo visitante que já passou pela recepção apareceria como
-- presente — meses de registros numa lista que deveria ter as pessoas de
-- hoje. Fechamos as de dias passados com o fim do próprio dia, que é a
-- melhor aproximação disponível: a saída real nunca foi registrada.
-- As de hoje ficam em aberto, caso alguém ainda esteja na empresa.
update access_logs
set saida_em = (date(created_at at time zone 'America/Sao_Paulo') + time '23:59')
               at time zone 'America/Sao_Paulo'
where action = 'entrada'
  and saida_em is null
  and date(created_at at time zone 'America/Sao_Paulo')
      < date(now() at time zone 'America/Sao_Paulo');

-- ------------------------------------------
-- Baixa em uma transação só
-- ------------------------------------------
-- Registrar a saída e marcar a entrada são dois passos. Se o segundo
-- falhasse, o visitante apareceria como presente mesmo tendo saído —
-- e a recepcionista daria baixa duas vezes. A função garante os dois
-- juntos ou nenhum.
--
-- SECURITY DEFINER com search_path fixo: a função escreve em access_logs
-- em nome de quem chama, e o RLS da tabela já exige usuário autenticado.
create or replace function public.registrar_saida(
  p_entrada_id uuid,
  p_observacoes text default null
)
returns access_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrada access_logs;
  v_saida access_logs;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Apenas usuários autenticados podem registrar saída.';
  end if;

  select * into v_entrada
  from access_logs
  where id = p_entrada_id and action = 'entrada'
  for update;

  if not found then
    raise exception 'Entrada não encontrada.';
  end if;

  if v_entrada.saida_em is not null then
    raise exception 'Esta entrada já teve a saída registrada.';
  end if;

  insert into access_logs (
    action, category, visitor_name, phone, document, observations,
    notify, notified_collaborator_id, created_by, entrada_id
  ) values (
    'saida', v_entrada.category, v_entrada.visitor_name, v_entrada.phone,
    v_entrada.document, p_observacoes,
    -- A saída não repete o aviso de chegada: quem precisava saber já foi
    -- avisado na entrada.
    false, v_entrada.notified_collaborator_id, auth.uid(), v_entrada.id
  )
  returning * into v_saida;

  update access_logs set saida_em = now() where id = v_entrada.id;

  return v_saida;
end;
$$;

revoke execute on function public.registrar_saida(uuid, text) from public, anon;
grant execute on function public.registrar_saida(uuid, text) to authenticated;
