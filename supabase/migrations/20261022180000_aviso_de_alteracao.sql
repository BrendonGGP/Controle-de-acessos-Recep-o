-- ==========================================
-- AVISO DE ALTERAÇÃO DE REUNIÃO
-- ==========================================
-- Agendar avisa, lembrar avisa, cancelar avisa — alterar, não. Quem foi
-- convidado para quinta às 14h continuava achando que era quinta às 14h
-- depois da recepção mudar para sexta às 9h. O furo já estava em uso: a
-- tela salvava a mudança e dizia "Reunião atualizada" sem avisar ninguém.
--
-- A recepção pediu "quando houver alteração de data ou horário seja
-- informado". A sala entra junto: trocar de sala manda a pessoa para a
-- porta errada do mesmo jeito.

alter table message_templates
  drop constraint if exists message_templates_type_check;

alter table message_templates
  add constraint message_templates_type_check
  check (type = any (array[
    'entrada', 'saida', 'agendamento', 'lembrete', 'cancelamento', 'atualizacao'
  ]));

-- ------------------------------------------
-- O texto
-- ------------------------------------------
-- A mensagem compara antes e depois: dizer só como ficou obrigaria quem
-- recebe a lembrar como era para notar a diferença. As variáveis de
-- mudança ({{mudou_data}}, {{mudou_horario}}, {{mudou_sala}}) chegam
-- vazias quando aquele campo não mudou, então cada linha só aparece se
-- houver o que contar — o mesmo recurso que o {{cafe}} usa no convite.
insert into message_templates (type, category, subject, message, is_default)
select 'atualizacao', null, 'Reunião Alterada',
  -- Sem \n antes de {{mudou_data}}: cada variável de mudança já abre com a
  -- própria quebra, então a linha em branco viria em dobro.
  E'Olá *{{nome_colaborador}}*! 🔄\n\nA reunião *{{titulo}}* foi alterada:{{mudou_data}}{{mudou_horario}}{{mudou_sala}}\n\nComo ficou:\n\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}{{cafe}}\n\n_Mensagem automática da Portaria Inteligente._',
  true
where not exists (
  select 1 from message_templates where type = 'atualizacao' and category is null
);
