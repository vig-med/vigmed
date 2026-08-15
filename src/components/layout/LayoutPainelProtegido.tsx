import { redirect } from 'next/navigation'
import { obterPerfilAtual, ehAdministrador, ehUsuarioEmpresa } from '@/lib/auth/sessao'
import { CascaApp } from '@/components/layout/CascaApp'
import { caminhoEntrar } from '@/lib/rotas'
import { contarMensagensNaoLidas } from '@/lib/mensagens/acoes'
import type { AmbienteApp } from '@/lib/ambiente'

type AmbientePainel = Extract<AmbienteApp, 'adm' | 'docs'>

interface Props {
  ambiente: AmbientePainel
  children: React.ReactNode
}

/** Layout protegido compartilhado entre adm e docs */
export async function LayoutPainelProtegido({ ambiente, children }: Props) {
  const perfil = await obterPerfilAtual()

  const autorizado =
    ambiente === 'adm'
      ? perfil && ehAdministrador(perfil.papel)
      : perfil && ehUsuarioEmpresa(perfil.papel)

  if (!autorizado || !perfil) {
    redirect(caminhoEntrar())
  }

  const { total: mensagensNaoLidas } = await contarMensagensNaoLidas()

  return (
    <CascaApp ambiente={ambiente} perfil={perfil} mensagensNaoLidas={mensagensNaoLidas}>
      {children}
    </CascaApp>
  )
}
