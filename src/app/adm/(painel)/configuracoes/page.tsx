import { listarConfiguracoes } from '@/lib/configuracoes/acoes'
import { PainelConfiguracoes } from '@/components/configuracoes/PainelConfiguracoes'

export const metadata = { title: 'Configurações · VIGMED Admin' }

export default async function PaginaConfiguracoes() {
  const configuracoes = await listarConfiguracoes()
  return <PainelConfiguracoes configuracoes={configuracoes} />
}
