import { PATH_G, PATH_P, PATH_OST } from './marcaDesenho'

// Variavel, e nao hex: no modo escuro o grafite vira quase branco.
const GRAFITE = 'var(--marca-grafite)'
const PETROLEO = '#37809D'

/**
 * Logotipo GGPost — o mesmo desenho vetorial do app GGPost (Marca.tsx de la),
 * copiado do arquivo da marca. A recepcao e um produto da suite GGPost, entao
 * assina com o logotipo da suite e diz o proprio nome ao lado (`Produto`).
 *
 * Os tres pontos dentro do P sao o "digitando": pulam em sequencia quando um
 * ancestral tem a classe `.digitando` (abertura do app, lente da lateral em
 * viagem). Fora desses momentos o logotipo fica parado.
 */
export function Logotipo({ tamanho = 32, className = '' }: {
  /** Altura em px do desenho. */
  tamanho?: number
  className?: string
}) {
  const [largura, altura] = [496, 133]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`22 26 ${largura} ${altura}`}
      height={tamanho}
      width={Math.round((tamanho * largura) / altura)}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="GGPost"
    >
      <path d={PATH_G} fill={GRAFITE} />
      <path d={PATH_G} transform="translate(117 0)" fill={GRAFITE} />
      <path d={PATH_P} fill={PETROLEO} fillRule="evenodd" />
      <circle className="logo-ponto" cx="295" cy="72" r="4.8" fill={PETROLEO} />
      <circle className="logo-ponto" cx="307.5" cy="72" r="4.8" fill={PETROLEO} />
      <circle className="logo-ponto" cx="320" cy="72" r="4.8" fill={PETROLEO} />
      <path d={PATH_OST} transform="translate(-10 0)" fill={GRAFITE} />
    </svg>
  )
}

/**
 * Logotipo da suite + nome do produto, separados por um filete: "GGPost |
 * Recepção". O nome usa a voz do app (Inter semibold), nao a do logotipo —
 * a marca e uma so; o produto e um rotulo.
 */
export function MarcaRecepcao({ tamanho = 23, className = '' }: { tamanho?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logotipo tamanho={tamanho} />
      <span aria-hidden="true" className="h-[0.95em] w-px" style={{ backgroundColor: 'var(--color-border)', fontSize: tamanho }} />
      <span
        className="font-semibold tracking-[-.01em] whitespace-nowrap"
        style={{ fontSize: Math.round(tamanho * 0.62), color: 'var(--color-nav-text)' }}
      >
        Recepção
      </span>
    </span>
  )
}
