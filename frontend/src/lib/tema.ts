// Tema claro/escuro. A escolha mora no aparelho (localStorage), nao na conta:
// o mesmo usuario pode querer escuro no celular e claro no escritorio. Sem
// escolha salva, segue o sistema operacional, inclusive quando ele troca
// sozinho ao anoitecer.
//
// A classe `.dark` no <html> e a unica chave: index.css redefine os tokens
// sob ela. O script inline do index.html aplica a mesma regra antes da
// primeira pintura, para a pagina nao piscar clara ao abrir no escuro;
// mantenha os dois em sincronia (chave e criterio).

import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type Tema = 'claro' | 'escuro'

const CHAVE = 'ggpost:tema'
const DURACAO_MS = 400

const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)')
const ouvintes = new Set<() => void>()

function salvo(): Tema | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : null
  } catch {
    return null
  }
}

function aplicar(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'escuro')
  ouvintes.forEach((f) => f())
}

sistemaEscuro.addEventListener('change', (e) => {
  if (!salvo()) aplicar(e.matches ? 'escuro' : 'claro')
})

function temaAtual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'escuro' : 'claro'
}

export function useTema(): Tema {
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; },
    temaAtual,
  )
}

/**
 * Troca o tema e salva a escolha. Com `origem`, a pagina nova se abre num
 * circulo a partir do centro dela (o botao que a pessoa tocou), como uma
 * mancha de tinta; sem suporte a View Transitions ou com movimento reduzido,
 * a troca e imediata.
 */
export function alternarTema(origem?: HTMLElement | null) {
  const novo: Tema = temaAtual() === 'escuro' ? 'claro' : 'escuro'
  try { localStorage.setItem(CHAVE, novo); } catch { /* vale so nesta aba */ }

  const raiz = document.documentElement
  // `.trocando-tema` desliga as transicoes CSS (index.css). Sem isso, cada
  // `transition-colors` da pagina (centenas) anima a cor nova junto com o
  // circulo, e o navegador repinta a pagina inteira a cada quadro.
  raiz.classList.add('trocando-tema')
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!origem || semMovimento || !document.startViewTransition) {
    aplicar(novo)
    // Calcula o estilo com as transicoes ainda desligadas antes de religar.
    void getComputedStyle(raiz).color
    raiz.classList.remove('trocando-tema')
    return
  }

  const { left, top, width, height } = origem.getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  // Ate o canto mais distante da viewport, para o circulo cobrir tudo.
  const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  // flushSync: o icone do botao ja precisa estar trocado na foto "depois".
  const transicao = document.startViewTransition(() => flushSync(() => aplicar(novo)))
  transicao.ready.then(() => {
    raiz.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
      { duration: DURACAO_MS, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
    )
  }).catch(() => { /* transicao pulada: o tema ja foi aplicado */ })
  transicao.finished.finally(() => raiz.classList.remove('trocando-tema'))
}
