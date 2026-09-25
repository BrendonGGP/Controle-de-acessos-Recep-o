# Workflows do n8n

Cópia versionada dos workflows que orquestram as notificações de WhatsApp.
Servem como backup e histórico — a versão em execução é a que está no n8n.

## Os três workflows

| Arquivo | Gatilho | O que faz |
|---|---|---|
| `notificar-agendamento.json` | webhook `POST /webhook/recepcao/booking` | busca a reserva e os participantes, monta a mensagem pelo template `agendamento` e envia a cada um |
| `notificar-acesso.json` | webhook `POST /webhook/recepcao/access` | busca o colaborador, escolhe o template por categoria (com fallback para o genérico) e envia |
| `lembrete-reuniao.json` | agendado, a cada 5 min | procura reuniões que começam nos próximos 10 min com `reminder_sent = false`, avisa os participantes e marca como enviado |

## Arquitetura

```
Frontend ──> Edge Function ──> webhook n8n ──> Supabase (busca dados)
                                         └──> Evolution API ──> WhatsApp
```

A Edge Function apenas valida e repassa o evento. Toda a lógica de
montagem da mensagem vive no n8n, o que permite ajustar textos e regras
sem deploy de código.

## Segredos

Os arquivos aqui têm os valores substituídos por placeholders:

| Placeholder | O que é |
|---|---|
| `__WEBHOOK_TOKEN__` | token que o n8n valida no header `x-webhook-token`; o mesmo valor está no secret `N8N_WEBHOOK_TOKEN` do Supabase |
| `__SUPABASE_SERVICE_PASSWORD__` | senha do usuário de serviço `n8n.notificacoes@grupogomespires.com.br` |
| `__EVOLUTION_API_KEY__` | `AUTHENTICATION_API_KEY` da Evolution API |

Ao importar um destes arquivos no n8n, substitua os placeholders pelos
valores reais antes de ativar.

## Acesso ao banco

O n8n entra no Supabase como um usuário de serviço comum (e-mail e senha),
não com a `service_role`. As permissões estão nas políticas RLS da
migration `20260925150000_n8n_service_user.sql`:

- **lê**: `room_bookings`, `booking_participants`, `collaborators`,
  `rooms`, `access_logs`, `message_templates`
- **escreve**: apenas `room_bookings.reminder_sent`
- **não acessa**: `system_users`, `audit_log`

Para revogar o acesso do n8n, basta trocar o papel desse usuário em
`system_users` — nenhuma chave precisa ser rotacionada.

## Trocar o número de WhatsApp

O número fica na instância da Evolution API, não no código nem aqui.
Para trocar (por exemplo, do número de testes para o oficial):

1. Evolution Manager → instância → desconectar
2. Conectar novamente lendo o QR Code com o novo aparelho

Se preferir uma instância nova com outro nome, atualize o campo `url` dos
nós "Enviar WhatsApp" nos três workflows — é o único lugar onde o nome
aparece.

## Janela dos lembretes

O workflow roda a cada 5 minutos e procura reuniões que começam **de agora
até 10 minutos à frente**.

A janela começa em zero de propósito. Uma versão anterior usava "de 5 a 10
minutos", e uma reunião a 3 minutos de distância caía fora da faixa e nunca
era avisada. Como `reminder_sent` impede o envio duplicado, ampliar a
janela é seguro.

Na prática o aviso sai entre 5 e 10 minutos antes da reunião.
