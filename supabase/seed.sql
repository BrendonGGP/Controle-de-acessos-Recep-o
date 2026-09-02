-- ==========================================
-- SEED INICIAL - Sistema Recepção GGP
-- ==========================================
-- Executado automaticamente por `supabase db reset` (local).
-- Em produção, rode manualmente via SQL Editor ou `psql`.
--
-- Idempotente: pode ser executado mais de uma vez sem duplicar dados.

-- ------------------------------------------
-- SALAS DE REUNIÃO
-- ------------------------------------------
insert into rooms (name) values
  ('Bugatti'),
  ('Ferrari'),
  ('Ford'),
  ('Honda'),
  ('Mercedes'),
  ('Nissan'),
  ('Podcast'),
  ('Toyota')
on conflict (name) do nothing;

-- ------------------------------------------
-- TEMPLATES DE MENSAGEM
-- ------------------------------------------
-- Variáveis disponíveis (substituídas pelas Edge Functions):
--   entrada/saida     : {{nome_colaborador}}, {{nome_visitante}}, {{acao}}
--   agendamento       : {{nome_colaborador}}, {{titulo}}, {{sala}}, {{data}}, {{horario}}
--   lembrete          : {{nome_colaborador}}, {{titulo}}, {{sala}}, {{data}}, {{horario}}
--
-- `category` fica NULL = template padrão, usado para qualquer categoria de acesso.
-- Para personalizar por categoria, insira uma linha com o mesmo `type` e a
-- `category` desejada; as Edge Functions dão preferência à mais específica.

insert into message_templates (type, category, subject, message, is_default)
select v.type, null::text, v.subject, v.message, true
from (values
  (
    'entrada',
    'Aviso de Chegada',
    E'Olá *{{nome_colaborador}}*! 🏢\n\nO(a) visitante/prestador *{{nome_visitante}}* acabou de registrar uma *entrada* na recepção.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'saida',
    'Aviso de Saída',
    E'Olá *{{nome_colaborador}}*! 🏢\n\nO(a) visitante/prestador *{{nome_visitante}}* acabou de registrar uma *saída* da recepção.\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'agendamento',
    'Convite de Reunião',
    E'Olá *{{nome_colaborador}}*! 📅\n\nVocê foi convidado(a) para uma reunião:\n\n*Assunto:* {{titulo}}\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}\n\n_Mensagem automática da Portaria Inteligente._'
  ),
  (
    'lembrete',
    'Lembrete de Reunião',
    E'Olá *{{nome_colaborador}}*! ⏰\n\nSua reunião começa em breve:\n\n*Assunto:* {{titulo}}\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}\n\n_Mensagem automática da Portaria Inteligente._'
  )
) as v(type, subject, message)
where not exists (
  select 1 from message_templates mt
  where mt.type = v.type and mt.category is null
);
