# O que muda

<!-- Descreva a mudanca em uma ou duas frases. -->

## Por que

<!-- Qual problema isso resolve? Se houver issue, referencie: Closes #123 -->

## Como testar

<!-- Passos para validar. Ex:
1. npm run dev na pasta frontend
2. Entrar em Salas e criar uma reserva
3. Conferir que o participante recebe a notificacao
-->

## Checklist

- [ ] `npm run build` passa localmente
- [ ] `npm run lint` sem novos avisos
- [ ] Mudou o schema? A migration roda do zero (`supabase db reset`)
- [ ] Mudou Edge Function? Testada contra o projeto real
- [ ] Nenhuma credencial, token ou senha no diff

## Impacto no banco

- [ ] Nao mexe no banco
- [ ] Migration aditiva (sem risco para dados existentes)
- [ ] **Migration destrutiva** — descreva o plano de rollback abaixo

<!-- Se destrutiva, explique o que acontece com os dados existentes. -->
