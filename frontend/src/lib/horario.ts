/** "09:30" ou "09:30:00" -> minutos desde a meia-noite. */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

/** Minutos desde a meia-noite -> "09:30". */
export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Data de hoje (AAAA-MM-DD) no fuso do aparelho. `toISOString()` daria a data
 * em UTC — depois das 21h em Brasilia ja seria amanha.
 */
export function hojeLocal(agora = new Date()): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

/** 105 -> "1h45", 60 -> "1 hora", 30 -> "30 min". */
export function formatarDuracao(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return h === 1 ? '1 hora' : `${h} horas`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** Sobretitulo das telas: "quarta-feira, 14 de outubro". */
export function dataPorExtenso(agora = new Date()): string {
  return agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
