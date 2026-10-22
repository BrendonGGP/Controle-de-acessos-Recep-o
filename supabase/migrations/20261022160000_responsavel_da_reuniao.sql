-- ==========================================
-- RESPONSÁVEL PELA REUNIÃO
-- ==========================================
-- A reserva guarda `created_by`, mas isso aponta para a conta que digitou —
-- quase sempre a própria recepcionista. Quem pediu a sala entra na lista de
-- participantes, misturado aos demais, sem distinção.
--
-- A tela já chamava o primeiro participante de "responsável", mas era só o
-- primeiro da lista: bastava a ordem mudar para o rótulo apontar para outra
-- pessoa. Agora o papel é explícito.

alter table room_bookings
  add column if not exists responsavel_id uuid references collaborators(id) on delete set null;

comment on column room_bookings.responsavel_id is
  'Colaborador que pediu a sala. Recebe os avisos com destaque; nulo quando não informado.';

-- Quem recebe aviso é buscado por reserva, e a coluna costuma estar
-- preenchida — índice simples resolve a junção.
create index if not exists idx_bookings_responsavel
  on room_bookings (responsavel_id)
  where responsavel_id is not null;

-- ------------------------------------------
-- Reservas que já existem
-- ------------------------------------------
-- Sem isto, toda reunião já marcada ficaria sem responsável e perderia o
-- destaque no aviso. O primeiro participante é a melhor aproximação
-- disponível: é exatamente quem a tela vinha exibindo como responsável.
update room_bookings b
set responsavel_id = (
  select bp.collaborator_id
  from booking_participants bp
  where bp.booking_id = b.id
  limit 1
)
where b.responsavel_id is null
  and exists (select 1 from booking_participants bp where bp.booking_id = b.id);

-- ------------------------------------------
-- Template de cancelamento para o responsável
-- ------------------------------------------
-- O participante recebe "a reunião foi cancelada"; quem pediu a sala recebe
-- uma versão que reconhece o papel dele e diz que a sala foi liberada.
insert into message_templates (type, category, subject, message, is_default)
select 'cancelamento', 'responsavel', 'Reunião Cancelada (responsável)',
  E'Olá *{{nome_colaborador}}*! ❌\n\nA reunião que você agendou foi *cancelada* e a sala está livre novamente:\n\n*Assunto:* {{titulo}}\n*Sala:* {{sala}}\n*Data:* {{data}}\n*Horário:* {{horario}}\n\n_Mensagem automática da Portaria Inteligente._',
  true
where not exists (
  select 1 from message_templates
  where type = 'cancelamento' and category = 'responsavel'
);
