interface LogoGGPProps {
  /** Altura do logotipo em px. A largura acompanha pela proporção. */
  altura?: number
  /** Mostra "GRUPO GOMES PIRES" abaixo da marca. */
  comAssinatura?: boolean
  className?: string
}

/**
 * Logotipo oficial do Grupo Gomes Pires.
 *
 * É o arquivo da marca, não um desenho aproximado: antes isto era montado
 * com três <span> de texto e uma <div> posicionada por cima, o que dependia
 * da fonte carregar para ficar alinhado e não correspondia ao logotipo.
 *
 * O PNG sai do arquivo oficial, com o fundo branco removido para assentar
 * em qualquer superfície, e em 2x para ficar nítido em tela retina.
 */
export function LogoGGP({ altura = 40, comAssinatura = false, className = '' }: LogoGGPProps) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <img
        src="/logo-ggp.png"
        alt="GGP — Grupo Gomes Pires"
        style={{ height: altura, width: 'auto' }}
      />

      {comAssinatura && (
        <span className="text-[10px] font-light tracking-[0.15em] text-[var(--color-text-secondary)] mt-2 uppercase text-center w-full">
          Grupo Gomes Pires
        </span>
      )}
    </div>
  )
}
