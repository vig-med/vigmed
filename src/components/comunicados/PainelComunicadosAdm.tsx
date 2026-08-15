'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Pencil, Pin, Search, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { IconeAnimado } from '@/components/ui/icone-animado'
import { ConfirmacaoExclusaoInline } from '@/components/ui/ConfirmacaoExclusaoInline'
import { Button } from '@/components/ui'
import { EditorComunicado, textoPlanoHtml } from '@/components/comunicados/EditorComunicado'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import {
  atualizarComunicado,
  excluirComunicado,
  listarVisualizacoesComunicado,
  publicarComunicado,
  type ComunicadoAdmin,
  type VisualizacaoEmpresa,
} from '@/lib/comunicados/acoes'
import { cn, formatarDataHora } from '@/lib/utils'
import type { PrioridadeComunicado } from '@/types'

type Aba = 'ativos' | 'rascunhos' | 'historico'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'ativos', rotulo: 'Ativos' },
  { id: 'rascunhos', rotulo: 'Rascunhos' },
  { id: 'historico', rotulo: 'Histórico' },
]

interface Props {
  comunicadosIniciais: ComunicadoAdmin[]
  empresas: { id: string; nome_fantasia: string }[]
}

function formularioVazio() {
  return {
    titulo: '',
    corpo: '',
    prioridade: 'normal' as PrioridadeComunicado,
    paraTodos: true,
    empresaIds: [] as string[],
  }
}

export function PainelComunicadosAdm({ comunicadosIniciais, empresas }: Props) {
  const router = useRouter()
  const [aba, definirAba] = useState<Aba>('ativos')
  const [busca, definirBusca] = useState('')
  const { pendente, executar } = useAcaoPendente<'salvar' | 'excluir'>()

  const [editandoId, definirEditandoId] = useState<string | null>(null)
  const [form, definirForm] = useState(formularioVazio)
  const [excluirId, definirExcluirId] = useState<string | null>(null)
  const [visualizacoesId, definirVisualizacoesId] = useState<string | null>(null)
  const [visualizacoes, definirVisualizacoes] = useState<VisualizacaoEmpresa[]>([])
  const [carregandoViz, definirCarregandoViz] = useState(false)

  const comunicados = useMemo(() => {
    return comunicadosIniciais.filter((c) => {
      const rascunho = (c.metadados as { rascunho?: boolean })?.rascunho
      if (aba === 'ativos' && !c.ativo) return false
      if (aba === 'rascunhos' && (!rascunho || c.ativo)) return false
      if (aba === 'historico' && (rascunho || c.ativo)) return false
      if (busca && !c.titulo.toLowerCase().includes(busca.toLowerCase())) return false
      return true
    })
  }, [comunicadosIniciais, aba, busca])

  useEffect(() => {
    if (!visualizacoesId) {
      definirVisualizacoes([])
      return
    }
    let cancelado = false
    definirCarregandoViz(true)
    void listarVisualizacoesComunicado(visualizacoesId).then((res) => {
      if (cancelado) return
      definirVisualizacoes(res.empresas)
      definirCarregandoViz(false)
    })
    return () => { cancelado = true }
  }, [visualizacoesId])

  function limparFormulario() {
    definirEditandoId(null)
    definirForm(formularioVazio())
  }

  function carregarEdicao(c: ComunicadoAdmin) {
    definirEditandoId(c.id)
    definirForm({
      titulo: c.titulo,
      corpo: c.corpo,
      prioridade: c.prioridade,
      paraTodos: c.para_todos,
      empresaIds: c.empresa_ids ?? [],
    })
    definirVisualizacoesId(null)
  }

  function enviar(rascunho: boolean) {
    if (!form.titulo.trim() || !textoPlanoHtml(form.corpo)) {
      toast.error('Preencha título e mensagem.')
      return
    }
    void executar('salvar', async () => {
      const payload = {
        titulo: form.titulo,
        corpo: form.corpo,
        prioridade: form.prioridade,
        paraTodos: form.paraTodos,
        empresaIds: form.paraTodos ? undefined : form.empresaIds,
        rascunho,
      }
      const resultado = editandoId
        ? await atualizarComunicado({ id: editandoId, ...payload })
        : await publicarComunicado(payload)

      if (resultado.erro) { toast.error(resultado.erro); return }
      toast.success(
        editandoId
          ? 'Comunicado atualizado.'
          : rascunho
            ? 'Rascunho salvo.'
            : 'Comunicado publicado.',
      )
      limparFormulario()
      router.refresh()
    })
  }

  function confirmarExclusao(id: string) {
    void executar('excluir', async () => {
      const resultado = await excluirComunicado(id)
      if (resultado.erro) { toast.error(resultado.erro); return }
      toast.success('Comunicado excluído.')
      if (editandoId === id) limparFormulario()
      if (visualizacoesId === id) definirVisualizacoesId(null)
      definirExcluirId(null)
      router.refresh()
    })
  }

  const vistos = visualizacoes.filter((v) => v.visualizou).length

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Comunicados"
        descricao="Gerencie e publique avisos para a rede de empresas parceiras."
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        <section className="xl:col-span-7 flex flex-col gap-4">
          <RevelarScroll>
            <div className="painel-filtros">
              <div className="painel-busca" style={{ minWidth: 160 }}>
                <Search size={13} className="painel-busca-icone" />
                <input
                  className="painel-busca-input"
                  placeholder="Buscar comunicados..."
                  value={busca}
                  onChange={(e) => definirBusca(e.target.value)}
                />
              </div>
              <div className="painel-pilulas">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => definirAba(a.id)}
                    className={cn('painel-pilula', aba === a.id && 'painel-pilula--ativo')}
                  >
                    {a.rotulo}
                  </button>
                ))}
              </div>
            </div>
          </RevelarScroll>

          <div className="flex flex-col gap-3">
            {comunicados.map((c, i) => (
              <RevelarScroll key={c.id} atraso={i * 0.04}>
                <div className={cn('comunicado-card', c.fixado && 'comunicado-card--fixado', editandoId === c.id && 'comunicado-card--editando')}>
                  {c.fixado && (
                    <div className="comunicado-card-barra">
                      <span className="flex items-center gap-1.5"><Pin size={11} /> Fixado</span>
                      <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-3)' }}>
                        {formatarDataHora(c.publicado_em)}
                      </span>
                    </div>
                  )}
                  <div className="comunicado-card-corpo">
                    <div className="flex justify-between items-start gap-2">
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{c.titulo}</h3>
                      <span className={cn('badge-prioridade', `prioridade-${c.prioridade}`)}>{c.prioridade}</span>
                    </div>
                    {!c.fixado && (
                      <span className="tabela-mono">{formatarDataHora(c.publicado_em)}</span>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {textoPlanoHtml(c.corpo)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--color-border)', fontSize: '0.73rem', color: 'var(--color-text-3)' }}>
                      <span className="flex items-center gap-1.5">
                        <Eye size={13} />
                        {c.para_todos ? 'Todas as empresas' : `${c.empresa_ids?.length ?? 0} empresas`}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => definirVisualizacoesId(visualizacoesId === c.id ? null : c.id)}
                          aria-label="Ver quem visualizou"
                          title="Quem visualizou"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => carregarEdicao(c)}
                          aria-label="Editar comunicado"
                        >
                          <Pencil size={14} />
                        </Button>
                        <ConfirmacaoExclusaoInline
                          ariaLabel="Excluir comunicado"
                          confirmando={excluirId === c.id}
                          desabilitado={pendente('excluir')}
                          onPedir={() => definirExcluirId(c.id)}
                          onConfirmar={() => confirmarExclusao(c.id)}
                          onCancelar={() => definirExcluirId(null)}
                        />
                      </div>
                    </div>

                    {visualizacoesId === c.id && (
                      <div className="comunicado-visualizacoes">
                        <div className="comunicado-visualizacoes-cabecalho">
                          Visualizações
                          {!carregandoViz && (
                            <span>{vistos}/{visualizacoes.length} empresas</span>
                          )}
                        </div>
                        {carregandoViz ? (
                          <p className="comunicado-visualizacoes-vazio">Carregando...</p>
                        ) : visualizacoes.length === 0 ? (
                          <p className="comunicado-visualizacoes-vazio">Nenhuma empresa destinatária.</p>
                        ) : (
                          <ul className="comunicado-visualizacoes-lista">
                            {visualizacoes.map((v) => (
                              <li key={v.empresa_id} className={cn(v.visualizou && 'viu')}>
                                <span>{v.nome}</span>
                                {v.visualizou ? (
                                  <span className="flex items-center gap-1 text-emerald-600">
                                    <Check size={12} />
                                    {v.lido_em ? formatarDataHora(v.lido_em) : 'Viu'}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-text-3)' }}>Não viu</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </RevelarScroll>
            ))}

            {comunicados.length === 0 && (
              <RevelarScroll>
                <div className="painel-vazio painel-card">
                  <IconeAnimado nome="megaphone" tamanho={24} className="opacity-40" />
                  Nenhum comunicado nesta aba.
                </div>
              </RevelarScroll>
            )}
          </div>
        </section>

        <section className="xl:col-span-5 xl:sticky xl:top-24">
          <RevelarScroll atraso={0.08}>
            <div className="painel-form-lateral">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <IconeAnimado nome="megaphone" tamanho={16} />
                  <span className="painel-form-titulo">
                    {editandoId ? 'Editar Comunicado' : 'Novo Comunicado'}
                  </span>
                </div>
                {editandoId && (
                  <Button type="button" variant="ghost" size="sm" onClick={limparFormulario} aria-label="Cancelar edição">
                    <X size={14} />
                  </Button>
                )}
              </div>

              <div className="painel-campo">
                <label className="painel-label">Título</label>
                <input
                  className="painel-input"
                  placeholder="Ex: Atualização de Sistema"
                  value={form.titulo}
                  onChange={(e) => definirForm((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="painel-campo">
                  <label className="painel-label">Prioridade</label>
                  <select
                    className="painel-select"
                    style={{ width: '100%' }}
                    value={form.prioridade}
                    onChange={(e) => definirForm((f) => ({ ...f, prioridade: e.target.value as PrioridadeComunicado }))}
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div className="painel-campo">
                  <label className="painel-label">Destinatários</label>
                  <select
                    className="painel-select"
                    style={{ width: '100%' }}
                    value={form.paraTodos ? 'all' : 'sel'}
                    onChange={(e) => definirForm((f) => ({ ...f, paraTodos: e.target.value === 'all' }))}
                  >
                    <option value="all">Todas as empresas</option>
                    <option value="sel">Selecionar...</option>
                  </select>
                </div>
              </div>

              {!form.paraTodos && (
                <div className="painel-checkbox-lista">
                  {empresas.map((e) => (
                    <label key={e.id} className="painel-checkbox-item">
                      <input
                        type="checkbox"
                        checked={form.empresaIds.includes(e.id)}
                        onChange={(ev) => {
                          definirForm((f) => ({
                            ...f,
                            empresaIds: ev.target.checked
                              ? [...f.empresaIds, e.id]
                              : f.empresaIds.filter((id) => id !== e.id),
                          }))
                        }}
                      />
                      {e.nome_fantasia}
                    </label>
                  ))}
                </div>
              )}

              <div className="painel-campo">
                <label className="painel-label">Mensagem</label>
                <EditorComunicado
                  key={editandoId ?? 'novo'}
                  conteudo={form.corpo}
                  onChange={(html) => definirForm((f) => ({ ...f, corpo: html }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                {editandoId ? (
                  <>
                    <Button variant="outline" size="sm" loading={pendente('salvar')} onClick={() => enviar(true)}>
                      Salvar como rascunho
                    </Button>
                    <Button variant="primary" size="sm" loading={pendente('salvar')} onClick={() => enviar(false)}>
                      <Send size={14} />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" loading={pendente('salvar')} onClick={() => enviar(true)}>
                      Salvar Rascunho
                    </Button>
                    <Button variant="primary" size="sm" loading={pendente('salvar')} onClick={() => enviar(false)}>
                      <Send size={14} />
                      Publicar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </RevelarScroll>
        </section>
      </div>
    </SecaoPainel>
  )
}
