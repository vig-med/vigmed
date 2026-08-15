import { listarConvitesEPerfis } from '@/lib/usuarios/acoes'
import { PainelUsuarios } from '@/components/usuarios/PainelUsuarios'

export const metadata = { title: 'Pessoas · VIGMED Admin' }

export default async function PaginaUsuariosAdmin() {
  const { convites, perfis, empresas } = await listarConvitesEPerfis()
  return <PainelUsuarios convites={convites} perfis={perfis} empresas={empresas} />
}
