-- ==========================================
-- REAPROVEITAR CADASTRO DE VISITA ANTERIOR
-- ==========================================
-- A recepção pediu para não precisar solicitar documento de novo a quem
-- já esteve aqui. Os dados já existem: cada entrada guarda nome, documento
-- e telefone — mas espalhados por milhares de linhas, sem jeito de achar
-- a visita anterior de alguém.
--
-- Esta função faz essa ponte. Não cria cadastro novo nem tabela nova: lê
-- o que o controle de acesso já registrou.

-- ------------------------------------------
-- Prazo de descarte
-- ------------------------------------------
-- 12 meses. Documento de visitante é dado pessoal, e a LGPD pede retenção
-- pelo tempo necessário à finalidade — não para sempre. Quem não volta há
-- um ano apresenta documento de novo, que é o comportamento de hoje.
--
-- O dado antigo continua no histórico (o controle de acesso é o registro
-- de quem entrou no prédio); o que expira é o reaproveitamento.
create or replace function public.meses_retencao_cadastro()
returns integer language sql immutable
as $$ select 12; $$;

comment on function public.meses_retencao_cadastro() is
  'Por quantos meses uma visita anterior pode ser reaproveitada no cadastro.';

-- A busca filtra por data e ordena pela visita mais recente de cada pessoa.
create index if not exists idx_access_logs_cadastro_anterior
  on access_logs (created_at desc)
  where action = 'entrada' and document is not null;

-- ------------------------------------------
-- A busca
-- ------------------------------------------
-- Em função, e não como consulta na tela, por três motivos: o DISTINCT ON
-- precisa rodar perto dos dados, o prazo de retenção fica num lugar só, e
-- a tela não deveria poder varrer access_logs inteiro.
--
-- SECURITY INVOKER (o padrão): quem chama precisa de permissão de leitura
-- em access_logs, que o RLS já garante para usuários autenticados.
create or replace function public.buscar_cadastro_anterior(p_termo text)
returns table (
  visitor_name text,
  document text,
  phone text,
  ultima_visita timestamptz
)
language sql
stable
set search_path = public
as $$
  -- Dois caracteres no mínimo: com um, a lista traz meio banco e não
  -- ajuda ninguém a escolher.
  select distinct on (a.document)
    a.visitor_name,
    a.document,
    a.phone,
    a.created_at
  from access_logs a
  where a.action = 'entrada'
    and a.document is not null
    and btrim(a.document) <> ''
    and a.created_at > now() - (public.meses_retencao_cadastro() || ' months')::interval
    and length(btrim(p_termo)) >= 2
    and (
      a.visitor_name ilike '%' || btrim(p_termo) || '%'
      or (
        -- Documento comparado só por dígitos: quem digita "12345678900"
        -- encontra quem foi cadastrado como "123.456.789-00".
        -- O termo sem dígito nenhum não entra aqui, senão o LIKE '%%'
        -- casaria com todo mundo que tem documento.
        regexp_replace(btrim(p_termo), '\D', '', 'g') <> ''
        and regexp_replace(a.document, '\D', '', 'g')
            like '%' || regexp_replace(btrim(p_termo), '\D', '', 'g') || '%'
      )
    )
  -- DISTINCT ON com esta ordem devolve a visita MAIS RECENTE de cada
  -- documento: o telefone de 2 meses atrás vale mais que o de um ano.
  order by a.document, a.created_at desc
  limit 10;
$$;

comment on function public.buscar_cadastro_anterior(text) is
  'Visitantes anteriores que combinam com o termo, um por documento, do mais recente. Respeita o prazo de retenção.';

revoke execute on function public.buscar_cadastro_anterior(text) from public, anon;
grant execute on function public.buscar_cadastro_anterior(text) to authenticated;

-- ------------------------------------------
-- Relatório
-- ------------------------------------------
-- A tela monta o PDF, mas os dados vêm daqui: filtrar e ordenar no banco
-- evita trazer o histórico inteiro para o navegador só para descartar a
-- maior parte.
create or replace function public.relatorio_acessos(
  p_inicio date,
  p_fim date,
  p_categoria text default null
)
returns table (
  data_hora timestamptz,
  acao text,
  categoria text,
  visitante text,
  documento text,
  telefone text,
  observacoes text,
  avisou text,
  saida timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    a.created_at,
    a.action,
    a.category,
    a.visitor_name,
    a.document,
    a.phone,
    a.observations,
    c.name,
    a.saida_em
  from access_logs a
  left join collaborators c on c.id = a.notified_collaborator_id
  where a.created_at >= p_inicio
    -- O fim é inclusivo: quem pede "até 22/10" espera o dia 22 inteiro,
    -- não até a meia-noite em ponto.
    and a.created_at < (p_fim + 1)
    and (p_categoria is null or a.category = p_categoria)
  order by a.created_at desc;
$$;

comment on function public.relatorio_acessos(date, date, text) is
  'Acessos do período para exportação. Data final inclusiva.';

revoke execute on function public.relatorio_acessos(date, date, text) from public, anon;
grant execute on function public.relatorio_acessos(date, date, text) to authenticated;
