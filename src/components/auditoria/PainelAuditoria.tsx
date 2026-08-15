'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarRange, ChevronDown, ChevronUp, Download, Search, Shield, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { Button } from '@/components/ui'
import { listarAuditoriaParaExportacao, type RegistroAuditoria } from '@/lib/auditoria/acoes'
import { hrefPublico, ROTAS } from '@/lib/rotas'
import { cn, formatarData, formatarDataHora } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  registros: RegistroAuditoria[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
  dataInicio?: string
  dataFim?: string
  acaoInicial?: string
  buscaInicial?: string
}

const ACOES_FILTRO = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'login', rotulo: 'Login' },
  { valor: 'download', rotulo: 'Download' },
  { valor: 'envio', rotulo: 'Upload' },
  { valor: 'exclusao', rotulo: 'Exclusão' },
  { valor: 'criacao_empresa', rotulo: 'Empresa' },
  { valor: 'criacao_usuario', rotulo: 'Pessoas' },
]

function montarLinhasXlsx(registros: RegistroAuditoria[]) {
  return registros.map((r) => ({
    'Data / Hora': formatarDataHora(r.criado_em),
    Evento: r.acao,
    Usuario: r.perfis?.email ?? '',
    Nome: r.perfis?.nome_completo ?? '',
    Empresa: r.empresas?.nome_fantasia ?? '',
    IP: r.endereco_ip ?? '',
    Recurso: r.recurso ?? '',
    'ID do recurso': r.recurso_id ?? '',
    Detalhes: r.detalhes ? JSON.stringify(r.detalhes) : '',
  }))
}

function formatarDiaCurto(iso: string) {
  try {
    return formatarData(new Date(`${iso}T12:00:00`).toISOString())
  } catch {
    return iso
  }
}

export function PainelAuditoria({
  registros,
  total,
  pagina,
  porPagina,
  totalPaginas,
  dataInicio: dataInicioProp = '',
  dataFim: dataFimProp = '',
  acaoInicial = '',
  buscaInicial = '',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busca, definirBusca] = useState(buscaInicial)
  const [acaoFiltro, definirAcaoFiltro] = useState(acaoInicial)
  const [dataInicio, definirDataInicio] = useState(dataInicioProp)
  const [dataFim, definirDataFim] = useState(dataFimProp)
  const [expandido, definirExpandido] = useState<string | null>(null)
  const [exportando, iniciarExport] = useTransition()

  const rotuloAcao = ACOES_FILTRO.find((a) => a.valor === acaoFiltro)?.rotulo ?? 'Todos'

  const filtrosAtivos = useMemo(() => {
    const itens: { id: string; rotulo: string }[] = []
    if (busca.trim()) itens.push({ id: 'busca', rotulo: `Busca: ${busca.trim()}` })
    if (dataInicio || dataFim) {
      const de = dataInicio ? formatarDiaCurto(dataInicio) : '…'
      const ate = dataFim ? formatarDiaCurto(dataFim) : '…'
      itens.push({ id: 'periodo', rotulo: `${de} → ${ate}` })
    }
    if (acaoFiltro) itens.push({ id: 'acao', rotulo: rotuloAcao })
    return itens
  }, [busca, dataInicio, dataFim, acaoFiltro, rotuloAcao])

  function navegar(params: URLSearchParams) {
    const qs = params.toString()
    router.push(qs ? `${hrefPublico(ROTAS.adm.auditoria)}?${qs}` : hrefPublico(ROTAS.adm.auditoria))
  }

  function aplicarFiltros(overrides?: {
    busca?: string
    acao?: string
    de?: string
    ate?: string
  }) {
    const params = new URLSearchParams()
    const b = (overrides?.busca ?? busca).trim()
    const a = overrides?.acao ?? acaoFiltro
    const de = overrides?.de ?? dataInicio
    const ate = overrides?.ate ?? dataFim
    if (b) params.set('busca', b)
    if (a) params.set('acao', a)
    if (de) params.set('de', de)
    if (ate) params.set('ate', ate)
    params.set('pagina', '1')
    navegar(params)
  }

  function limparFiltros() {
    definirBusca('')
    definirAcaoFiltro('')
    definirDataInicio('')
    definirDataFim('')
    navegar(new URLSearchParams())
  }

  function removerFiltro(id: string) {
    if (id === 'busca') {
      definirBusca('')
      aplicarFiltros({ busca: '' })
      return
    }
    if (id === 'periodo') {
      definirDataInicio('')
      definirDataFim('')
      aplicarFiltros({ de: '', ate: '' })
      return
    }
    if (id === 'acao') {
      definirAcaoFiltro('')
      aplicarFiltros({ acao: '' })
    }
  }

  function irParaPagina(nova: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pagina', String(nova))
    navegar(params)
  }

  function exportar() {
    iniciarExport(async () => {
      const r = await listarAuditoriaParaExportacao({
        busca: busca.trim() || undefined,
        acao: acaoFiltro || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
      })
      if (r.erro) {
        toast.error(r.erro)
        return
      }
      if (!r.registros.length) {
        toast.error('Nenhum registro para exportar com estes filtros.')
        return
      }
      const planilha = XLSX.utils.json_to_sheet(montarLinhasXlsx(r.registros))
      planilha['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 32 }, { wch: 24 }, { wch: 28 },
        { wch: 16 }, { wch: 16 }, { wch: 36 }, { wch: 48 },
      ]
      const livro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(livro, planilha, 'Auditoria')
      XLSX.writeFile(livro, `auditoria-vigmed-${Date.now()}.xlsx`)
      toast.success(`${r.registros.length} registro(s) exportado(s).`)
    })
  }

  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const fim = Math.min(pagina * porPagina, total)

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Auditoria"
        descricao="Eventos de segurança e ações. Exporte o resultado filtrado completo."
        acoes={
          <Button variant="outline" size="sm" loading={exportando} onClick={exportar}>
            <Download size={14} />
            Exportar XLSX
          </Button>
        }
      />

      <RevelarScroll>
        <div className="auditoria-filtros">
          <div className="auditoria-filtros-linha">
            <div className="painel-campo auditoria-filtros-busca">
              <label className="painel-label" htmlFor="auditoria-busca">Busca</label>
              <div className="painel-busca">
                <Search size={13} className="painel-busca-icone" />
                <input
                  id="auditoria-busca"
                  className="painel-busca-input"
                  placeholder="E-mail, nome ou IP..."
                  value={busca}
                  onChange={(e) => definirBusca(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                />
              </div>
            </div>

            <div className="painel-campo auditoria-filtros-periodo">
              <span className="painel-label">
                <CalendarRange size={11} className="inline-block mr-1 -mt-0.5" />
                Período
              </span>
              <div className="auditoria-filtros-datas">
                <input
                  type="date"
                  className="painel-input"
                  aria-label="Data inicial"
                  value={dataInicio}
                  onChange={(e) => definirDataInicio(e.target.value)}
                />
                <span className="auditoria-filtros-ate" aria-hidden>até</span>
                <input
                  type="date"
                  className="painel-input"
                  aria-label="Data final"
                  value={dataFim}
                  onChange={(e) => definirDataFim(e.target.value)}
                />
              </div>
            </div>

            <div className="auditoria-filtros-acoes">
              <Button variant="primary" size="sm" onClick={() => aplicarFiltros()}>
                Aplicar
              </Button>
              {filtrosAtivos.length > 0 && (
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="auditoria-filtros-tipos">
            <span className="painel-label">Tipo de evento</span>
            <div className="painel-pilulas" role="group" aria-label="Filtrar por tipo de evento">
              {ACOES_FILTRO.map((f) => (
                <button
                  key={f.valor || 'todos'}
                  type="button"
                  onClick={() => {
                    definirAcaoFiltro(f.valor)
                    aplicarFiltros({ acao: f.valor })
                  }}
                  className={cn('painel-pilula', acaoFiltro === f.valor && 'painel-pilula--ativo')}
                  aria-pressed={acaoFiltro === f.valor}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          </div>

          {filtrosAtivos.length > 0 && (
            <div className="auditoria-filtros-ativos">
              <span className="auditoria-filtros-ativos-rotulo">Ativos</span>
              <ul className="auditoria-filtros-chips">
                {filtrosAtivos.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className="auditoria-filtro-chip"
                      onClick={() => removerFiltro(f.id)}
                      title={`Remover ${f.rotulo}`}
                    >
                      <span>{f.rotulo}</span>
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.06}>
        <div className="painel-tabela-wrap">
          <div className="overflow-x-auto">
            <table className="painel-tabela">
              <thead className="painel-tabela-thead">
                <tr>
                  <th>Data / Hora</th>
                  <th>Evento</th>
                  <th>Usuário</th>
                  <th className="hidden md:table-cell">Empresa</th>
                  <th>IP</th>
                  <th className="text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="painel-tabela-tbody">
                {registros.map((r) => {
                  const falha = r.acao.includes('fail') || r.acao === 'bloqueio_usuario'
                  const aberto = expandido === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className={cn(falha && 'bg-(--color-danger-bg)', aberto && 'border-l-2 border-l-(--color-accent)')}>
                        <td className="tabela-mono whitespace-nowrap">{formatarDataHora(r.criado_em)}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={cn('ponto-status', falha ? 'ponto-status--falha' : 'ponto-status--ok')} />
                            <span className="text-[0.8rem] font-semibold tracking-wide">
                              {r.acao.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="text-[0.8rem] text-(--color-text-2)">{r.perfis?.email ?? '-'}</td>
                        <td className="hidden md:table-cell tabela-mono">{r.empresas?.nome_fantasia ?? '-'}</td>
                        <td className={cn('tabela-mono', falha && 'text-(--color-danger)')}>{r.endereco_ip ?? '-'}</td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="tabela-acao mx-auto"
                            onClick={() => definirExpandido(aberto ? null : r.id)}
                          >
                            {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 0.85rem 0.75rem' }}>
                            <pre className="painel-payload">
                              {JSON.stringify(r.detalhes, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {registros.length === 0 ? (
            <div className="painel-vazio">
              <Shield size={22} style={{ opacity: 0.35 }} />
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="painel-tabela-rodape flex flex-wrap items-center justify-between gap-2">
              <span>Mostrando {inicio} a {fim} de {total.toLocaleString('pt-BR')}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => irParaPagina(pagina - 1)}>
                  Anterior
                </Button>
                <span className="text-xs text-(--color-text-3)">Página {pagina} de {totalPaginas || 1}</span>
                <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => irParaPagina(pagina + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </RevelarScroll>
    </SecaoPainel>
  )
}
