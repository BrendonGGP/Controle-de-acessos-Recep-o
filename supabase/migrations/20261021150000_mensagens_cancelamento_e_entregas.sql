-- ==========================================
-- MENSAGENS: CANCELAMENTO, ALIMENTO E MERCADORIA
-- ==========================================
-- Tres avisos que faltavam:
--
--   cancelamento  reuniao excluida -> participantes. Hoje eles recebem o
--                 convite e o lembrete, mas nada quando a reuniao cai.
--   alimento      pedido chegou na recepcao -> colaborador vem buscar.
--   mercadoria    encomenda chegou na recepcao -> colaborador vem buscar.
--
-- Alimento e mercadoria sao registros de acesso (entrada), diferenciados
-- pela categoria. A mercadoria ja tinha categoria propria; o alimento nao.

-- ------------------------------------------
-- Categoria de alimento
-- ------------------------------------------
-- Antes, um i-food chegando era registrado como "entregas_mercadoria" --
-- a mesma gaveta de uma encomenda dos Correios. Separar permite texto
-- proprio ("seu pedido chegou") e relatorio por tipo.
alter table access_logs
  drop constraint if exists access_logs_category_check;

alter table access_logs
  add constraint access_logs_category_check
  check (category in (
    'entregas_mercadoria', 'entregas_alimento', 'atendimento', 'entrevista_rh',
    'prestadores_servico', 'stands', 'treinamentos_onboarding', 'visitas_reunioes'
  ));

-- ------------------------------------------
-- Tipo de template para cancelamento
-- ------------------------------------------
-- Alimento e mercadoria nao precisam de tipo novo: sao do tipo 'entrada'
-- com `category` preenchida, e a Edge Function ja escolhe o template
-- especifico da categoria antes de cair no generico.
alter table message_templates
  drop constraint if exists message_templates_type_check;

alter table message_templates
  add constraint message_templates_type_check
  check (type in ('entrada', 'saida', 'agendamento', 'lembrete', 'cancelamento'));

-- ------------------------------------------
-- Textos padrao
-- ------------------------------------------
-- Idempotente: so insere o que ainda nao existe, para a migration poder
-- rodar de novo sem duplicar.
insert into message_templates (type, category, subject, message, is_default)
select v.type, v.category, v.subject, v.message, true
from (values
  (
    'cancelamento',
    null::text,
    'Reunião Cancelada',
    E'Olá *{{nome_colaborador}}*! ❌\n\nA reunião abaixo foi *cancelada*:\n\n*Assunto:* {{titulo}}\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'entrada',
    'entregas_alimento',
    'Chegada de Alimento',
    E'Olá *{{nome_colaborador}}*! 🍽️\n\nSeu pedido chegou na recepção e está esperando por você.\n\n*Entregue por:* {{nome_visitante}}\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'entrada',
    'entregas_mercadoria',
    'Chegada de Mercadoria',
    E'Olá *{{nome_colaborador}}*! 📦\n\nChegou uma encomenda para você na recepção.\n\n*Entregue por:* {{nome_visitante}}\n\n_Mensagem automática da Portaria Inteligente._'
  )
) as v(type, category, subject, message)
where not exists (
  select 1 from message_templates mt
  where mt.type = v.type
    and mt.category is not distinct from v.category
);
