// Icones da recepcao — Hugeicons, estilo "stroke rounded", a mesma familia do
// GGPost (components/icones.tsx de la).
//
// Ponto unico de onde TODA tela importa icone: o nome que a tela escreve
// (`Trash2`, `Pencil`) e o mesmo do GGPost, entao um componente copiado de la
// funciona aqui sem trocar import.
//
// O `weight` vira espessura de traco: `regular` e o padrao, `bold`/`fill`
// engrossam — e assim que se marca o item ativo do menu.
import { useContext, type SVGProps } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Calendar03Icon,
  Call02Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Coffee02Icon,
  Delete02Icon,
  DoorIcon,
  IdIcon,
  InformationCircleIcon,
  Login03Icon,
  Logout01Icon,
  Mail01Icon,
  Message01Icon,
  Moon02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  RefreshIcon,
  Search01Icon,
  SlidersHorizontalIcon,
  Sun03Icon,
  Tick02Icon,
  UserAdd01Icon,
  UserGroupIcon,
  ViewIcon,
  ViewOffIcon,
  WhatsappIcon,
} from '@hugeicons/core-free-icons'

import { IconContext, type PesoIcone } from './iconeContexto'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'color' | 'strokeWidth'> {
  size?: number | string
  weight?: PesoIcone
  color?: string
}

const TRACO: Record<PesoIcone, number> = { regular: 1.5, bold: 2.1, fill: 2.1 }

function icone(svg: IconSvgElement, nome: string) {
  function Icone({ size, weight, color, ...resto }: IconProps) {
    const padrao = useContext(IconContext)
    return (
      <HugeiconsIcon
        icon={svg}
        size={size ?? padrao.size ?? 20}
        strokeWidth={TRACO[weight ?? padrao.weight ?? 'regular']}
        color={color ?? 'currentColor'}
        aria-hidden="true"
        {...resto}
      />
    )
  }
  Icone.displayName = nome
  return Icone
}

// ── Navegacao ──
export const CalendarDays = icone(Calendar03Icon, 'CalendarDays')
export const DoorOpen = icone(DoorIcon, 'DoorOpen')
export const Users = icone(UserGroupIcon, 'Users')
export const MessageSquare = icone(Message01Icon, 'MessageSquare')
export const SlidersHorizontal = icone(SlidersHorizontalIcon, 'SlidersHorizontal')
export const LogOut = icone(Logout01Icon, 'LogOut')
export const LogIn = icone(Login03Icon, 'LogIn')
export const Sun = icone(Sun03Icon, 'Sun')
export const Moon = icone(Moon02Icon, 'Moon')

// ── Setas (no Hugeicons, ArrowX01 e o chevron) ──
export const ChevronDown = icone(ArrowDown01Icon, 'ChevronDown')
export const ChevronLeft = icone(ArrowLeft01Icon, 'ChevronLeft')
export const ChevronRight = icone(ArrowRight01Icon, 'ChevronRight')

// ── Acoes ──
export const Plus = icone(PlusSignIcon, 'Plus')
export const Check = icone(Tick02Icon, 'Check')
export const X = icone(Cancel01Icon, 'X')
export const Trash2 = icone(Delete02Icon, 'Trash2')
export const Pencil = icone(PencilEdit02Icon, 'Pencil')
export const RefreshCw = icone(RefreshIcon, 'RefreshCw')
export const Search = icone(Search01Icon, 'Search')
export const Eye = icone(ViewIcon, 'Eye')
export const EyeOff = icone(ViewOffIcon, 'EyeOff')
export const UserPlus = icone(UserAdd01Icon, 'UserPlus')

// ── Estado e aviso ──
export const AlertTriangle = icone(Alert02Icon, 'AlertTriangle')
export const AlertCircle = icone(AlertCircleIcon, 'AlertCircle')
export const CheckCircle = icone(CheckmarkCircle02Icon, 'CheckCircle')
export const XCircle = icone(CancelCircleIcon, 'XCircle')
export const Info = icone(InformationCircleIcon, 'Info')

// ── Agenda, contato e copa ──
export const Calendar = icone(Calendar01Icon, 'Calendar')
export const Clock = icone(Clock01Icon, 'Clock')
export const Coffee = icone(Coffee02Icon, 'Coffee')
export const Phone = icone(Call02Icon, 'Phone')
export const Mail = icone(Mail01Icon, 'Mail')
export const IdentificationBadge = icone(IdIcon, 'IdentificationBadge')
export const Whatsapp = icone(WhatsappIcon, 'Whatsapp')
