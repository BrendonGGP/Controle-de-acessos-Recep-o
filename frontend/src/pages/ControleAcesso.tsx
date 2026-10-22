import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTitulo } from '@/hooks/useTitulo'
import { formatPhone, formatName, normalizePhone } from '@/lib/utils'
import { dataPorExtenso, hojeLocal } from '@/lib/horario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Segmentado } from '@/components/ui/segmentado'
import { Checkbox } from '@/components/ui/checkbox'
import { Modal, RodapeModal } from '@/components/ui/modal'
import { CabecalhoPagina } from '@/components/CabecalhoPagina'
import { AvisoErro, EstadoErro, EstadoVazio, Skeleton } from '@/components/Estados'
import { DoorOpen, Download, LogIn, LogOut, Plus, Whatsapp } from '@/components/icones'
import { exportarRelatorioPDF, type LinhaRelatorio } from '@/lib/relatorio'

type Collaborator = { id: string; name: string }
type AccessLog = {
  id: string
  action: string
  category: string
  visitor_name: string
  document: string
  created_at: string
}

/** Entrada ainda sem baixa: quem está na empresa agora. */
type Presente = {
  id: string
  visitor_name: string
  document: string | null
  category: string
  created_at: string
}

const CATEGORIAS = [
  { value: 'visitas_reunioes', label: 'Visita ou reunião' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'prestadores_servico', label: 'Prestador de serviço' },
  { value: 'entregas_mercadoria', label: 'Entrega de mercadoria' },
  { value: 'entregas_alimento', label: 'Entrega de alimento' },
  { value: 'entrevista_rh', label: 'Entrevista RH' },
  { value: 'stands', label: 'Stand' },
  { value: 'treinamentos_onboarding', label: 'Treinamento' },
]

/**
 * Categorias que recebem o link de avaliação na saída. Espelha a função
 * `avaliacao_elegivel` no banco, que é quem manda — aqui serve para a tela
 * não chamar o envio à toa quando o visitante não se qualifica.
 */
const CATEGORIAS_AVALIADAS = ['visitas_reunioes', 'atendimento']

/** Uma visita anterior da mesma pessoa, para reaproveitar o cadastro. */
type CadastroAnterior = {
  visitor_name: string
  document: string
  phone: string | null
  ultima_visita: string
}

/**
 * Quantos caracteres antes de procurar. Com um só, a busca traria meio
 * banco e atrapalharia quem está só digitando um nome novo.
 */
const MINIMO_PARA_BUSCAR = 2

/** Primeiro dia do mês corrente — o período que o relatório abre sugerindo. */
function primeiroDoMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** "14/10/2026" a partir do timestamp da última visita. */
function diaDaVisita(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

const nomeCategoria = (cat: string) =>
  CATEGORIAS.find(c => c.value === cat)?.label
  ?? cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** "hoje, 09:32" ou "13/10, 17:05". */
function quando(iso: string) {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (hojeLocal(d) === hojeLocal()) return { dia: 'hoje', hora }
  return { dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), hora }
}

export function ControleAcesso() {
  useTitulo('Controle de acesso')
  const { user } = useAuth()
  const avisar = useToast()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [action, setAction] = useState<'entrada' | 'saida'>('entrada')
  const [category, setCategory] = useState('visitas_reunioes')
  const [visitorName, setVisitorName] = useState('')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [observations, setObservations] = useState('')
  const [notify, setNotify] = useState(false)
  const [collaboratorId, setCollaboratorId] = useState('')

  // Quem entrou e ainda não teve a saída registrada. A baixa vira um clique
  // na pessoa, em vez de digitar o nome de novo.
  const [presentes, setPresentes] = useState<Presente[]>([])
  const [buscaPresente, setBuscaPresente] = useState('')
  const [baixaId, setBaixaId] = useState<string | null>(null)

  // Relatório: período e filtro escolhidos antes de gerar o PDF.
  const [relatorioAberto, setRelatorioAberto] = useState(false)
  const [relInicio, setRelInicio] = useState(primeiroDoMes())
  const [relFim, setRelFim] = useState(hojeLocal())
  const [relCategoria, setRelCategoria] = useState('')
  const [relGerando, setRelGerando] = useState(false)
  const [relErro, setRelErro] = useState<string | null>(null)

  // Cadastro anterior: quem já visitou aparece enquanto a recepção digita,
  // para não precisar pedir o documento de novo.
  const [sugestoes, setSugestoes] = useState<CadastroAnterior[]>([])
  const [buscandoCadastro, setBuscandoCadastro] = useState(false)
  // Depois de escolher uma sugestão, a lista some até a recepção digitar de
  // novo — senão ela reabriria por cima do formulário já preenchido.
  const [sugestoesVisiveis, setSugestoesVisiveis] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  // Busca o cadastro anterior enquanto a recepção digita, com 300ms de
  // espera: sem isso sairia uma consulta por tecla.
  useEffect(() => {
    const termo = visitorName.trim()
    // Termo curto demais não busca. A lista some sozinha na renderização
    // (ver `sugestoesVisiveis` abaixo), sem precisar de um setState aqui.
    if (!sugestoesVisiveis || termo.length < MINIMO_PARA_BUSCAR) return

    let cancelado = false
    const timer = setTimeout(async () => {
      setBuscandoCadastro(true)
      const { data } = await supabase.rpc('buscar_cadastro_anterior', { p_termo: termo })
      // Uma resposta lenta de um termo já apagado não pode sobrescrever a
      // lista do termo atual.
      if (cancelado) return
      setSugestoes((data ?? []) as CadastroAnterior[])
      setBuscandoCadastro(false)
    }, 300)

    return () => { cancelado = true; clearTimeout(timer) }
  }, [visitorName, sugestoesVisiveis])

  /** Preenche o formulário com os dados da visita anterior. */
  function usarCadastro(c: CadastroAnterior) {
    setVisitorName(c.visitor_name.trim())
    setDocument(c.document)
    if (c.phone) setPhone(formatPhone(c.phone.replace(/^55/, '')))
    setSugestoes([])
    setSugestoesVisiveis(false)
  }

  function abrirRelatorio() {
    setRelErro(null)
    setRelInicio(primeiroDoMes())
    setRelFim(hojeLocal())
    setRelCategoria('')
    setRelatorioAberto(true)
  }

  async function gerarRelatorio() {
    if (relInicio > relFim) {
      setRelErro('A data inicial não pode ser depois da final.')
      return
    }

    setRelGerando(true)
    setRelErro(null)

    const { data, error } = await supabase.rpc('relatorio_acessos', {
      p_inicio: relInicio,
      p_fim: relFim,
      p_categoria: relCategoria || null,
    })

    setRelGerando(false)

    if (error) {
      setRelErro('Não foi possível montar o relatório: ' + error.message)
      return
    }

    try {
      exportarRelatorioPDF((data ?? []) as LinhaRelatorio[], {
        inicio: relInicio,
        fim: relFim,
        categoria: relCategoria || null,
      })
      setRelatorioAberto(false)
    } catch (err: any) {
      // Pop-up bloqueado é o caso comum aqui, e a mensagem explica o que
      // fazer — fechar o modal esconderia a instrução.
      setRelErro(err.message || 'Não foi possível abrir a janela de impressão.')
    }
  }

  async function fetchInitialData() {
    setErroCarga(null)
    const [collabsRes, logsRes, presentesRes] = await Promise.all([
      supabase.from('collaborators').select('id, name').order('name'),
      supabase.from('access_logs').select('id, action, category, visitor_name, document, created_at').order('created_at', { ascending: false }).limit(20),
      // Quem entrou e ainda não saiu, do mais recente para o mais antigo.
      supabase
        .from('access_logs')
        .select('id, visitor_name, document, category, created_at')
        .eq('action', 'entrada')
        .is('saida_em', null)
        .order('created_at', { ascending: false }),
    ])
    if (logsRes.error) setErroCarga(logsRes.error.message)
    if (collabsRes.data) setCollaborators(collabsRes.data)
    if (logsRes.data) setLogs(logsRes.data)
    if (presentesRes.data) setPresentes(presentesRes.data as Presente[])
    setLoading(false)
  }

  /** Dá baixa numa entrada. A função no banco cria a saída e marca a
      entrada numa transação só, para não haver baixa pela metade. */
  async function darBaixa(entrada: Presente) {
    setBaixaId(entrada.id)
    const { error } = await supabase.rpc('registrar_saida', {
      p_entrada_id: entrada.id,
      p_observacoes: null,
    })
    setBaixaId(null)

    if (error) {
      avisar('error', 'Não foi possível registrar a saída: ' + error.message)
      return
    }

    // O link de avaliação sai agora, com a visita fresca na memória de quem
    // ainda está no estacionamento. Só para quem veio por visita/reunião ou
    // atendimento: pesquisa de satisfação para entregador soaria deslocada.
    // Se o envio falhar, a saída continua registrada — é o que importa.
    if (CATEGORIAS_AVALIADAS.includes(entrada.category)) {
      const { error: avaliacaoError } = await supabase.functions.invoke('notify-avaliacao', {
        body: { entrada_id: entrada.id },
      })
      if (avaliacaoError) {
        console.error('Saída registrada, mas o link de avaliação não saiu: ' + avaliacaoError.message)
        avisar('error', `Saída de ${entrada.visitor_name} registrada, mas o link de avaliação não saiu.`)
        fetchInitialData()
        return
      }
    }

    avisar('success', `Saída de ${entrada.visitor_name} registrada.`)
    fetchInitialData()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    if (!visitorName) {
      setError('Informe o nome do visitante.')
      setFormLoading(false)
      return
    }

    if (notify && !collaboratorId) {
      setError('Escolha quem recebe o aviso no WhatsApp.')
      setFormLoading(false)
      return
    }

    try {
      // Telefone do visitante é opcional, mas se preenchido precisa ser válido
      let cleanPhone: string | null = null
      if (phone.trim()) {
        cleanPhone = normalizePhone(phone)
        if (!cleanPhone) {
          throw new Error('Telefone inválido. Informe DDD e número, como (11) 98765-4321.')
        }
      }

      const { data: newLog, error: insertError } = await supabase
        .from('access_logs')
        .insert({
          action,
          category,
          visitor_name: visitorName,
          document,
          phone: cleanPhone,
          observations,
          notify,
          notified_collaborator_id: notify ? collaboratorId : null,
          created_by: user?.id ?? null
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Se a notificação estiver ativada, chama a Edge Function diretamente!
      let avisoFalhou = false
      if (notify && newLog) {
        const { error: invokeError } = await supabase.functions.invoke('notify-access', {
          body: { record: newLog }
        })
        if (invokeError) {
          avisoFalhou = true
          avisar('error', 'Registro salvo, mas o aviso no WhatsApp não saiu: ' + invokeError.message)
        }
      }

      if (!avisoFalhou) {
        const registro = action === 'entrada' ? 'Entrada registrada.' : 'Saída registrada.'
        avisar('success', notify ? `${registro} Aviso enviado no WhatsApp.` : registro)
      }
      setIsModalOpen(false)
      resetForm()
      fetchInitialData() // refresh logs
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar acesso')
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setAction('entrada')
    setCategory('visitas_reunioes')
    setVisitorName('')
    setDocument('')
    setPhone('')
    setObservations('')
    setNotify(false)
    setCollaboratorId('')
    setError(null)
    setSugestoes([])
    setSugestoesVisiveis(false)
  }

  const entradasHoje = logs.filter(l => l.action === 'entrada' && hojeLocal(new Date(l.created_at)) === hojeLocal()).length

  return (
    <div>
      <CabecalhoPagina
        sobretitulo={dataPorExtenso()}
        titulo="Controle de acesso"
        descricao="Entradas e saídas de visitantes e prestadores."
        acoes={
          <>
            <Button variant="secondary" onClick={abrirRelatorio}>
              <Download /> Exportar
            </Button>
            <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
              <Plus /> Registrar acesso
            </Button>
          </>
        }
      />

      {erroCarga && logs.length === 0 && !loading ? (
        <EstadoErro mensagem={erroCarga} onTentarNovamente={() => { setLoading(true); fetchInitialData() }} />
      ) : (
        <section className="folha" aria-labelledby="titulo-registros">
          <div className="flex items-baseline justify-between gap-4 px-5 pb-2 pt-5">
            <h2 id="titulo-registros" className="text-[17px] font-semibold leading-[22px] tracking-[-.014em] text-[var(--color-text)]">Últimos registros</h2>
            {!loading && logs.length > 0 && (
              <p className="text-[13px] tabular-nums text-[var(--color-text-secondary)]">
                {entradasHoje === 0 ? 'Nenhuma entrada hoje' : entradasHoje === 1 ? '1 entrada hoje' : `${entradasHoje} entradas hoje`}
              </p>
            )}
          </div>

          {loading ? (
            <div className="space-y-4 px-5 pb-6 pt-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EstadoVazio
              icone={<DoorOpen size={22} />}
              titulo="Nenhum registro ainda"
              descricao="A primeira entrada que você registrar aparece aqui."
            />
          ) : (
            <div className="overflow-x-auto px-2 pb-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[12px] text-[var(--color-text-secondary)]">
                    <th scope="col" className="px-3 py-2.5 font-medium">Quando</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Visitante</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Movimento</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Categoria</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const q = quando(log.created_at)
                    const entrada = log.action === 'entrada'
                    return (
                      <tr key={log.id} className="border-t transition-colors hover:bg-[rgb(var(--tinta)/.03)]" style={{ borderColor: 'var(--color-filete)' }}>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                          <span className="text-[var(--color-text)]">{q.hora}</span>
                          <span className="ml-1.5 text-[13px] text-[var(--color-text-secondary)]">{q.dia}</span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-[var(--color-text)]">{log.visitor_name}</p>
                          <p className="text-[13px] text-[var(--color-text-secondary)] md:hidden">{nomeCategoria(log.category)}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-nav-text)]">
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full"
                              style={{ backgroundColor: entrada ? 'var(--color-online)' : 'var(--color-ausente)' }}
                            />
                            {entrada ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="hidden px-3 py-3 text-[var(--color-text-secondary)] md:table-cell">{nomeCategoria(log.category)}</td>
                        <td className="hidden px-3 py-3 tabular-nums text-[var(--color-text-secondary)] sm:table-cell">{log.document || 'não informado'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal aberto={isModalOpen} aoFechar={() => setIsModalOpen(false)} titulo="Registrar acesso">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Segmentado
            rotulo="Movimento"
            largo
            valor={action}
            aoMudar={setAction}
            opcoes={[
              { valor: 'entrada', rotulo: <><LogIn size={16} /> Entrada</> },
              { valor: 'saida', rotulo: <><LogOut size={16} /> Saída</> },
            ]}
          />

          {action === 'saida' ? (
            <ListaPresentes
              presentes={presentes}
              busca={buscaPresente}
              aoBuscar={setBuscaPresente}
              baixaId={baixaId}
              aoDarBaixa={darBaixa}
            />
          ) : (
          <>
          <div className="space-y-1.5">
            <Label htmlFor="visitorName">Nome do visitante</Label>
            <div className="relative">
              <Input
                id="visitorName"
                value={visitorName}
                onChange={e => { setVisitorName(formatName(e.target.value)); setSugestoesVisiveis(true) }}
                required
                placeholder="Nome ou documento de quem já visitou"
                autoComplete="off"
                aria-describedby="dica-cadastro"
              />
              {/*
                Visitas anteriores da mesma pessoa. Escolher uma preenche
                documento e telefone — a recepção não precisa pedir o
                documento de novo a quem já esteve aqui.
              */}
              {sugestoesVisiveis && visitorName.trim().length >= MINIMO_PARA_BUSCAR && sugestoes.length > 0 && (
                <ul
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-[14px] border border-[var(--color-borda)] bg-[var(--color-surface)] p-1.5 shadow-lg"
                  aria-label="Visitas anteriores"
                >
                  {sugestoes.map(c => (
                    <li key={c.document}>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); usarCadastro(c) }}
                        className="w-full rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[var(--color-preenchimento)]"
                      >
                        <span className="block truncate text-sm text-[var(--color-text)]">
                          {c.visitor_name.trim()}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--color-text-secondary)]">
                          {c.document} · esteve aqui em {diaDaVisita(c.ultima_visita)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p id="dica-cadastro" className="text-[12px] text-[var(--color-text-secondary)]">
              {buscandoCadastro
                ? 'Procurando visitas anteriores…'
                : 'Quem já visitou nos últimos 12 meses aparece aqui, com documento e telefone.'}
            </p>
          </div>

          <Select label="Categoria" value={category} onChange={setCategory} options={CATEGORIAS} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="document">Documento (RG ou CPF)</Label>
              <Input id="document" type="tel" inputMode="numeric" value={document} onChange={e => setDocument(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" autoComplete="off" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observations">Observações</Label>
            <Input id="observations" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--color-filete)' }}>
            <Checkbox
              checked={notify}
              onChange={setNotify}
              label={<span className="inline-flex items-center gap-1.5"><Whatsapp size={16} className="text-[var(--color-icone)]" /> Avisar um colaborador no WhatsApp</span>}
            />
            {notify && (
              <div className="animate-fadeIn">
                <Select
                  label="Quem recebe o aviso"
                  value={collaboratorId}
                  onChange={setCollaboratorId}
                  options={collaborators.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Escolha o colaborador"
                  invalido={!!error && !collaboratorId}
                />
              </div>
            )}
          </div>

          {error && <AvisoErro>{error}</AvisoErro>}
          </>
          )}

          <RodapeModal>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              {action === 'saida' ? 'Fechar' : 'Cancelar'}
            </Button>
            {action === 'entrada' && (
              <Button type="submit" disabled={formLoading} className="min-w-32">
                {formLoading
                  ? <span className="pontos-pulando" aria-label="Registrando"><i /><i /><i /></span>
                  : 'Registrar entrada'}
              </Button>
            )}
          </RodapeModal>
        </form>
      </Modal>

      <Modal
        aberto={relatorioAberto}
        aoFechar={() => setRelatorioAberto(false)}
        titulo="Exportar relatório"
        descricao="Escolha o período e gere o PDF."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="relInicio">De</Label>
              <Input id="relInicio" type="date" value={relInicio} onChange={e => setRelInicio(e.target.value)} max={hojeLocal()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relFim">Até</Label>
              <Input id="relFim" type="date" value={relFim} onChange={e => setRelFim(e.target.value)} max={hojeLocal()} />
            </div>
          </div>

          <Select
            label="Categoria"
            value={relCategoria}
            onChange={setRelCategoria}
            options={[{ value: '', label: 'Todas as categorias' }, ...CATEGORIAS]}
          />

          <p className="text-[13px] text-[var(--color-text-secondary)]">
            O relatório abre numa aba nova. Para salvar o arquivo, escolha
            <strong className="text-[var(--color-text)]"> Salvar como PDF</strong> no destino da impressão.
          </p>

          {relErro && <AvisoErro>{relErro}</AvisoErro>}

          <RodapeModal>
            <Button type="button" variant="secondary" onClick={() => setRelatorioAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={gerarRelatorio} disabled={relGerando} className="min-w-32">
              {relGerando
                ? <span className="pontos-pulando" aria-label="Gerando"><i /><i /><i /></span>
                : <><Download size={16} /> Gerar PDF</>}
            </Button>
          </RodapeModal>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Quem está na empresa agora, para dar baixa com um clique.
 *
 * Antes a saída era um registro solto: a recepcionista digitava o nome de
 * novo e nada ligava a saída à entrada — o sistema nunca soube quem ainda
 * estava no prédio.
 */
function ListaPresentes({ presentes, busca, aoBuscar, baixaId, aoDarBaixa }: {
  presentes: Presente[]
  busca: string
  aoBuscar: (v: string) => void
  baixaId: string | null
  aoDarBaixa: (p: Presente) => void
}) {
  const termo = busca.trim().toLowerCase()
  const filtrados = termo
    ? presentes.filter(p =>
        p.visitor_name.toLowerCase().includes(termo) ||
        (p.document ?? '').toLowerCase().includes(termo))
    : presentes

  if (presentes.length === 0) {
    return (
      <EstadoVazio
        icone={<DoorOpen size={22} />}
        titulo="Ninguém na recepção"
        descricao="Todas as entradas já tiveram a saída registrada."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="busca_presente">Quem está saindo?</Label>
        <Input
          id="busca_presente"
          value={busca}
          onChange={e => aoBuscar(e.target.value)}
          placeholder="Buscar por nome ou documento"
          autoComplete="off"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-text-secondary)]">
          Ninguém encontrado com “{busca}”.
        </p>
      ) : (
        <ul className="max-h-[320px] overflow-y-auto">
          {filtrados.map(p => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-t py-2.5 first:border-t-0"
              style={{ borderColor: 'var(--color-filete)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-[var(--color-text)]">{p.visitor_name}</p>
                <p className="truncate text-[13px] text-[var(--color-text-secondary)]">
                  {[
                    nomeCategoria(p.category),
                    `desde ${new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                    p.document || null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => aoDarBaixa(p)}
                disabled={baixaId !== null}
                className="shrink-0"
              >
                {baixaId === p.id
                  ? <span className="pontos-pulando" aria-label="Registrando"><i /><i /><i /></span>
                  : <><LogOut size={16} /> Saída</>}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
