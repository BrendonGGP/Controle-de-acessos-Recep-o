-- ==========================================
-- AVALIAÇÃO PÓS-VISITA
-- ==========================================
-- A recepção pediu o envio do link de avaliação na saída, e um lembrete
-- 24h depois para quem esqueceu de responder.
--
-- O formulário é um Microsoft Forms com link único para todos. Ele não
-- informa quem respondeu, e o sistema não tem acesso às respostas — então
-- o lembrete vai para todos que receberam o primeiro envio, e o texto
-- reconhece isso ("se já respondeu, desconsidere"). Preciso e silencioso
-- era impossível; escolhemos honesto.

-- ------------------------------------------
-- Controle de envio
-- ------------------------------------------
-- Duas colunas na linha de ENTRADA (a que já guarda saida_em), e não na
-- de saída: é a entrada que representa a visita inteira.
alter table access_logs
  add column if not exists avaliacao_enviada_em timestamptz,
  add column if not exists avaliacao_lembrete_em timestamptz;

comment on column access_logs.avaliacao_enviada_em is
  'Quando o link de avaliação foi enviado na saída. Nulo = não enviado.';
comment on column access_logs.avaliacao_lembrete_em is
  'Quando o lembrete de 24h saiu. Nulo = ainda não; a visita entra na busca do lembrete.';

-- Quem está esperando lembrete: visita avaliada ontem, sem lembrete ainda.
-- Índice parcial porque a fila é sempre pequena perto do total de registros.
create index if not exists idx_access_logs_aguarda_lembrete
  on access_logs (avaliacao_enviada_em)
  where avaliacao_enviada_em is not null and avaliacao_lembrete_em is null;

-- ------------------------------------------
-- O link
-- ------------------------------------------
-- Em tabela, não no código: trocar o formulário não deveria exigir deploy.
-- A mesma tabela serve para outras configurações que vierem.
create table if not exists app_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

-- Leitura para quem está logado (o n8n usa o usuário de serviço); escrita
-- só para admin, que é quem troca o formulário.
drop policy if exists "app_settings_leitura" on app_settings;
create policy "app_settings_leitura" on app_settings
  for select to authenticated using (true);

drop policy if exists "app_settings_escrita" on app_settings;
create policy "app_settings_escrita" on app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into app_settings (key, value, description)
values (
  'link_avaliacao',
  'https://forms.office.com/r/TJY8EbsEsF',
  'Formulário de avaliação enviado ao visitante na saída.'
)
on conflict (key) do nothing;

-- ------------------------------------------
-- Escrita do serviço (n8n)
-- ------------------------------------------
-- O usuário de serviço só LÊ access_logs. Para o fluxo do lembrete marcar
-- que já enviou, precisa de uma policy própria — espelhando a que já
-- existe para reminder_sent nas reservas.
--
-- Sem isto, o update falharia silenciosamente (RLS não devolve erro, só
-- não afeta linha nenhuma) e o mesmo visitante receberia lembrete a cada
-- passagem do agendamento.
drop policy if exists "Servico marca avaliacao" on access_logs;
create policy "Servico marca avaliacao" on access_logs
  for update to authenticated
  using (public.is_n8n_service())
  with check (public.is_n8n_service());

-- ------------------------------------------
-- Os textos
-- ------------------------------------------
alter table message_templates
  drop constraint if exists message_templates_type_check;

alter table message_templates
  add constraint message_templates_type_check
  check (type = any (array[
    'entrada', 'saida', 'agendamento', 'lembrete', 'cancelamento',
    'atualizacao', 'avaliacao'
  ]));

insert into message_templates (type, category, subject, message, is_default)
select 'avaliacao', null, 'Avaliação da Visita',
  E'Olá *{{nome_visitante}}*! 👋\n\nObrigado pela sua visita ao *Grupo Gomes Pires*.\n\nSua opinião nos ajuda a melhorar. Leva menos de um minuto:\n\n{{link}}\n\n_Mensagem automática da Portaria Inteligente._',
  true
where not exists (
  select 1 from message_templates where type = 'avaliacao' and category is null
);

-- O lembrete assume que a pessoa pode já ter respondido: o formulário não
-- nos diz, então o texto pede desculpa adiantado em vez de insistir.
insert into message_templates (type, category, subject, message, is_default)
select 'avaliacao', 'lembrete', 'Avaliação da Visita (lembrete)',
  E'Olá *{{nome_visitante}}*! 👋\n\nPassando para lembrar da avaliação sobre sua visita ao *Grupo Gomes Pires*. Leva menos de um minuto:\n\n{{link}}\n\n_Se você já respondeu, desconsidere este lembrete — e obrigado!_',
  true
where not exists (
  select 1 from message_templates where type = 'avaliacao' and category = 'lembrete'
);

-- ------------------------------------------
-- Quem recebe
-- ------------------------------------------
-- Só visita/reunião e atendimento, como a recepção definiu. Entregador de
-- mercadoria ou candidato de entrevista recebendo pesquisa de satisfação
-- soaria deslocado — e no caso do candidato, a resposta viria enviesada
-- pelo resultado do processo.
--
-- Em função, e não espalhado pelo fluxo: a regra fica num lugar só, e a
-- tela e o n8n perguntam para a mesma fonte.
create or replace function public.avaliacao_elegivel(p_category text)
returns boolean
language sql
immutable
as $$ select p_category in ('visitas_reunioes', 'atendimento'); $$;

comment on function public.avaliacao_elegivel(text) is
  'Categorias que recebem o link de avaliação na saída.';
