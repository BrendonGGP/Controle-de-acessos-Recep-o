import { Link } from 'react-router-dom'
import { useTitulo } from '@/hooks/useTitulo'
import { MarcaRecepcao } from '@/components/Marca'
import { Button } from '@/components/ui/button'

/** Endereço que não existe: a marca, uma frase e o caminho de volta. */
export function NaoEncontrada() {
  useTitulo('Página não encontrada')
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <MarcaRecepcao tamanho={28} className="digitando" />
      <div className="folha w-full max-w-md px-8 pb-8 pt-9">
        <p className="sobretitulo">Erro 404</p>
        <h1 className="titulo-grande mt-1">Esta porta não existe</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-[var(--color-text-secondary)]">
          O endereço pode ter mudado ou sido digitado errado. As salas estão logo ali.
        </p>
        <Button asChild className="mt-6">
          <Link to="/salas">Ir para as salas</Link>
        </Button>
      </div>
    </main>
  )
}
