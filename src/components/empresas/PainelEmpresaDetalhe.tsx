'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, FolderOpen, Trash2, UserPlus, X } from 'lucide-react'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { Badge, Button, Input } from '@/components/ui'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import { excluirEmpresa, salvarEmpresa } from '@/lib/empresas/acoes'
import { convidarUsuario } from '@/lib/usuarios/acoes'
import { ROTULO_PAPEL } from '@/lib/usuarios/constantes'
import { ROTAS, hrefPublico } from '@/lib/rotas'
import { formatarBytes, formatarCnpj } from '@/lib/utils'
import type { ConsumoArmazenamentoEmpresa } from '@/lib/documentos/armazenamento'
import type { Empresa, PapelUsuario, StatusEmpresa } from '@/types'

interface UsuarioResumo {
  id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  ativo: boolean
  ultimo_login_em: string | null
}

interface ConviteResumo {
  id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  usado_em: string | null
  criado_em: string
}

interface Props {
  empresa: Empresa
  consumo: ConsumoArmazenamentoEmpresa
  perfis: UsuarioResumo[]
  convites: ConviteResumo[]
}

export function PainelEmpresaDetalhe({ empresa, consumo, perfis, convites }: Props) {
  const router = useRouter()
  const { pendente, executar } = useAcaoPendente<'salvar' | 'convidar' | 'excluir'>()
  const [form, definirForm] = useState({
    razaoSocial: empresa.razao_social,
    nomeFantasia: empresa.nome_fantasia,
    cnpj: empresa.cnpj,
    email: empresa.email,
    telefone: empresa.telefone ?? '',
    responsavel: empresa.responsavel ?? '',
    status: empresa.status,
  })
  const [emailConvite, definirEmailConvite] = useState('')
  const [nomeConvite, definirNomeConvite] = useState('')
  const [excluindo, definirExcluindo] = useState<{ tipo: 'empresa'; id: string } | null>(null)

  function salvar() {
    void executar('salvar', async () => {
      const r = await salvarEmpresa({ id: empresa.id, ...form })
      if (r.erro) {
        toast.error(r.erro)
        return
      }
      toast.success('Empresa atualizada.')
      router.refresh()
    })
  }

  function convidar(e: React.FormEvent) {
    e.preventDefault()
    void executar('convidar', async () => {
      const r = await convidarUsuario({
        email: emailConvite,
        nomeCompleto: nomeConvite,
        papel: 'usuario_empresa',
        ambiente: 'docs',
        empresaId: empresa.id,
      })
      if (r.erro) {
        toast.error(r.erro)
        return
      }
      const path = r.linkAtivacao ?? `/cadastro?email=${encodeURIComponent(emailConvite)}`
      const link = `${window.location.origin}${path}`
      try {
        await navigator.clipboard.writeText(link)
        toast.success('E-mail autorizado. Link copiado.')
      } catch {
        toast.success(r.mensagem ?? 'E-mail autorizado.')
      }
      definirEmailConvite('')
      definirNomeConvite('')
      router.refresh()
    })
  }

  function confirmarExclusao() {
    if (!excluindo || excluindo.tipo !== 'empresa') return
    definirExcluindo(null)
    void executar('excluir', async () => {
      const r = await excluirEmpresa(empresa.id)
      if (r.erro) { toast.error(r.erro); return }
      toast.success('Empresa excluída.')
      router.push(hrefPublico(ROTAS.adm.empresas))
    })
  }

  return (
    <SecaoPainel>
      <div className="mb-4">
        <Link
          href={hrefPublico(ROTAS.adm.empresas)}
          className="inline-flex items-center gap-1 text-sm text-(--color-text-3) hover:text-(--color-text-1)"
        >
          <ArrowLeft size={14} />
          Voltar para empresas
        </Link>
      </div>

      <CabecalhoPagina
        titulo={empresa.nome_fantasia}
        descricao={`${formatarCnpj(empresa.cnpj)} · ${formatarBytes(consumo.total)} em arquivos`}
        acoes={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link href={hrefPublico(ROTAS.adm.empresaDocumentos(empresa.id))} />}>
              <FolderOpen size={14} />
              Documentos
            </Button>
            {excluindo?.tipo === 'empresa' ? (
              <div className="inline-flex items-center gap-0.5">
                <Button type="button" variant="ghost" size="sm" className="text-emerald-600" disabled={pendente('excluir')} onClick={confirmarExclusao} aria-label="Confirmar exclusão da empresa">
                  <Check size={15} />
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={pendente('excluir')} onClick={() => definirExcluindo(null)} aria-label="Cancelar">
                  <X size={15} />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-(--color-danger)" disabled={pendente('excluir')} onClick={() => definirExcluindo({ tipo: 'empresa', id: empresa.id })}>
                <Trash2 size={14} />
                Excluir
              </Button>
            )}
          </div>
        }
      />

      <RevelarScroll>
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <p className="text-xs text-(--color-text-3)">VIGMED</p>
            <p className="text-lg font-semibold">{formatarBytes(consumo.vigmed)}</p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <p className="text-xs text-(--color-text-3)">Enviado pela empresa</p>
            <p className="text-lg font-semibold">{formatarBytes(consumo.empresa)}</p>
          </div>
          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <p className="text-xs text-(--color-text-3)">Cota</p>
            <p className="text-lg font-semibold">{formatarBytes(empresa.armazenamento_limite)}</p>
          </div>
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.04}>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">Dados da empresa</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Razão social" value={form.razaoSocial} onChange={(e) => definirForm({ ...form, razaoSocial: e.target.value })} />
            <Input label="Nome fantasia" value={form.nomeFantasia} onChange={(e) => definirForm({ ...form, nomeFantasia: e.target.value })} />
            <Input label="CNPJ" value={form.cnpj} onChange={(e) => definirForm({ ...form, cnpj: e.target.value })} />
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => definirForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.telefone} onChange={(e) => definirForm({ ...form, telefone: e.target.value })} />
            <Input label="Responsável" value={form.responsavel} onChange={(e) => definirForm({ ...form, responsavel: e.target.value })} />
            <div className="painel-campo sm:col-span-2">
              <label className="painel-label">Status</label>
              <select
                className="painel-select w-full"
                value={form.status}
                onChange={(e) => definirForm({ ...form, status: e.target.value as StatusEmpresa })}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="suspenso">Suspenso</option>
              </select>
            </div>
          </div>
          <Button variant="primary" size="sm" className="mt-3" loading={pendente('salvar')} onClick={salvar}>
            Salvar alterações
          </Button>
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.08}>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus size={15} />
              Pessoas ({perfis.length} contas · {convites.filter((c) => !c.usado_em).length} pendentes)
            </h2>
            <Button variant="outline" size="sm" render={<Link href={hrefPublico(ROTAS.adm.usuarios)} />}>
              Abrir Pessoas
            </Button>
          </div>

          <form onSubmit={convidar} className="grid gap-2 sm:grid-cols-3 mb-3">
            <Input label="E-mail" type="email" value={emailConvite} onChange={(e) => definirEmailConvite(e.target.value)} required />
            <Input label="Nome" value={nomeConvite} onChange={(e) => definirNomeConvite(e.target.value)} />
            <div className="flex items-end">
              <Button type="submit" variant="outline" size="sm" loading={pendente('convidar')} className="w-full sm:w-auto">
                Autorizar e copiar link
              </Button>
            </div>
          </form>

          <ul className="divide-y divide-(--color-border) text-sm">
            {perfis.slice(0, 5).map((p) => (
              <li key={p.id} className="py-2 flex justify-between gap-2">
                <span className="truncate">{p.nome_completo || p.email}</span>
                <span className="text-xs text-(--color-text-3) shrink-0">{ROTULO_PAPEL[p.papel]}</span>
              </li>
            ))}
            {convites.filter((c) => !c.usado_em).slice(0, 3).map((c) => (
              <li key={c.id} className="py-2 flex justify-between gap-2 opacity-70">
                <span className="truncate">{c.email}</span>
                <Badge variant="default" className="text-[10px]">Pendente</Badge>
              </li>
            ))}
            {perfis.length === 0 && convites.length === 0 && (
              <li className="py-3 text-(--color-text-3)">Ninguém vinculado ainda.</li>
            )}
          </ul>
        </div>
      </RevelarScroll>
    </SecaoPainel>
  )
}
