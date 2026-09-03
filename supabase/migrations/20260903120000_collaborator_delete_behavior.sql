-- ==========================================
-- EXCLUSÃO DE COLABORADOR: preservar histórico
-- ==========================================
-- `access_logs.notified_collaborator_id` referenciava `collaborators` sem
-- regra de exclusão. Na prática, excluir um colaborador que já foi notificado
-- alguma vez falhava com erro 23503:
--
--   "Key is still referenced from table access_logs"
--
-- Apagar os registros junto (cascade) não é opção: `access_logs` é o
-- histórico de entradas e saídas da portaria e não pode perder linhas.
--
-- Com SET NULL o registro de acesso permanece — visitante, data, categoria e
-- ação continuam intactos — e apenas o vínculo com o colaborador removido
-- fica nulo. A coluna já aceita nulo (nem toda visita notifica alguém).

alter table access_logs
  drop constraint access_logs_notified_collaborator_id_fkey;

alter table access_logs
  add constraint access_logs_notified_collaborator_id_fkey
  foreign key (notified_collaborator_id)
  references collaborators(id)
  on delete set null;

-- Nota sobre booking_participants: aquela FK já usa ON DELETE CASCADE, o que
-- é o correto — a linha ali só liga uma reserva a um participante, e sem o
-- colaborador ela não tem significado. A reserva em si é preservada.
