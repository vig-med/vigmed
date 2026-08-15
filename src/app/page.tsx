import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { obterAmbienteDoHost } from '@/lib/ambiente'
import { hrefPublico, ROTAS } from '@/lib/rotas'

/**
 * Roteia a raiz para o ambiente correto conforme subdomínio.
 * Em dev, use VIGMED_DEV_TENANT no .env.local.
 */
export default async function PaginaRaiz() {
  const cabecalhos = await headers()
  const host = cabecalhos.get('host') ?? 'localhost'
  const ambiente = obterAmbienteDoHost(host)

  switch (ambiente) {
    case 'adm':
      redirect(hrefPublico(ROTAS.adm.painel))
    case 'docs':
      redirect(hrefPublico(ROTAS.docs.painel))
    case 'blog':
      redirect(hrefPublico(ROTAS.blog.home))
    default:
      redirect(ROTAS.site.home)
  }
}
