import { useEffect, useState } from 'react'

/**
 * Hora atual com resolucao de minuto. Acorda na virada de cada minuto (e nao a
 * cada segundo): o relogio da barra e o status das salas mudam juntos, e a aba
 * parada nao gasta nada entre uma virada e outra.
 */
export function useAgora(): Date {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    let t = 0
    const agendar = () => {
      const falta = 60_000 - (Date.now() % 60_000)
      t = window.setTimeout(() => { setAgora(new Date()); agendar() }, falta + 50)
    }
    agendar()
    return () => clearTimeout(t)
  }, [])
  return agora
}
