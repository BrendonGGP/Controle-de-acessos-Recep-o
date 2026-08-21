import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

export function formatPhone(value: string) {
  let v = value.replace(/\D/g, '')
  
  if (v.startsWith('55') && v.length > 11) {
    v = v.substring(0, 13)
    if (v.length <= 4) return `+55 (${v.substring(2)}`
    if (v.length <= 8) return `+55 (${v.substring(2,4)}) ${v.substring(4)}`
    return `+55 (${v.substring(2,4)}) ${v.substring(4,9)}-${v.substring(9)}`
  } 
  
  v = v.substring(0, 11)
  if (v.length === 0) return ''
  if (v.length <= 2) return `(${v}`
  if (v.length <= 6) return `(${v.substring(0,2)}) ${v.substring(2)}`
  if (v.length === 10) return `(${v.substring(0,2)}) ${v.substring(2,6)}-${v.substring(6)}`
  return `(${v.substring(0,2)}) ${v.substring(2,7)}-${v.substring(7)}`
}

export function formatName(value: string) {
  // Converte "joão da silva" para "João da Silva" ignorando preposições se quiser, mas para simplificar:
  return value.split(' ').map(word => {
    if (word.length > 2) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    return word.toLowerCase()
  }).join(' ')
}
