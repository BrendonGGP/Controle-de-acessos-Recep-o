import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MessageSquare, Save, Loader2, Info } from 'lucide-react'

type Template = {
  id: string
  type: string
  subject: string
  message: string
}

export function Mensagens() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Os templates padrão são criados pelo `supabase/seed.sql` (a escrita em
  // message_templates é restrita a admin pelo RLS, então não pode partir daqui).
  async function fetchTemplates() {
    setLoading(true)
    const { data } = await supabase.from('message_templates').select('*').order('type')
    setTemplates(data ?? [])
    setLoading(false)
  }

  const handleUpdate = async (id: string, newMessage: string) => {
    setSavingId(id)
    const { error } = await supabase
      .from('message_templates')
      .update({ message: newMessage, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert('Erro ao salvar template: ' + error.message)
    } else {
      alert('Template atualizado com sucesso! Lembre-se de fazer o deploy das Edge Functions novamente se você mudou variáveis.')
    }
    setSavingId(null)
  }

  const getVariablesHelp = (type: string) => {
    if (type === 'entrada' || type === 'saida') return 'Variáveis permitidas: {{nome_colaborador}}, {{nome_visitante}}, {{acao}}'
    if (type === 'agendamento' || type === 'lembrete') return 'Variáveis permitidas: {{nome_colaborador}}, {{titulo}}, {{sala}}, {{data}}, {{horario}}'
    return ''
  }

  const getTypeName = (type: string) => {
    const map: Record<string, string> = {
      'entrada': 'Visitante - Entrada',
      'saida': 'Visitante - Saída',
      'agendamento': 'Reunião - Novo Agendamento',
      'lembrete': 'Reunião - Lembrete'
    }
    return map[type] || type
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[var(--color-primary)]" />
          Templates de Mensagem
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Personalize os textos que serão enviados automaticamente via WhatsApp.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="pt-6 flex items-start gap-2 text-[var(--color-text-secondary)]">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-primary)]" />
            <p>
              Nenhum template cadastrado. Execute o <code className="text-[var(--color-primary)]">supabase/seed.sql</code> no
              banco para criar os textos padrão.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {templates.map(template => (
            <Card key={template.id} className="bg-[var(--color-surface)] border-[var(--color-border)]">
              <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                <CardTitle className="text-lg text-[var(--color-text)]">{getTypeName(template.type)}</CardTitle>
                <CardDescription className="text-[var(--color-text-secondary)]">
                  Assunto Interno: {template.subject}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-2 p-3 bg-[var(--color-primary-bg)] border border-[var(--color-primary)]/20 rounded-lg text-[var(--color-primary)] text-sm">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{getVariablesHelp(template.type)}</p>
                </div>
                
                <textarea 
                  defaultValue={template.message}
                  onChange={(e) => {
                    // Update local state without saving
                    const newTemplates = [...templates]
                    const idx = newTemplates.findIndex(t => t.id === template.id)
                    newTemplates[idx].message = e.target.value
                    setTemplates(newTemplates)
                  }}
                  className="w-full min-h-[150px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-3 text-[var(--color-text)] font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleUpdate(template.id, template.message)}
                    disabled={savingId === template.id}
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)] text-white"
                  >
                    {savingId === template.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
