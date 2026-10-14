/**
 * GSAP da recepcao — so a coreografia de abertura da casca.
 *
 * Divisao de trabalho com a Motion (`lib/movimento.ts`), igual ao GGPost: a
 * Motion cuida do que e ESTADO (lente que desliza, modal que abre); o GSAP, da
 * abertura do app. As duas nunca animam o mesmo elemento.
 *
 * Toda animacao daqui termina com `clearProps`: `transform` deixado no elemento
 * cria bloco de contencao e o `position: fixed` dos modais la dentro passaria a
 * se posicionar pelo cartao, e nao pela viewport.
 */
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export const CURVA = {
  saida: 'expo.out',
  mola: 'back.out(1.6)',
} as const

/** Media query que o GSAP usa para decidir entre coreografia e corte seco. */
export const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)'

export { gsap, useGSAP }
