# Integrações (WhatsApp e Supabase) 🔌

O sistema utiliza a plataforma **Z-API** para envio de mensagens via WhatsApp. Toda a camada de segurança que conecta o Banco de Dados com a API de WhatsApp vive no Supabase (Edge Functions).

## Edge Functions
Edge Functions são pedaços de código TypeScript hospedados na infraestrutura do Supabase que rodam no lado do servidor. O frontend nunca fala direto com o WhatsApp por questões de segurança (se a chave da Z-API vazar, qualquer pessoa enviaria mensagens no nome do GGP).

Existem duas functions principais:
1. `notify-access`: Disparada ao fazer um Check-in na recepção.
2. `notify-booking`: Disparada ao criar uma Nova Reunião.

## Secrets da Integração
As credenciais ficam salvas de forma invisível nas Variáveis de Ambiente Secretas do Supabase. O código das Edge Functions faz a leitura delas na hora H:
- `WHATSAPP_API_URL`: A URL da instância na Z-API (Ex: `https://api.z-api.io/instances/xxx/token/xxx`)
- *(No caso do GGP, a autenticação via Client-Token foi dispensada na configuração da Z-API pois o token já faz parte da URL).*

## Fluxo da Mensagem
1. O usuário clica em "Salvar" no frontend.
2. O Supabase insere os dados no banco PostgreSQL.
3. O Supabase invoca a Edge Function (Ex: `notify-booking`).
4. A Function lê os telefones no banco e busca o texto da tabela `message_templates`.
5. Ela faz um POST HTTP para a URL da Z-API.
6. O celular do colaborador GGP recebe a mensagem no WhatsApp quase que instantaneamente.
