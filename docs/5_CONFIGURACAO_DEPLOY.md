# Configuração de Deploy e CI/CD 🚀

Guia das configurações manuais necessárias para o pipeline funcionar
por completo. Só precisa ser feito uma vez.

Ordem recomendada: **Parte 1 → Parte 2 → Parte 3**. A Parte 4 (Evolution
API) é independente e pode ficar para depois.

---

## Parte 1 — Secrets do GitHub Actions

Sem isso, o workflow `Deploy Supabase` falha ao tentar publicar
migrations e Edge Functions.

### 1.1 Gerar um novo access token do Supabase

O token usado durante a configuração inicial deve ser revogado (ele
esteve num arquivo temporário local). Gere um novo, exclusivo para o CI:

1. Acesse https://supabase.com/dashboard/account/tokens
2. **Generate new token**
3. Nome: `github-actions-ci`
4. Copie o valor (começa com `sbp_`, **só aparece uma vez**)

Aproveite e **revogue o token antigo** (`claude-code-cli`) nessa mesma tela.

### 1.2 Cadastrar os três secrets

Vá em **Settings → Secrets and variables → Actions → New repository secret**
e crie um por vez:

| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | o token `sbp_...` do passo anterior |
| `SUPABASE_PROJECT_REF` | `afsjoaizrzmbbzquajbe` |
| `SUPABASE_DB_PASSWORD` | a senha do banco definida ao criar o projeto |

> Esqueceu a senha do banco? Dashboard → Settings → Database →
> **Reset database password**. Se resetar, atualize o secret aqui também.

Link direto:
https://github.com/BrendonGGP/Controle-de-acessos-Recep-o/settings/secrets/actions

### 1.3 Conferir

Depois de cadastrar, rode o workflow manualmente para validar:

**Actions → Deploy Supabase → Run workflow → Run workflow**

Se os três secrets estiverem certos, ele passa pelo `supabase link` e
pelo dry-run sem erro.

---

## Parte 2 — Variáveis de ambiente da Vercel

As variáveis atuais apontam para o projeto Supabase **deletado**, então
o site em produção está quebrado até isso ser corrigido.

### 2.1 Atualizar as duas variáveis

1. Acesse o projeto na Vercel → **Settings → Environment Variables**
2. Edite (ou crie) as duas abaixo, marcando os três ambientes —
   **Production**, **Preview** e **Development**:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://afsjoaizrzmbbzquajbe.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_dmxqufD4FuZgESEXKBrbaA_Utuza9J3` |

> A chave `anon`/publishable é pública por natureza — ela vai embutida no
> JavaScript do navegador. Quem protege os dados é o RLS, não essa chave.
> **Nunca** use aqui a `service_role` / `sb_secret_`, que ignora o RLS.

### 2.2 Confirmar as configurações de build

Ainda em **Settings**, verifique:

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

O `frontend/vercel.json` já cuida do roteamento SPA (todas as rotas caem
no `index.html`), então não é preciso configurar rewrites na interface.

### 2.3 Redeploy

Variáveis de ambiente **não** se aplicam a deploys já feitos:

**Deployments → o mais recente → ⋯ → Redeploy**

Desmarque "Use existing Build Cache" para garantir um build limpo.

### 2.4 Conferir

Abra a URL de produção e faça login. Se a tela de login aparecer e o
login funcionar, a conexão com o banco novo está correta.

---

## Parte 3 — Merge do PR #1

https://github.com/BrendonGGP/Controle-de-acessos-Recep-o/pull/1

Os 8 checks já estão verdes. Ao dar merge:

- as migrations e as Edge Functions vão para o `main`
- o workflow `Deploy Supabase` roda automaticamente (por isso a Parte 1
  vem antes)
- a Vercel publica em produção

Recomendo **Squash and merge**, para manter o histórico do `main` limpo.

Depois do merge, a branch `fix/db-restore-and-template-bugs` pode ser
apagada — o botão aparece na própria página do PR.

---

## Parte 4 — Evolution API (WhatsApp) — pendente

As notificações estão em **modo simulado**: reservas e registros de
acesso são salvos normalmente, mas nenhuma mensagem sai. As credenciais
antigas do Z-API se perderam junto com o projeto deletado.

Para ativar, é preciso primeiro subir a Evolution API numa VPS com
domínio público e HTTPS — as Edge Functions rodam na nuvem do Supabase e
não alcançam `localhost` nem IPs de rede interna.

Quando a instância estiver de pé, serão necessários três secrets no
Supabase:

| Secret | Exemplo |
|---|---|
| `EVOLUTION_API_URL` | `https://evolution.suaempresa.com.br` |
| `EVOLUTION_API_KEY` | a `AUTHENTICATION_API_KEY` da instalação |
| `EVOLUTION_INSTANCE` | `recepcao-ggp` |

A adaptação do código (as functions hoje falam o formato Z-API) está
pendente e é o próximo passo combinado.

---

## Referência rápida

| Recurso | Onde |
|---|---|
| Projeto Supabase | `afsjoaizrzmbbzquajbe` (GGP-Recepcao, sa-east-1) |
| Dashboard | https://supabase.com/dashboard/project/afsjoaizrzmbbzquajbe |
| Repositório | https://github.com/BrendonGGP/Controle-de-acessos-Recep-o |
| Admin do sistema | `brendon.nakagawa@grupogomespires.com.br` |

### Comandos úteis

```bash
# Desenvolvimento local
cd frontend && npm run dev

# Aplicar migrations manualmente
npx supabase db push

# Publicar Edge Functions manualmente
npx supabase functions deploy

# Ver logs de uma function
npx supabase functions logs notify-booking
```

### Criar um novo administrador

Usuários comuns são criados pela tela de **Admin** do sistema. Para
recriar o **primeiro** admin (banco zerado), use
`supabase/bootstrap_admin.sql` — ele explica o processo passo a passo.
