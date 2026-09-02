-- ==========================================
-- BOOTSTRAP DO PRIMEIRO ADMIN
-- ==========================================
-- Uso ÚNICO, logo após recriar o banco.
--
-- Contexto: a tela de Admin cria usuários pela Edge Function `manage-users`,
-- que exige que quem chama JÁ seja admin. Como a tabela nasce vazia, é preciso
-- criar o primeiro admin manualmente — este script faz isso.
--
-- COMO USAR
-- 1. No Dashboard do Supabase: Authentication > Users > "Add user"
--    - Email: o e-mail do admin (precisa ser @grupogomespires.com.br,
--      exigência do trigger trg_check_email_domain)
--    - Marque "Auto Confirm User"
-- 2. Rode este script no SQL Editor, trocando o e-mail e o nome abaixo.
-- 3. Faça login no sistema. A partir daí, crie os demais usuários pela
--    tela de Admin normalmente.

insert into system_users (id, name, email, role)
select
  u.id,
  'Nome do Administrador',          -- <<< TROQUE pelo nome real
  u.email,
  'admin'
from auth.users u
where u.email = 'admin@grupogomespires.com.br'  -- <<< TROQUE pelo e-mail criado no passo 1
on conflict (id) do update
  set role = 'admin',
      name = excluded.name;

-- Confirmação: deve retornar 1 linha com role = admin
select id, name, email, role from system_users where role = 'admin';
