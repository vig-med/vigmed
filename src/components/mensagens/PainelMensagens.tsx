'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, MessageSquare, Plus, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { Button } from '@/components/ui'
import { ConfirmacaoExclusaoInline } from '@/components/ui/ConfirmacaoExclusaoInline'
import { useMensagensNaoLidas } from '@/contexts/MensagensNaoLidasContext'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import {
  criarConversa,
  enviarMensagem,
  excluirConversa,
  excluirMensagem,
  listarConversas,
  listarMensagens,
} from '@/lib/mensagens/acoes'
import { cn, formatarDataHora } from '@/lib/utils'

interface ConversaItem {
  id: string
  assunto: string | null
  atualizado_em: string
  empresa_id?: string | null
  empresas?: { nome_fantasia: string } | null
  nao_lidas?: number
  mensagens?: { corpo: string; criado_em: string }[]
}

interface MensagemItem {
  id: string
  corpo: string
  criado_em: string
  remetente_id: string
  lida?: boolean
  lida_em?: string | null
  perfis?: { nome_completo: string } | null
}

interface Props {
  conversasIniciais: ConversaItem[]
  empresas: { id: string; nome_fantasia: string }[]
  perfilId: string
  modoAdmin: boolean
}

export function PainelMensagens({ conversasIniciais, empresas, perfilId, modoAdmin }: Props) {
  const { pendente, executar } = useAcaoPendente<'criar' | 'enviar' | 'excluir-conversa' | 'excluir-mensagem'>()
  const { total: totalNaoLidas, definirTotal, atualizar: atualizarNaoLidas } = useMensagensNaoLidas()
  const [conversas, definirConversas] = useState(conversasIniciais)
  const [selecionada, definirSelecionada] = useState<string | null>(conversasIniciais[0]?.id ?? null)
  const [mensagens, definirMensagens] = useState<MensagemItem[]>([])
  const [texto, definirTexto] = useState('')
  const [novaAssunto, definirNovaAssunto] = useState('')
  const [novaEmpresa, definirNovaEmpresa] = useState('')
  const [carregandoMsgs, definirCarregandoMsgs] = useState(false)
  const [excluirConversaId, definirExcluirConversaId] = useState<string | null>(null)
  const [excluirMensagemId, definirExcluirMensagemId] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const porId = new Map<string, ConversaItem>()
    for (const c of conversasIniciais) porId.set(c.id, c)
    definirConversas((atuais) => {
      for (const c of atuais) {
        if (!porId.has(c.id)) porId.set(c.id, c)
      }
      return [...porId.values()].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
    })
  }, [conversasIniciais])

  useEffect(() => {
    if (!selecionada) return
    void carregarMensagens(selecionada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens.length, selecionada])

  useEffect(() => {
    if (!selecionada) return
    const id = window.setInterval(() => {
      void listarMensagens(selecionada).then((lista) => {
        definirMensagens(lista as MensagemItem[])
      })
    }, 12000)
    return () => window.clearInterval(id)
  }, [selecionada])

  useEffect(() => {
    const id = window.setInterval(() => {
      void listarConversas().then((r) => {
        if (!r.conversas) return
        definirConversas((atuais) => {
          const porId = new Map(r.conversas.map((c) => [c.id, c]))
          const idsServidor = new Set(porId.keys())
          const mescladas = atuais
            .filter((c) => idsServidor.has(c.id))
            .map((c) => {
              const nova = porId.get(c.id)!
              return {
                ...c,
                atualizado_em: nova.atualizado_em,
                nao_lidas: selecionada === c.id ? 0 : (nova.nao_lidas ?? 0),
              }
            })
          for (const c of r.conversas) {
            if (!mescladas.some((m) => m.id === c.id)) {
              mescladas.push({
                id: c.id,
                assunto: c.assunto,
                atualizado_em: c.atualizado_em,
                empresa_id: c.empresa_id,
                empresas: c.empresas as { nome_fantasia: string } | null,
                nao_lidas: selecionada === c.id ? 0 : (c.nao_lidas ?? 0),
              })
            }
          }
          return mescladas.sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
        })
      })
      void atualizarNaoLidas()
    }, 20000)
    return () => window.clearInterval(id)
  }, [selecionada, atualizarNaoLidas])

  async function carregarMensagens(conversaId: string) {
    const anteriores = conversas.find((c) => c.id === conversaId)?.nao_lidas ?? 0
    definirSelecionada(conversaId)
    definirExcluirMensagemId(null)
    definirExcluirConversaId(null)
    definirCarregandoMsgs(true)

    if (anteriores > 0) {
      definirConversas((lista) =>
        lista.map((c) => (c.id === conversaId ? { ...c, nao_lidas: 0 } : c)),
      )
      definirTotal(Math.max(0, totalNaoLidas - anteriores))
    }

    try {
      const lista = await listarMensagens(conversaId)
      definirMensagens(lista as MensagemItem[])
      await atualizarNaoLidas()
    } finally {
      definirCarregandoMsgs(false)
    }
  }

  function aoEnviar() {
    if (!selecionada || !texto.trim()) return
    const corpo = texto.trim()
    const conversaId = selecionada
    definirTexto('')

    void executar('enviar', async () => {
      const resultado = await enviarMensagem(conversaId, corpo)
      if (resultado.erro) {
        definirTexto(corpo)
        toast.error(resultado.erro)
        return
      }

      if (resultado.mensagem) {
        definirMensagens((lista) => [...lista, resultado.mensagem as MensagemItem])
      } else {
        const lista = await listarMensagens(conversaId)
        definirMensagens(lista as MensagemItem[])
      }

      definirConversas((lista) =>
        lista
          .map((c) =>
            c.id === conversaId
              ? { ...c, atualizado_em: new Date().toISOString() }
              : c,
          )
          .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em)),
      )
    })
  }

  function criarNova() {
    if (!novaAssunto.trim()) { toast.error('Informe o assunto.'); return }
    if (modoAdmin && !novaEmpresa) { toast.error('Selecione a empresa.'); return }

    void executar('criar', async () => {
      const resultado = await criarConversa(novaAssunto, novaEmpresa || undefined)
      if (resultado.erro) { toast.error(resultado.erro); return }

      const criada = resultado.conversa
      if (criada) {
        const empresaNome =
          criada.empresas?.nome_fantasia
          ?? empresas.find((e) => e.id === novaEmpresa)?.nome_fantasia
          ?? null

        const item: ConversaItem = {
          ...criada,
          nao_lidas: 0,
          empresas: criada.empresas ?? (empresaNome ? { nome_fantasia: empresaNome } : null),
        }

        definirConversas((lista) => [item, ...lista.filter((c) => c.id !== item.id)])
        definirSelecionada(item.id)
        definirMensagens([])
      }

      toast.success('Conversa criada.')
      definirNovaAssunto('')
      definirNovaEmpresa('')
    })
  }

  function confirmarExcluirConversa(conversaId: string) {
    void executar('excluir-conversa', async () => {
      const resultado = await excluirConversa(conversaId)
      if (resultado.erro) {
        toast.error(resultado.erro)
        return
      }

      const restantes = conversas.filter((c) => c.id !== conversaId)
      definirConversas(restantes)
      definirExcluirConversaId(null)

      if (selecionada === conversaId) {
        const proxima = restantes[0]?.id ?? null
        definirSelecionada(proxima)
        definirMensagens([])
        if (proxima) void carregarMensagens(proxima)
      }

      await atualizarNaoLidas()
      toast.success('Conversa excluída.')
    })
  }

  function confirmarExcluirMensagem(mensagemId: string) {
    void executar('excluir-mensagem', async () => {
      const resultado = await excluirMensagem(mensagemId)
      if (resultado.erro) {
        toast.error(resultado.erro)
        return
      }

      definirMensagens((lista) => lista.filter((m) => m.id !== mensagemId))
      definirExcluirMensagemId(null)
      await atualizarNaoLidas()
      toast.success('Mensagem excluída.')
    })
  }

  const conversaAtual = conversas.find((c) => c.id === selecionada)

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Mensagens"
        descricao={
          modoAdmin
            ? 'Conversas com as empresas.'
            : 'Fale com a equipe VIGMED.'
        }
      />

      {modoAdmin && (
        <RevelarScroll>
          <div className="painel-nova-conversa">
            <div className="painel-campo" style={{ flex: 1, minWidth: 160 }}>
              <label className="painel-label">Nova conversa</label>
              <input
                className="painel-input"
                placeholder="Assunto da conversa..."
                value={novaAssunto}
                onChange={(e) => definirNovaAssunto(e.target.value)}
              />
            </div>
            <div className="painel-campo" style={{ minWidth: 180 }}>
              <label className="painel-label">Empresa</label>
              <select
                className="painel-select"
                style={{ width: '100%' }}
                value={novaEmpresa}
                onChange={(e) => definirNovaEmpresa(e.target.value)}
              >
                <option value="">Selecione...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                ))}
              </select>
            </div>
            <div style={{ paddingTop: '1.1rem' }}>
              <Button variant="primary" size="sm" onClick={criarNova} loading={pendente('criar')}>
                <Plus size={14} />
                Criar
              </Button>
            </div>
          </div>
        </RevelarScroll>
      )}

      <RevelarScroll atraso={0.06}>
        <div className={cn('painel-chat', !modoAdmin && 'painel-chat--empresa')}>
          <aside className="painel-chat-lista">
            <div className="painel-chat-lista-topo">
              <span>Conversas</span>
              <span className="painel-chat-lista-contagem">{conversas.length}</span>
            </div>
            <div className="painel-chat-lista-corpo">
              {conversas.map((c) => {
                const naoLidas = c.nao_lidas ?? 0
                const ativa = selecionada === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void carregarMensagens(c.id)}
                    className={cn(
                      'painel-chat-item',
                      ativa && 'painel-chat-item--ativo',
                      naoLidas > 0 && 'painel-chat-item--nao-lido',
                    )}
                  >
                    <div className="painel-chat-item-corpo">
                      <div className="painel-chat-item-topo">
                        <p className="painel-chat-item-assunto">
                          {c.assunto ?? 'Sem assunto'}
                        </p>
                        {naoLidas > 0 ? (
                          <span className="painel-chat-badge" aria-label={`${naoLidas} não lidas`}>
                            {naoLidas > 99 ? '99+' : naoLidas}
                          </span>
                        ) : (
                          <span className="painel-chat-item-hora">
                            {formatarDataHora(c.atualizado_em)}
                          </span>
                        )}
                      </div>
                      {modoAdmin && c.empresas?.nome_fantasia && (
                        <p className="painel-chat-item-empresa">{c.empresas.nome_fantasia}</p>
                      )}
                    </div>
                  </button>
                )
              })}
              {conversas.length === 0 && (
                <p className="painel-chat-vazio">Nenhuma conversa ainda.</p>
              )}
            </div>
          </aside>

          <section className="painel-chat-thread">
            {conversaAtual ? (
              <>
                <header className="painel-chat-cabecalho">
                  <div className="painel-chat-cabecalho-texto">
                    <p className="painel-chat-cabecalho-titulo">{conversaAtual.assunto}</p>
                    {modoAdmin && conversaAtual.empresas?.nome_fantasia && (
                      <p className="painel-chat-cabecalho-sub">
                        {conversaAtual.empresas.nome_fantasia}
                      </p>
                    )}
                  </div>
                  {modoAdmin && (
                    <ConfirmacaoExclusaoInline
                      ariaLabel="Excluir conversa"
                      compacta
                      rotuloConfirmar="Excluir conversa?"
                      confirmando={excluirConversaId === conversaAtual.id}
                      desabilitado={pendente('excluir-conversa')}
                      onPedir={() => {
                        definirExcluirMensagemId(null)
                        definirExcluirConversaId(conversaAtual.id)
                      }}
                      onConfirmar={() => confirmarExcluirConversa(conversaAtual.id)}
                      onCancelar={() => definirExcluirConversaId(null)}
                    />
                  )}
                </header>

                <div className="painel-chat-mensagens">
                  {carregandoMsgs && (
                    <p className="painel-chat-vazio">Carregando...</p>
                  )}
                  {!carregandoMsgs && mensagens.length === 0 && (
                    <p className="painel-chat-vazio">
                      Nenhuma mensagem ainda. Envie a primeira.
                    </p>
                  )}
                  {mensagens.map((m) => {
                    const propria = m.remetente_id === perfilId
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'painel-chat-msg',
                          propria && 'painel-chat-msg--minha',
                          excluirMensagemId === m.id && 'painel-chat-msg--excluindo',
                        )}
                      >
                        <div className="painel-chat-msg-bloco">
                          {!propria && (
                            <span className="painel-chat-msg-autor">
                              {m.perfis?.nome_completo ?? 'VIGMED'}
                            </span>
                          )}
                          <div
                            className={cn(
                              'painel-chat-bolha',
                              propria ? 'painel-chat-bolha--minha' : 'painel-chat-bolha--deles',
                            )}
                          >
                            <p className="painel-chat-bolha-texto">{m.corpo}</p>
                            <span className="painel-chat-meta">
                              {formatarDataHora(m.criado_em)}
                              {propria && (
                                <span
                                  className={cn('painel-chat-check', m.lida && 'painel-chat-check--lida')}
                                  title={m.lida ? 'Visualizada' : 'Enviada'}
                                  aria-label={m.lida ? 'Visualizada' : 'Enviada'}
                                >
                                  {m.lida
                                    ? <CheckCheck size={13} strokeWidth={2.4} />
                                    : <Check size={13} strokeWidth={2.4} />}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        {modoAdmin && (
                          <div className="painel-chat-msg-acoes">
                            <ConfirmacaoExclusaoInline
                              ariaLabel="Excluir mensagem"
                              compacta
                              confirmando={excluirMensagemId === m.id}
                              desabilitado={pendente('excluir-mensagem')}
                              onPedir={() => {
                                definirExcluirConversaId(null)
                                definirExcluirMensagemId(m.id)
                              }}
                              onConfirmar={() => confirmarExcluirMensagem(m.id)}
                              onCancelar={() => definirExcluirMensagemId(null)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={fimRef} />
                </div>

                <footer className="painel-chat-composer">
                  <input
                    className="painel-chat-input"
                    placeholder="Escreva uma mensagem..."
                    value={texto}
                    onChange={(e) => definirTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        aoEnviar()
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={aoEnviar}
                    loading={pendente('enviar')}
                    disabled={!texto.trim() || pendente('enviar')}
                    aria-label="Enviar mensagem"
                  >
                    <Send size={14} />
                  </Button>
                </footer>
              </>
            ) : (
              <div className="painel-chat-placeholder">
                <MessageSquare size={28} strokeWidth={1.5} />
                <p>
                  {conversas.length === 0
                    ? (modoAdmin ? 'Crie uma conversa para começar.' : 'Nenhuma conversa no momento.')
                    : 'Selecione uma conversa'}
                </p>
              </div>
            )}
          </section>
        </div>
      </RevelarScroll>
    </SecaoPainel>
  )
}
