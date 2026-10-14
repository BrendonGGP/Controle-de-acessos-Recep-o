# Design — Recepção GGPost

A recepção é um produto da suite **GGPost** e veste a mesma identidade. A fonte
da verdade é o repositório do GGPost:

- `docs/produto/design.md` — a linguagem "Vidro" (tese, materiais, geometria,
  tipografia, casca, movimento, guardrails);
- `docs/marca/brand-spec.md` — logotipo e cores da marca;
- `frontend/src/index.css` — os tokens. O `src/index.css` daqui é uma cópia;
  ao mudar um token, mude lá primeiro.

Antes de desenhar uma tela nova, leia o `design.md` de lá. Este arquivo só
registra o que a recepção adapta.

## O que vem igual do GGPost

- Tokens de cor, raios, sombras, curvas, claro e escuro (`.dark` no `<html>`,
  escolha salva em `ggpost:tema`, troca em círculo a partir do botão).
- Casca: ilha de vidro na lateral com a **lente** que viaja com mola entre os
  itens, crachá no pé, cápsulas de vidro no topo, conteúdo em **folhas** brancas
  sobre a grade de pontos; no celular, topo de vidro e barra inferior flutuante
  com lente. O "P" do logotipo digita na abertura e a cada troca de seção.
- Título grande da tela (`CabecalhoPagina`): sobretítulo, 34/40, frase de
  abertura, ações à direita.
- Componentes: `Button` (pílula), `Segmentado`, `Select`, `CampoData`,
  `Checkbox`, `Modal`, `ConfirmDialog`, toasts, estados (skeleton, vazio, erro).
  Nenhum controle nativo do navegador, nenhum `alert()`/`confirm()`.
- Ícones Hugeicons stroke rounded, sempre via `components/icones.tsx`.
- Tela de entrada irmã da do GGPost (`components/entrada/`): pontos que reagem
  ao ponteiro, logotipo digitando, título em Jost com a barra do P sublinhando.

## O que a recepção adapta

- **Marca:** logotipo GGPost + filete + "Recepção" (`MarcaRecepcao`). A marca é
  uma só; o produto é um rótulo em Inter.
- **Barra do topo:** no lugar da busca e do sino, um relógio (hora e dia). Na
  recepção a hora é informação de trabalho.
- **Cartão da sala:** status em texto ("Ocupada até 12:15"), a reunião em
  andamento com o quanto já passou, e a **régua do dia** (7h às 21h) com a linha
  do agora, o mesmo desenho da agenda do "Meu dia" do GGPost.
- **Entrada:** no lugar da colagem de pedaços do feed, a lista do que a
  recepção faz. Sem o Nino: ele é o assistente do GGPost, e aqui não existe.
- **Contraste:** `--color-placeholder-controle` (só aqui) para o "nada
  escolhido" de Select e campo de data, que é texto de botão e precisa passar
  em AA sobre o preenchimento cinza.

## Pendência da suite

No escuro, texto branco sobre o petróleo (`--color-primary`
`oklch(0.6 0.09 227.3)`) dá 3,8:1, abaixo do AA para texto de 14px. O valor é
do GGPost e foi mantido aqui para as duas telas não divergirem; a correção deve
nascer lá.
