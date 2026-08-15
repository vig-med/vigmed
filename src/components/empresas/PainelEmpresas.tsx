'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ChevronDown, ChevronUp, FolderOpen, Plus, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { Badge, Button, Input } from '@/components/ui'
import { salvarEmpresa } from '@/lib/empresas/acoes'
import { hrefPublico, ROTAS } from '@/lib/rotas'
import type { ConsumoArmazenamentoEmpresa, TotaisArmazenamentoPlataforma } from '@/lib/documentos/armazenamento'
import { cn, formatarBytes, formatarCnpj } from '@/lib/utils'
import type { Empresa, StatusEmpresa } from '@/types'

const FILTROS_STATUS: { id: StatusEmpresa | 'todos'; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'ativo', rotulo: 'Ativo' },
  { id: 'inativo', rotulo: 'Inativo' },
  { id: 'suspenso', rotulo: 'Suspenso' },
]

const ROTULO_STATUS: Record<StatusEmpresa, { rotulo: string; variant: 'success' | 'default' | 'danger' }> = {
  ativo: { rotulo: 'Ativo', variant: 'success' },
  inativo: { rotulo: 'Inativo', variant: 'default' },
  suspenso: { rotulo: 'Suspenso', variant: 'danger' },
}

const FORM_VAZIO = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  email: '',
  telefone: '',
  responsavel: '',
  status: 'ativo' as StatusEmpresa,
}

interface Props {
  empresasIniciais: Empresa[]
  consumoPorEmpresa: Record<string, ConsumoArmazenamentoEmpresa>
  totaisArmazenamento: TotaisArmazenamentoPlataforma
}

export function PainelEmpresas({ empresasIniciais, consumoPorEmpresa, totaisArmazenamento }: Props) {
  const router = useRouter()
  const [busca, definirBusca] = useState('')
  const [statusFiltro, definirStatusFiltro] = useState<StatusEmpresa | 'todos'>('todos')
  const [criando, definirCriando] = useState(false)
  const [expandido, definirExpandido] = useState<string | null>(null)
  const [pendente, iniciarTransicao] = useTransition()
  const [form, definirForm] = useState(FORM_VAZIO)

  const empresas = useMemo(() => {
    return empresasIniciais.filter((e) => {
      if (statusFiltro !== 'todos' && e.status !== statusFiltro) return false
      if (!busca.trim()) return true
      const termo = busca.toLowerCase()
      return (
        e.nome_fantasia.toLowerCase().includes(termo) ||
        e.razao_social.toLowerCase().includes(termo) ||
        e.cnpj.includes(termo.replace(/\D/g, ''))
      )
    })
  }, [empresasIniciais, busca, statusFiltro])

  function abrirNova() {
    definirForm(FORM_VAZIO)
    definirCriando(true)
  }

  function fecharNova() {
    definirCriando(false)
    definirForm(FORM_VAZIO)
  }

  function aoSalvar(e: React.FormEvent) {
    e.preventDefault()
    iniciarTransicao(async () => {
      const resultado = await salvarEmpresa({ ...form })
      if (resultado.erro) { toast.error(resultado.erro); return }
      toast.success('Empresa criada.')
      fecharNova()
      if (resultado.id) router.push(hrefPublico(ROTAS.adm.empresa(resultado.id)))
      else router.refresh()
    })
  }

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Empresas"
        descricao="Clientes e consumo de armazenamento."
        acoes={
          criando ? (
            <Button variant="ghost" size="sm" onClick={fecharNova}>
              <X size={15} />
              Fechar
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={abrirNova}>
              <Plus size={15} />
              Nova empresa
            </Button>
          )
        }
      />

      {criando && (
        <RevelarScroll>
          <form onSubmit={aoSalvar} className="painel-form-lateral mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-(--color-text-2)" />
              <span className="painel-form-titulo">Nova empresa</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Razão social"
                value={form.razaoSocial}
                onChange={(e) => definirForm({ ...form, razaoSocial: e.target.value })}
                placeholder="Razão social Ltda"
                required
              />
              <Input
                label="Nome fantasia"
                value={form.nomeFantasia}
                onChange={(e) => definirForm({ ...form, nomeFantasia: e.target.value })}
                placeholder="Nome comercial"
                required
              />
              <Input
                label="CNPJ"
                value={form.cnpj}
                onChange={(e) => definirForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                required
              />
              <Input
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => definirForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
              <Input
                label="Telefone"
                value={form.telefone}
                onChange={(e) => definirForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="Responsável"
                value={form.responsavel}
                onChange={(e) => definirForm({ ...form, responsavel: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={fecharNova} disabled={pendente}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={pendente}>
                <Plus size={14} />
                Criar empresa
              </Button>
            </div>
          </form>
        </RevelarScroll>
      )}

      <RevelarScroll>
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <p className="text-xs text-(--color-text-3) uppercase tracking-wide">VIGMED (admin)</p>
            <p className="mt-1 text-lg font-semibold">{formatarBytes(totaisArmazenamento.vigmed)}</p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <p className="text-xs text-(--color-text-3) uppercase tracking-wide">Cota empresas</p>
            <p className="mt-1 text-lg font-semibold">{formatarBytes(totaisArmazenamento.empresa)}</p>
            <p className="text-xs text-(--color-text-3)">de {formatarBytes(totaisArmazenamento.limiteEmpresas)}</p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <p className="text-xs text-(--color-text-3) uppercase tracking-wide">Total</p>
            <p className="mt-1 text-lg font-semibold">{formatarBytes(totaisArmazenamento.total)}</p>
          </div>
        </div>
      </RevelarScroll>

      <RevelarScroll>
        <div className="painel-filtros">
          <div className="painel-busca" style={{ minWidth: 180 }}>
            <Search size={13} className="painel-busca-icone" />
            <input
              className="painel-busca-input"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => definirBusca(e.target.value)}
            />
          </div>
          <div className="painel-pilulas">
            {FILTROS_STATUS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => definirStatusFiltro(f.id)}
                className={cn('painel-pilula', statusFiltro === f.id && 'painel-pilula--ativo')}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.06}>
        <div className="painel-tabela-wrap">
          <div className="overflow-x-auto">
            <table className="painel-tabela">
              <thead className="painel-tabela-thead">
                <tr>
                  <th className="w-8"></th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th className="text-right">Uso</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="painel-tabela-tbody">
                {empresas.map((empresa) => {
                  const status = ROTULO_STATUS[empresa.status]
                  const consumo = consumoPorEmpresa[empresa.id] ?? {
                    empresaId: empresa.id, total: empresa.armazenamento_usado,
                    vigmed: empresa.armazenamento_usado, empresa: 0,
                  }
                  const pct = empresa.armazenamento_limite
                    ? Math.min((consumo.empresa / empresa.armazenamento_limite) * 100, 100)
                    : 0
                  const aberto = expandido === empresa.id
                  return (
                    <Fragment key={empresa.id}>
                      <tr className={cn(empresa.status === 'inativo' && 'opacity-60', aberto && 'border-l-2 border-l-(--color-accent)')}>
                        <td>
                          <button
                            type="button"
                            className="tabela-acao"
                            onClick={() => definirExpandido(aberto ? null : empresa.id)}
                            aria-label={aberto ? 'Recolher' : 'Expandir'}
                          >
                            {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td>
                          <span className="tabela-nome">{empresa.nome_fantasia}</span>
                          <span className="tabela-sub">{formatarCnpj(empresa.cnpj)}</span>
                        </td>
                        <td>
                          <Badge variant={status.variant} className="text-[10px] py-0">{status.rotulo}</Badge>
                        </td>
                        <td className="text-right">
                          <span className="tabela-mono text-xs">{formatarBytes(consumo.total)}</span>
                          <div className="barra-uso mt-1 ml-auto max-w-[6rem]">
                            <div className={cn('barra-uso-fill', pct >= 90 && 'barra-uso-fill--alerta')} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Link href={hrefPublico(ROTAS.adm.empresa(empresa.id))} className="tabela-acao" title="Editar">
                              <Building2 size={13} />
                            </Link>
                            <Link href={hrefPublico(ROTAS.adm.empresaDocumentos(empresa.id))} className="tabela-acao" title="Documentos">
                              <FolderOpen size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td colSpan={5} className="bg-(--color-surface-2)/50 px-4 py-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                              <div>
                                <p className="text-xs text-(--color-text-3)">Razão social</p>
                                <p>{empresa.razao_social}</p>
                              </div>
                              <div>
                                <p className="text-xs text-(--color-text-3)">E-mail</p>
                                <p>{empresa.email || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-(--color-text-3)">Telefone</p>
                                <p>{empresa.telefone || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-(--color-text-3)">Responsável</p>
                                <p>{empresa.responsavel || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-(--color-text-3)">VIGMED</p>
                                <p className="tabela-mono">{formatarBytes(consumo.vigmed)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-(--color-text-3)">Enviado pela empresa</p>
                                <p className="tabela-mono">{formatarBytes(consumo.empresa)} / {formatarBytes(empresa.armazenamento_limite)}</p>
                              </div>
                              <div className="sm:col-span-2 flex flex-wrap gap-2 items-end">
                                <Button variant="outline" size="sm" render={<Link href={hrefPublico(ROTAS.adm.empresa(empresa.id))} />}>
                                  Gerenciar
                                </Button>
                                <Button variant="ghost" size="sm" render={<Link href={hrefPublico(ROTAS.adm.empresaDocumentos(empresa.id))} />}>
                                  Documentos
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {empresas.length === 0 && (
            <div className="painel-vazio">
              <Building2 size={22} style={{ opacity: 0.35 }} />
              Nenhuma empresa encontrada.
            </div>
          )}
        </div>
      </RevelarScroll>
    </SecaoPainel>
  )
}
