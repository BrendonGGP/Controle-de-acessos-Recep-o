/**
 * Vocabulario de movimento — o mesmo do GGPost (lib/movimento.ts de la), para
 * a recepcao se mover como o resto da suite.
 *
 * Molas em vez de duracao fixa: o movimento acompanha a distancia percorrida.
 * `semMovimento` vale quando o sistema pede Reduce Motion — a mudanca ainda
 * acontece, so que sem percurso.
 */
export const MOLA_PADRAO = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 } as const
export const SUAVE = { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] } as const
/** Lente de selecao (lateral, segmentados): passa um pouco do ponto e volta. */
export const MOLA_LENTE = { type: 'spring', stiffness: 420, damping: 26, mass: 0.8 } as const
export const semMovimento = { duration: 0 } as const

/** Entrada/saida de sobreposicao (modal, menu). */
export const SOBREPOSICAO = {
  initial: { opacity: 0, scale: 0.96, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 4 },
}
