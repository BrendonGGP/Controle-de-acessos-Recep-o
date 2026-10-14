import { useEffect } from 'react'

/** Titulo da aba no padrao da suite: "GGPost Recepção · <contexto>", com ponto medio. */
export function useTitulo(contexto: string) {
  useEffect(() => {
    document.title = `GGPost Recepção · ${contexto}`
  }, [contexto])
}
