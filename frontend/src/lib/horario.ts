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

/** Data (AAAA-MM-DD) daqui a N dias, no fuso do aparelho. */
export function emDias(dias: number, agora = new Date()): string {
  const d = new Date(agora)
  d.setDate(d.getDate() + dias)
  return hojeLocal(d)
}

/**
 * Rotulo do grupo de um dia numa lista de datas: "Hoje", "Amanha" ou
 * "quinta-feira, 23 de outubro".
 *
 * Recebe a data como "AAAA-MM-DD" e monta o Date pelos numeros, e nao por
 * `new Date(iso)`: a string pura e lida como UTC e, no Brasil, cairia no dia
 * anterior.
 */
export function rotuloDoDia(iso: string, agora = new Date()): string {
  if (iso === hojeLocal(agora)) return 'Hoje'
  if (iso === emDias(1, agora)) return 'Amanhã'

  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
