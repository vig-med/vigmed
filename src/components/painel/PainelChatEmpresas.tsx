'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCheck, Search, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar, Button } from '@/components/ui'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { useMensagensNaoLidas } from '@/contexts/MensagensNaoLidasContext'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import {
  enviarMensagem,
  garantirConversaEmpresa,
  listarMensagens,
} from '@/lib/mensagens/acoes'
import { cn, formatarDataHora } from '@/lib/utils'

interface EmpresaItem {
  id: string
  nome_fantasia: string
}

interface ConversaItem {
  id: string
  empresa_id: string
  assunto: string | null
  atualizado_em: string
  nao_lidas?: number
  mensagens?: { corpo: string; criado_em: string; remetente_id: string }[]
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
  empresas: EmpresaItem[]
  conversas: ConversaItem[]
  perfilId: string
}

export function PainelChatEmpresas({ empresas, conversas, perfilId }: Props) {
  const [busca, definirBusca] = useState('')
  const { pendente, executar } = useAcaoPendente<'enviar'>()
  const { total: totalNaoLidas, definirTotal, atualizar: atualizarNaoLidas } = useMensagensNaoLidas()
  const [empresaSelecionada, definirEmpresaSelecionada] = useState<string | null>(
    empresas[0]?.id ?? null,
  )
  const [mensagens, definirMensagens] = useState<MensagemItem[]>([])
  const [texto, definirTexto] = useState('')
  const [conversaAtiva, definirConversaAtiva] = useState<string | null>(null)
  const [carregandoChat, definirCarregandoChat] = useState(false)
  const [naoLidasLocal, definirNaoLidasLocal] = useState<Record<string, number>>(() => {
    const mapa: Record<string, number> = {}
    for (const c of conversas) {
      if (!mapa[c.empresa_id]) mapa[c.empresa_id] = c.nao_lidas ?? 0
    }
    return mapa
  })

  const conversasPorEmpresa = useMemo(() => {
    const mapa = new Map<string, ConversaItem>()
    for (const c of conversas) {
      if (!mapa.has(c.empresa_id)) mapa.set(c.empresa_id, c)
    }
    return mapa
  }, [conversas])

  useEffect(() => {
    const mapa: Record<string, number> = {}
    for (const c of conversas) {
      if (!mapa[c.empresa_id]) mapa[c.empresa_id] = c.nao_lidas ?? 0
    }
    definirNaoLidasLocal(mapa)
  }, [conversas])

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return empresas
    return empresas.filter((e) => e.nome_fantasia.toLowerCase().includes(termo))
  }, [busca, empresas])

  const empresaAtual = empresas.find((e) => e.id === empresaSelecionada)

  useEffect(() => {
    if (empresaSelecionada) void abrirEmpresa(empresaSelecionada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!conversaAtiva) return
    const id = window.setInterval(() => {
      void listarMensagens(conversaAtiva).then((lista) => {
        definirMensagens(lista as MensagemItem[])
      })
    }, 12000)
    return () => window.clearInterval(id)
  }, [conversaAtiva])

  async function abrirEmpresa(empresaId: string) {
    definirEmpresaSelecionada(empresaId)
    definirCarregandoChat(true)
    definirMensagens([])

    const anteriores = naoLidasLocal[empresaId] ?? 0
    if (anteriores > 0) {
      definirNaoLidasLocal((m) => ({ ...m, [empresaId]: 0 }))
      definirTotal(Math.max(0, totalNaoLidas - anteriores))
    }

    const conversa = conversasPorEmpresa.get(empresaId)
    if (conversa) {
      definirConversaAtiva(conversa.id)
      const lista = await listarMensagens(conversa.id)
      definirMensagens(lista as MensagemItem[])
      await atualizarNaoLidas()
    } else {
      definirConversaAtiva(null)
    }

    definirCarregandoChat(false)
  }

  function aoEnviar() {
    if (!empresaSelecionada || !texto.trim()) return
    const corpo = texto.trim()
    definirTexto('')

    void executar('enviar', async () => {
      let conversaId = conversaAtiva

      if (!conversaId) {
        const criada = await garantirConversaEmpresa(empresaSelecionada)
        if (criada.erro || !criada.conversaId) {
          definirTexto(corpo)
          toast.error(criada.erro ?? 'Não foi possível iniciar a conversa.')
          return
        }
        conversaId = criada.conversaId
        definirConversaAtiva(conversaId)
      }

      if (!conversaId) return

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
    })
  }

  const ultimaMensagem = (empresaId: string) => {
    const conversa = conversasPorEmpresa.get(empresaId)
    const msg = conversa?.mensagens?.[conversa.mensagens.length - 1]
    return msg
  }

  return (
    <RevelarScroll>
      <div className="painel-messenger">
        {/* Lista de empresas */}
        <aside className="painel-messenger-lista">
          <div className="painel-messenger-lista-topo">
            <p className="painel-messenger-titulo">Empresas</p>
            <div className="painel-busca">
              <Search size={13} className="painel-busca-icone" />
              <input
                className="painel-busca-input"
                placeholder="Buscar empresa..."
                value={busca}
                onChange={(e) => definirBusca(e.target.value)}
              />
            </div>
          </div>

          <ul className="painel-messenger-empresas">
            {empresasFiltradas.map((empresa) => {
              const preview = ultimaMensagem(empresa.id)
              const ativa = empresaSelecionada === empresa.id
              const naoLidas = naoLidasLocal[empresa.id] ?? 0

              return (
                <li key={empresa.id}>
                  <button
                    type="button"
                    className={cn(
                      'painel-messenger-empresa',
                      ativa && 'painel-messenger-empresa--ativa',
                      naoLidas > 0 && 'painel-messenger-empresa--nao-lida',
                    )}
                    onClick={() => void abrirEmpresa(empresa.id)}
                  >
                    <Avatar name={empresa.nome_fantasia} size="sm" />
                    <div className="painel-messenger-empresa-corpo">
                      <div className="painel-messenger-empresa-linha">
                        <span className="painel-messenger-empresa-nome">{empresa.nome_fantasia}</span>
                        {naoLidas > 0 ? (
                          <span className="painel-chat-badge" aria-label={`${naoLidas} não lidas`}>
                            {naoLidas > 99 ? '99+' : naoLidas}
                          </span>
                        ) : preview ? (
                          <span className="painel-messenger-empresa-hora">
                            {formatarDataHora(preview.criado_em)}
                          </span>
                        ) : null}
                      </div>
                      <p className="painel-messenger-empresa-preview">
                        {preview?.corpo ?? 'Toque para enviar mensagem'}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
            {empresasFiltradas.length === 0 && (
              <li className="painel-vazio" style={{ padding: '2rem 1rem' }}>
                Nenhuma empresa encontrada.
              </li>
            )}
          </ul>
        </aside>

        {/* Área de chat */}
        <section className="painel-messenger-chat">
          {empresaAtual ? (
            <>
              <header className="painel-messenger-chat-topo">
                <Avatar name={empresaAtual.nome_fantasia} size="sm" />
                <div>
                  <p className="painel-messenger-chat-nome">{empresaAtual.nome_fantasia}</p>
                  <p className="painel-messenger-chat-sub">Mensagens com a empresa</p>
                </div>
              </header>

              <div className="painel-messenger-mensagens">
                {carregandoChat && (
                  <p className="painel-messenger-vazio">Carregando...</p>
                )}
                {!carregandoChat && mensagens.length === 0 && (
                  <p className="painel-messenger-vazio">
                    Nenhuma mensagem ainda. Escreva abaixo para iniciar.
                  </p>
                )}
                {mensagens.map((m) => {
                  const propria = m.remetente_id === perfilId
                  return (
                    <div
                      key={m.id}
                      className={cn('painel-messenger-linha', propria && 'painel-messenger-linha--minha')}
                    >
                      {!propria && <Avatar name={m.perfis?.nome_completo ?? '?'} size="sm" />}
                      <div
                        className={cn(
                          'painel-chat-bolha',
                          propria ? 'painel-chat-bolha--minha' : 'painel-chat-bolha--deles',
                        )}
                      >
                        {m.corpo}
                        <span className="painel-chat-meta">
                          <time className="painel-messenger-hora">{formatarDataHora(m.criado_em)}</time>
                          {propria && (
                            <span
                              className={cn('painel-chat-check', m.lida && 'painel-chat-check--lida')}
                              title={m.lida ? 'Visualizada' : 'Enviada'}
                              aria-label={m.lida ? 'Visualizada' : 'Enviada'}
                            >
                              {m.lida ? <CheckCheck size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <footer className="painel-messenger-composer">
                <input
                  className="painel-chat-input"
                  placeholder={`Mensagem para ${empresaAtual.nome_fantasia}...`}
                  value={texto}
                  onChange={(e) => definirTexto(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && aoEnviar()}
                />
                <Button variant="primary" size="sm" onClick={aoEnviar} loading={pendente('enviar')} disabled={!texto.trim() || pendente('enviar')}>
                  <Send size={14} />
                </Button>
              </footer>
            </>
          ) : (
            <div className="painel-messenger-placeholder">
              <p>Selecione uma empresa para conversar.</p>
            </div>
          )}
        </section>
      </div>
    </RevelarScroll>
  )
}
