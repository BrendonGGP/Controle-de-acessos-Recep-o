import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useTitulo } from '@/hooks/useTitulo'
import { dataPorExtenso } from '@/lib/horario'
import { Button } from '@/components/ui/button'
import { CabecalhoPagina } from '@/components/CabecalhoPagina'
import { EstadoErro, EstadoVazio, Skeleton } from '@/components/Estados'
import { MessageSquare } from '@/components/icones'

type Template = {
  id: string
  type: string
  /** Versão específica de uma categoria de acesso; nulo é o texto genérico. */
  category: string | null
  subject: string
  message: string
}

/**
 * Chave de um template na tela. Entrada e saída podem ter uma versão por
 * categoria (alimento, mercadoria) além da genérica, então o tipo sozinho
 * não basta para identificá-los.
 */
const chaveTemplate = (t: Pick<Template, 'type' | 'category'>) =>
  t.category ? `${t.type}:${t.category}` : t.type

const VARIAVEIS: Record<string, string[]> = {
  entrada: ['nome_colaborador', 'nome_visitante', 'acao'],
  saida: ['nome_colaborador', 'nome_visitante', 'acao'],
  agendamento: ['nome_colaborador', 'titulo', 'sala', 'data', 'horario', 'cafe'],
  lembrete: ['nome_colaborador', 'titulo', 'sala', 'data', 'horario', 'cafe'],
  cancelamento: ['nome_colaborador', 'titulo', 'sala', 'data', 'horario'],
  'cancelamento:responsavel': ['nome_colaborador', 'titulo', 'sala', 'data', 'horario'],
  'entrada:entregas_alimento': ['nome_colaborador', 'nome_visitante'],
  'entrada:visitas_reunioes': ['nome_colaborador', 'nome_visitante'],
  'entrada:entrevista_rh': ['nome_colaborador', 'nome_visitante'],
  'entrada:atendimento': ['nome_colaborador', 'nome_visitante'],
  'entrada:prestadores_servico': ['nome_colaborador', 'nome_visitante'],
  'entrada:stands': ['nome_colaborador', 'nome_visitante'],
  'entrada:treinamentos_onboarding': ['nome_colaborador', 'nome_visitante'],
  'entrada:entregas_mercadoria': ['nome_colaborador', 'nome_visitante'],
}

const NOMES: Record<string, { titulo: string; quando: string }> = {
  entrada: { titulo: 'Entrada de visitante', quando: 'Sai quando a recepção registra uma entrada e marca o aviso para quem recebe a visita.' },
  saida: { titulo: 'Saída de visitante', quando: 'Sai quando a recepção registra uma saída e marca o aviso.' },
  agendamento: { titulo: 'Nova reunião', quando: 'Sai para os participantes quando a reunião é agendada.' },
  lembrete: { titulo: 'Lembrete de reunião', quando: 'Sai para os participantes pouco antes do início.' },
  cancelamento: { titulo: 'Reunião cancelada', quando: 'Sai para os participantes quando a reunião é excluída da agenda.' },
  'cancelamento:responsavel': { titulo: 'Reunião cancelada — quem pediu a sala', quando: 'Substitui o texto acima para o colaborador marcado como responsável no agendamento.' },
  'entrada:visitas_reunioes': { titulo: 'Entrada — visita ou reunião', quando: 'Sai quando a recepção registra entrada na categoria "Visita ou reunião".' },
  'entrada:entrevista_rh': { titulo: 'Entrada — entrevista', quando: 'Sai quando a recepção registra entrada na categoria "Entrevista RH".' },
  'entrada:atendimento': { titulo: 'Entrada — atendimento', quando: 'Sai quando a recepção registra entrada na categoria "Atendimento".' },
  'entrada:prestadores_servico': { titulo: 'Entrada — prestador de serviço', quando: 'Sai quando a recepção registra entrada na categoria "Prestador de serviço".' },
  'entrada:stands': { titulo: 'Entrada — stand', quando: 'Sai quando a recepção registra entrada na categoria "Stand".' },
  'entrada:treinamentos_onboarding': { titulo: 'Entrada — treinamento', quando: 'Sai quando a recepção registra entrada na categoria "Treinamento".' },
  'entrada:entregas_alimento': { titulo: 'Chegada de alimento', quando: 'Sai quando a recepção registra uma entrada na categoria "Entrega de alimento".' },
  'entrada:entregas_mercadoria': { titulo: 'Chegada de mercadoria', quando: 'Sai quando a recepção registra uma entrada na categoria "Entrega de mercadoria".' },
}

export function Mensagens() {
  useTitulo('Mensagens')
  const avisar = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  // Texto como está no banco, para saber o que mudou e ainda não foi salvo.
  const [salvos, setSalvos] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Os templates padrão são criados pelo `supabase/seed.sql` (a escrita em
  // message_templates é restrita a admin pelo RLS, então não pode partir daqui).
  async function fetchTemplates() {
    setErroCarga(null)
    const { data, error } = await supabase.from('message_templates').select('*').order('type')
    if (error) setErroCarga(error.message)
    setTemplates(data ?? [])
    setSalvos(Object.fromEntries((data ?? []).map((t: Template) => [t.id, t.message])))
    setLoading(false)
  }

  const handleUpdate = async (id: string, newMessage: string) => {
    setSavingId(id)
    const { error } = await supabase
      .from('message_templates')
      .update({ message: newMessage, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      avisar('error', 'Não foi possível salvar: ' + error.message)
    } else {
      setSalvos(prev => ({ ...prev, [id]: newMessage }))
      avisar('success', 'Mensagem salva. Os próximos avisos já saem com o texto novo.')
    }
    setSavingId(null)
  }

  return (
    <div>
      <CabecalhoPagina
        sobretitulo={dataPorExtenso()}
        titulo="Mensagens"
        descricao="Os textos que a recepção envia sozinha no WhatsApp."
      />

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="folha space-y-3 p-5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-72" />
              <Skeleton className="h-32 w-full rounded-[14px]" />
            </div>
          ))}
        </div>
      ) : erroCarga ? (
        <EstadoErro mensagem={erroCarga} onTentarNovamente={() => { setLoading(true); fetchTemplates() }} />
      ) : templates.length === 0 ? (
        <div className="folha">
          <EstadoVazio
            icone={<MessageSquare size={22} />}
            titulo="Nenhuma mensagem cadastrada"
            descricao={<>Rode o <code className="rounded-[6px] font-sans bg-[var(--color-preenchimento-2)] px-1.5 py-0.5 text-[13px] text-[var(--color-text)]">supabase/seed.sql</code> no banco para criar os textos padrão.</>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => {
            const chave = chaveTemplate(template)
            const nome = NOMES[chave] ?? NOMES[template.type]
            const alterado = salvos[template.id] !== template.message
            const variaveis = VARIAVEIS[chave] ?? VARIAVEIS[template.type] ?? []
            return (
              <section key={template.id} className="folha p-5" aria-labelledby={`tpl-${template.id}`}>
                <h2 id={`tpl-${template.id}`} className="text-[17px] font-semibold leading-[22px] tracking-[-.014em] text-[var(--color-text)]">
                  {nome?.titulo ?? template.type}
                </h2>
                <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                  {nome?.quando ?? `Assunto interno: ${template.subject}`}
                </p>

                <textarea
                  aria-labelledby={`tpl-${template.id}`}
                  aria-describedby={`vars-${template.id}`}
                  value={template.message}
                  onChange={(e) => {
                    const valor = e.target.value
                    setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, message: valor } : t))
                  }}
                  className="mt-4 min-h-[150px] w-full resize-none rounded-[14px] [field-sizing:content] border border-transparent bg-[var(--color-preenchimento)] p-3.5 text-[15px] leading-[23px] text-[var(--color-text)] transition-[background-color,box-shadow,border-color] duration-200 hover:bg-[var(--color-preenchimento-2)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:shadow-[0_0_0_4px_rgba(55,128,157,.14)] focus:outline-none"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {variaveis.length > 0 ? (
                    <p id={`vars-${template.id}`} className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)]">
                      <span className="mr-0.5">Pode usar</span>
                      {variaveis.map(v => (
                        <code key={v} className="rounded-[8px] font-sans bg-[var(--color-preenchimento-2)] px-2 py-0.5 text-[12.5px] text-[var(--color-nav-text)]">{`{{${v}}}`}</code>
                      ))}
                    </p>
                  ) : <span id={`vars-${template.id}`} />}
                  <div className="flex items-center gap-3">
                    {alterado && <span className="text-[13px] text-[var(--color-text-secondary)]">Alterações não salvas</span>}
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(template.id, template.message)}
                      disabled={savingId === template.id || !alterado}
                      className="min-w-20"
                    >
                      {savingId === template.id ? <span className="pontos-pulando" aria-label="Salvando"><i /><i /><i /></span> : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
