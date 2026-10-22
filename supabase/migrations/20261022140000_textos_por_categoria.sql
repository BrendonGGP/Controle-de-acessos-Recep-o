-- ==========================================
-- TEXTOS DE ENTRADA POR CATEGORIA
-- ==========================================
-- A recepcao mandou os textos que usavam no sistema antigo: cada tipo de
-- visita tinha a sua frase. Hoje alimento e mercadoria ja tem texto
-- proprio; as outras cinco caem no generico "registrou uma entrada", que
-- nao diz se e um candidato, um cliente ou o tecnico do ar-condicionado.
--
-- Idempotente: so insere a categoria que ainda nao existe.

insert into message_templates (type, category, subject, message, is_default)
select 'entrada', v.category, v.subject, v.message, true
from (values
  (
    'visitas_reunioes',
    'Aviso de Visita ou Reunião',
    E'Olá *{{nome_colaborador}}*! 🏢\n\nO(a) visitante *{{nome_visitante}}* acabou de registrar entrada na recepção para uma visita/reunião.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'entrevista_rh',
    'Aviso de Entrevista',
    E'Olá *{{nome_colaborador}}*! 📋\n\nO(a) candidato(a) *{{nome_visitante}}* chegou para a entrevista.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'atendimento',
    'Aviso de Atendimento',
    E'Olá *{{nome_colaborador}}*! 🤝\n\nO cliente *{{nome_visitante}}* acabou de registrar entrada na recepção para um atendimento.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'prestadores_servico',
    'Aviso de Prestador de Serviço',
    E'Olá *{{nome_colaborador}}*! 🔧\n\nO prestador de serviço *{{nome_visitante}}* chegou para realizar um serviço.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'stands',
    'Aviso de Stand',
    E'Olá *{{nome_colaborador}}*! 🎪\n\nUm visitante chegou para o stand: *{{nome_visitante}}*.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'treinamentos_onboarding',
    'Aviso de Treinamento',
    E'Olá *{{nome_colaborador}}*! 🎓\n\nO participante *{{nome_visitante}}* chegou para o treinamento/onboarding.\n\n_Mensagem automática da Portaria Inteligente._'
  )
) as v(category, subject, message)
where not exists (
  select 1 from message_templates mt
  where mt.type = 'entrada' and mt.category = v.category
);

-- ------------------------------------------
-- Café no convite da reunião
-- ------------------------------------------
-- A reserva ja guarda `service` (com_cafe / sem_cafe), mas o convite nunca
-- disse nada — quem recebia nao sabia se a copa tinha sido acionada. A
-- variavel {{cafe}} chega vazia quando nao ha servico, entao a linha
-- simplesmente nao aparece.
update message_templates
set message = E'Olá *{{nome_colaborador}}*! 📅\n\nVocê foi convidado(a) para uma reunião:\n\n*Assunto:* {{titulo}}\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}{{cafe}}\n\n_Mensagem automática da Portaria Inteligente._',
    updated_at = now()
where type = 'agendamento'
  and category is null
  -- So mexe se ninguem tiver editado o texto pelo painel.
  and message not like '%{{cafe}}%'
  and message like '%{{horario}}%';

update message_templates
set message = E'Olá *{{nome_colaborador}}*! ⏰\n\nSua reunião começa em breve:\n\n*Assunto:* {{titulo}}\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}{{cafe}}\n\n_Mensagem automática da Portaria Inteligente._',
    updated_at = now()
where type = 'lembrete'
  and category is null
  and message not like '%{{cafe}}%'
  and message like '%{{horario}}%';
