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
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-400" />
          Templates de Mensagem
        </h1>
        <p className="text-slate-400 mt-1">Personalize os textos que serão enviados automaticamente via WhatsApp.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-start gap-2 text-slate-400">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
            <p>
              Nenhum template cadastrado. Execute o <code className="text-blue-300">supabase/seed.sql</code> no
              banco para criar os textos padrão.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {templates.map(template => (
            <Card key={template.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-lg text-white">{getTypeName(template.type)}</CardTitle>
                <CardDescription className="text-slate-400">
                  Assunto Interno: {template.subject}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-blue-300 text-sm">
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
                  className="w-full min-h-[150px] bg-slate-950 border border-slate-700 rounded-md p-3 text-white font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleUpdate(template.id, template.message)}
                    disabled={savingId === template.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
