import { redirect } from 'next/navigation'
import { obterPerfilAtual } from '@/lib/auth/sessao'
import { listarConvitesEmpresa } from '@/lib/usuarios/acoes'
import { PainelUsuariosEmpresa } from '@/components/usuarios/PainelUsuariosEmpresa'
import { ROTAS, hrefPublico } from '@/lib/rotas'

export const metadata = { title: 'Pessoas · VIGMED Docs' }

export default async function PaginaUsuariosDocs() {
  const perfil = await obterPerfilAtual()

  if (!perfil || perfil.papel !== 'administrador_empresa') {
    redirect(hrefPublico(ROTAS.docs.painel))
  }

  const { convites, perfis, empresa } = await listarConvitesEmpresa()

  return (
    <PainelUsuariosEmpresa
      convites={convites}
      perfis={perfis}
      nomeEmpresa={empresa?.nome_fantasia ?? 'sua empresa'}
    />
  )
}
