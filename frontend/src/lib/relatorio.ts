/**
 * Relatório de controle de acesso em PDF.
 *
 * Usa a impressão do navegador em vez de uma biblioteca: jsPDF somaria uns
 * 400 KB a um bundle que já passa de 800 e carrega aviso de tamanho. A
 * janela de impressão também deixa a recepção escolher entre salvar o PDF
 * e mandar direto para a impressora, que é o que ela costuma querer.
 */

export type LinhaRelatorio = {
  data_hora: string
  acao: string
  categoria: string
  visitante: string
  documento: string | null
  telefone: string | null
  observacoes: string | null
  avisou: string | null
  saida: string | null
}

const NOMES_CATEGORIA: Record<string, string> = {
  visitas_reunioes: 'Visita ou reunião',
  atendimento: 'Atendimento',
  prestadores_servico: 'Prestador de serviço',
  entregas_mercadoria: 'Entrega de mercadoria',
  entregas_alimento: 'Entrega de alimento',
  entrevista_rh: 'Entrevista RH',
  stands: 'Stand',
  treinamentos_onboarding: 'Treinamento',
}

const rotuloCategoria = (c: string) =>
  NOMES_CATEGORIA[c] ?? c.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')

/**
 * Data (AAAA-MM-DD) como DD/MM/AAAA. Monta a partir dos números em vez de
 * `new Date(iso)`: essa forma é lida como UTC e, no Brasil, cairia no dia
 * anterior — o relatório sairia com o período trocado.
 */
function dataCurta(iso: string) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Dia e hora de um timestamp, no fuso de quem está lendo. */
function dataHora(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function soHora(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** `&`, `<` e `>` viram entidade: nome com "&" não pode quebrar a tabela. */
function escapar(v: string | null) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function telefoneLegivel(t: string | null) {
  if (!t) return ''
  const d = t.replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return t
}

/**
 * Monta a página e abre a impressão. O HTML é escrito numa janela nova em
 * vez de um iframe oculto para a recepção ver o que vai sair antes de
 * confirmar — e poder fechar sem imprimir, se o período estiver errado.
 */
export function exportarRelatorioPDF(
  linhas: LinhaRelatorio[],
  periodo: { inicio: string; fim: string; categoria: string | null },
) {
  const janela = window.open('', '_blank')
  if (!janela) {
    throw new Error('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.')
  }

  const entradas = linhas.filter(l => l.acao === 'entrada').length
  const saidas = linhas.filter(l => l.acao === 'saida').length

  const corpo = linhas.map(l => `
    <tr>
      <td class="nowrap">${dataHora(l.data_hora)}</td>
      <td>${l.acao === 'entrada' ? 'Entrada' : 'Saída'}</td>
      <td>${escapar(rotuloCategoria(l.categoria))}</td>
      <td>${escapar(l.visitante.trim())}</td>
      <td class="nowrap">${escapar(l.documento)}</td>
      <td class="nowrap">${escapar(telefoneLegivel(l.telefone))}</td>
      <td>${escapar(l.avisou)}</td>
      <td class="nowrap">${soHora(l.saida)}</td>
      <td class="obs">${escapar(l.observacoes)}</td>
    </tr>`).join('')

  const filtro = periodo.categoria ? ` · ${rotuloCategoria(periodo.categoria)}` : ''
  const titulo = `Controle de Acesso — ${dataCurta(periodo.inicio)} a ${dataCurta(periodo.fim)}`

  janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>
  /* Paisagem: nove colunas não cabem em retrato sem espremer o nome. */
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a; margin: 0; font-size: 10px;
  }
  header { border-bottom: 2px solid #37809d; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 15px; margin: 0 0 3px; letter-spacing: -.01em; }
  .sub { font-size: 10px; color: #555; }
  .resumo { margin: 10px 0 14px; font-size: 10px; color: #333; }
  .resumo strong { color: #37809d; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #f0f4f6; text-align: left; padding: 6px 7px;
    font-size: 9px; text-transform: uppercase; letter-spacing: .04em;
    color: #37809d; border-bottom: 1px solid #cfdde3;
  }
  td { padding: 5px 7px; border-bottom: 1px solid #eee; vertical-align: top; }
  /* Repete o cabeçalho a cada página e nunca parte uma linha ao meio. */
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .nowrap { white-space: nowrap; }
  .obs { color: #555; max-width: 180px; }
  .vazio { padding: 24px; text-align: center; color: #777; }
  footer { margin-top: 14px; font-size: 9px; color: #888; }
  @media print { .aviso { display: none; } }
  .aviso {
    background: #fff8e6; border: 1px solid #f0d9a0; padding: 10px 12px;
    border-radius: 8px; margin-bottom: 14px; font-size: 11px; color: #6b5420;
  }
</style>
</head>
<body>
  <div class="aviso">
    Confira o período abaixo e use <strong>Imprimir → Salvar como PDF</strong>.
    Este aviso não sai no arquivo final.
  </div>
  <header>
    <h1>Controle de Acesso — Grupo Gomes Pires</h1>
    <div class="sub">
      ${dataCurta(periodo.inicio)} a ${dataCurta(periodo.fim)}${escapar(filtro)}
    </div>
  </header>
  <div class="resumo">
    <strong>${linhas.length}</strong> ${linhas.length === 1 ? 'registro' : 'registros'}
    &nbsp;·&nbsp; ${entradas} ${entradas === 1 ? 'entrada' : 'entradas'}
    &nbsp;·&nbsp; ${saidas} ${saidas === 1 ? 'saída' : 'saídas'}
  </div>
  ${linhas.length === 0 ? '<p class="vazio">Nenhum acesso registrado neste período.</p>' : `
  <table>
    <thead>
      <tr>
        <th>Data e hora</th><th>Ação</th><th>Categoria</th><th>Visitante</th>
        <th>Documento</th><th>Telefone</th><th>Avisou</th><th>Saída</th><th>Observações</th>
      </tr>
    </thead>
    <tbody>${corpo}</tbody>
  </table>`}
  <footer>Emitido em ${dataHora(new Date().toISOString())} pela Portaria Inteligente.</footer>
</body>
</html>`)

  janela.document.close()
  // Espera o layout antes de abrir a impressão: sem isso o Chrome às vezes
  // mede a página pela metade e corta a última linha.
  janela.onload = () => janela.print()
}
