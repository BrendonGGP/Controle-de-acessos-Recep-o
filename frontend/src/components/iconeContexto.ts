import { createContext } from 'react'

// Fora de icones.tsx porque a atualizacao ao vivo do Vite (fast refresh) so
// funciona em arquivo que exporta apenas componentes.

export type PesoIcone = 'regular' | 'bold' | 'fill'

/** Tamanho e peso padrao dos icones de icones.tsx (o menu usa para marcar o ativo). */
export const IconContext = createContext<{ size?: number; weight?: PesoIcone }>({})
