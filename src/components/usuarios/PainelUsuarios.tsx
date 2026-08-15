'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Copy, Link2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { ConfirmacaoExclusaoInline } from '@/components/ui/ConfirmacaoExclusaoInline'
import { Badge, Button, Input } from '@/components/ui'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import { convidarUsuario, excluirConvite, excluirUsuarioCompleto } from '@/lib/usuarios/acoes'
import { ROTULO_PAPEL } from '@/lib/usuarios/constantes'
import type { AmbienteConvite } from '@/lib/auth/convites'
import type { PapelUsuario } from '@/types'

interface ConviteComEmpresa {
  id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  ambiente: AmbienteConvite
  usado_em: string | null
  criado_em: string
  empresa_id?: string | null
  empresas?: { nome_fantasia: string } | { nome_fantasia: string }[] | null
}

function nomeEmpresa(empresas: ConviteComEmpresa['empresas']): string | undefined {
  if (!empresas) return undefined
  if (Array.isArray(empresas)) return empresas[0]?.nome_fantasia
  return empresas.nome_fantasia
}

interface PerfilResumo {
  id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  ativo: boolean
  ultimo_login_em: string | null
  empresas?: { nome_fantasia: string } | { nome_fantasia: string }[] | null
}

interface EmpresaResumo {
  id: string
  nome_fantasia: string
}

interface Props {
  convites: ConviteComEmpresa[]
  perfis: PerfilResumo[]
  empresas: EmpresaResumo[]
  /** Modo empresa: só docs + papel usuario_empresa */
  modo?: 'adm' | 'empresa'
  titulo?: string
  descricao?: string
}

type AlvoExclusao = { tipo: 'convite' | 'usuario'; id: string } | null

function linkAtivacao(email: string) {
  if (typeof window === 'undefined') return `/cadastro?email=${encodeURIComponent(email)}`
  return `${window.location.origin}/cadastro?email=${encodeURIComponent(email)}`
}

/** Painel unificado de pessoas: autorizar, pendentes, contas e exclusão */
export function PainelUsuarios({
  convites,
  perfis,
  empresas,
  modo = 'adm',
  titulo = 'Pessoas',
  descricao = 'Autorize e-mails, acompanhe convites e contas em um só lugar.',
}: Props) {
  const router = useRouter()
  const { pendente, executar } = useAcaoPendente<'convidar' | 'excluir'>()
  const [email, definirEmail] = useState('')
  const [nome, definirNome] = useState('')
  const [papel, definirPapel] = useState<PapelUsuario>(
    modo === 'empresa' ? 'usuario_empresa' : 'usuario_empresa',
  )
  const [ambiente, definirAmbiente] = useState<AmbienteConvite>(modo === 'empresa' ? 'docs' : 'docs')
  const [empresaId, definirEmpresaId] = useState('')
  const [excluindo, definirExcluindo] = useState<AlvoExclusao>(null)
  const [ultimoLink, definirUltimoLink] = useState<string | null>(null)

  const convitesPendentes = useMemo(
    () => convites.filter((c) => !c.usado_em),
    [convites],
  )

  function aoConvidar(e: React.FormEvent) {
    e.preventDefault()
    void executar('convidar', async () => {
      const resultado = await convidarUsuario({
        email,
        nomeCompleto: nome,
        papel: modo === 'empresa' ? 'usuario_empresa' : papel,
        ambiente: modo === 'empresa' ? 'docs' : ambiente,
        empresaId: modo === 'empresa' ? undefined : ambiente === 'docs' ? empresaId || null : null,
      })
      if (resultado.erro) {
        toast.error(resultado.erro)
        return
      }
      const link = resultado.linkAtivacao
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}${resultado.linkAtivacao}`
        : linkAtivacao(email)
      definirUltimoLink(link)
      try {
        await navigator.clipboard.writeText(link)
        toast.success('E-mail autorizado. Link de ativação copiado.')
      } catch {
        toast.success(resultado.mensagem ?? 'E-mail autorizado.')
      }
      definirEmail('')
      definirNome('')
      router.refresh()
    })
  }

  function copiarLink(emailAlvo: string) {
    const link = linkAtivacao(emailAlvo)
    navigator.clipboard.writeText(link).then(
      () => toast.success('Link copiado.'),
      () => toast.error('Não foi possível copiar.'),
    )
  }

  function confirmarExclusao() {
    if (!excluindo) return
    const alvo = excluindo
    definirExcluindo(null)
    void executar('excluir', async () => {
      if (alvo.tipo === 'convite') {
        const r = await excluirConvite(alvo.id)
        if (r.erro) { toast.error(r.erro); return }
        toast.success('Convite excluído.')
      } else {
        const r = await excluirUsuarioCompleto(alvo.id)
        if (r.erro) { toast.error(r.erro); return }
        toast.success(r.mensagem ?? 'Usuário excluído.')
      }
      router.refresh()
    })
  }

  return (
    <SecaoPainel>
      <CabecalhoPagina titulo={titulo} descricao={descricao} />

      <RevelarScroll>
        <div className="painel-form-lateral">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-(--color-text-2)" />
            <span className="painel-form-titulo">Autorizar e-mail</span>
          </div>
          <p className="text-xs text-(--color-text-3) -mt-1">
            Sem e-mail automático. Copie o link de ativação e envie como quiser.
          </p>

          <form onSubmit={aoConvidar} className="grid gap-3 sm:grid-cols-2">
            <Input label="E-mail" type="email" value={email} onChange={(e) => definirEmail(e.target.value)} placeholder="usuario@empresa.com" required />
            <Input label="Nome (opcional)" value={nome} onChange={(e) => definirNome(e.target.value)} placeholder="Nome completo" />

            {modo === 'adm' && (
              <>
                <div className="painel-campo">
                  <label className="painel-label">Acesso</label>
                  <select
                    className="painel-select w-full"
                    value={`${ambiente}:${papel}`}
                    onChange={(e) => {
                      const [amb, pap] = e.target.value.split(':') as [AmbienteConvite, PapelUsuario]
                      definirAmbiente(amb)
                      definirPapel(pap)
                    }}
                  >
                    <option value="docs:usuario_empresa">Docs · usuário</option>
                    <option value="docs:administrador_empresa">Docs · admin empresa</option>
                    <option value="adm:administrador">Admin do sistema</option>
                  </select>
                </div>
                {ambiente === 'docs' && (
                  <div className="painel-campo">
                    <label className="painel-label">Empresa</label>
                    <select className="painel-select w-full" value={empresaId} onChange={(e) => definirEmpresaId(e.target.value)} required>
                      <option value="">Selecione</option>
                      {empresas.map((e) => (
                        <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" size="sm" loading={pendente('convidar')}>
                <UserPlus size={14} />
                Autorizar e copiar link
              </Button>
            </div>
          </form>

          {ultimoLink && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 py-2 text-xs">
              <Link2 size={14} className="shrink-0" />
              <span className="truncate flex-1 font-mono">{ultimoLink}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(ultimoLink).then(() => toast.success('Copiado.'))}>
                <Copy size={14} />
              </Button>
            </div>
          )}
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.05}>
        <div className="painel-tabela-wrap">
          <div className="px-3 py-2 border-b border-(--color-border) text-xs font-semibold text-(--color-text-2)">
            Aguardando ativação ({convitesPendentes.length})
          </div>
          {convitesPendentes.length === 0 ? (
            <div className="painel-vazio text-sm">Nenhum convite pendente.</div>
          ) : (
            convitesPendentes.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-(--color-border) last:border-0">
                <div className="min-w-0">
                  <p className="tabela-nome">{c.email}</p>
                  <p className="tabela-sub">
                    {ROTULO_PAPEL[c.papel]}
                    {nomeEmpresa(c.empresas) ? ` · ${nomeEmpresa(c.empresas)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="warning" className="text-[10px]">Pendente</Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={() => copiarLink(c.email)} aria-label="Copiar link">
                    <Copy size={14} />
                  </Button>
                  <ConfirmacaoExclusaoInline
                    ariaLabel={`Excluir convite ${c.email}`}
                    confirmando={excluindo?.tipo === 'convite' && excluindo.id === c.id}
                    desabilitado={pendente('excluir')}
                    onPedir={() => definirExcluindo({ tipo: 'convite', id: c.id })}
                    onConfirmar={confirmarExclusao}
                    onCancelar={() => definirExcluindo(null)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.08}>
        <div className="painel-tabela-wrap">
          <div className="px-3 py-2 border-b border-(--color-border) text-xs font-semibold text-(--color-text-2)">
            Contas ({perfis.length})
          </div>
          {perfis.length === 0 ? (
            <div className="painel-vazio text-sm">Nenhuma conta ainda.</div>
          ) : (
            perfis.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-(--color-border) last:border-0">
                <div className="min-w-0">
                  <p className="tabela-nome">{p.nome_completo || p.email}</p>
                  <p className="tabela-sub">
                    {p.email} · {ROTULO_PAPEL[p.papel]}
                    {nomeEmpresa(p.empresas) ? ` · ${nomeEmpresa(p.empresas)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={p.ativo ? 'success' : 'danger'} className="text-[10px]">
                    {p.ativo ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ativo
                      </span>
                    ) : (
                      'Inativo'
                    )}
                  </Badge>
                  {modo === 'adm' && (
                    <ConfirmacaoExclusaoInline
                      ariaLabel={`Excluir usuário ${p.email}`}
                      confirmando={excluindo?.tipo === 'usuario' && excluindo.id === p.id}
                      desabilitado={pendente('excluir')}
                      onPedir={() => definirExcluindo({ tipo: 'usuario', id: p.id })}
                      onConfirmar={confirmarExclusao}
                      onCancelar={() => definirExcluindo(null)}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </RevelarScroll>
    </SecaoPainel>
  )
}
