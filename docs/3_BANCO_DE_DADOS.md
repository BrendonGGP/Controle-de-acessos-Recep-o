# Banco de Dados (Supabase PostgreSQL) 🗄️

O banco de dados é gerido via Supabase. Abaixo está a descrição das tabelas principais e regras de negócio no banco (Trigger e RLS).

## Modelagem de Dados

### Tabelas Principais

- `system_users`: Tabela complementar ao `auth.users` do Supabase. Armazena o `role` (`admin` ou `recepcao`) e nome. O RLS valida o `role` dessa tabela.
- `collaborators`: Todos os funcionários da empresa que podem receber visitas ou participar de reuniões. Guarda Nome, E-mail, Telefone e CPF.
- `rooms`: Cadastro de salas físicas.
- `room_bookings`: A reserva propriamente dita. Guarda `start_time`, `end_time` (gerado automaticamente pela duração), `title`, `service` (com/sem café) e um ID atrelado à `rooms`.
- `booking_participants`: Tabela ponte N:N que liga uma reserva (`room_bookings`) a vários colaboradores (`collaborators`). Usada para notificar todos os convidados.
- `access_logs`: Registra as catracas/visitas da recepção. Guarda Nome do Visitante, Documento, Ação (Entrada/Saída), Categoria (Ex: Entregas, Entrevistas) e o ID do colaborador procurado.
- `message_templates`: Templates de WhatsApp editáveis pelo painel.

## Row Level Security (RLS)
Por segurança, a API REST do Supabase bloqueia inserções não autorizadas.
- O Frontend sempre faz as requisições autenticado.
- Tabelas como `system_users` só podem ser lidas e editadas se o JWT do usuário comprovar que ele é `role = admin`.
- Tabelas como `rooms` ou `access_logs` são abertas para leitura/escrita de todos que tenham um login válido (`authenticated`).

## Edge Functions & Triggers
O banco do Supabase se comunica com o mundo exterior.
O envio de notificações ocorre da seguinte forma:
O Frontend insere um dado na tabela `access_logs` via API. Ao identificar a intenção de notificar, o próprio Frontend aciona a Edge Function (`notify-access`) em Deno, que lê os dados e envia o POST para o Z-API.
