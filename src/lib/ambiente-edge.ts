export type AmbienteApp = 'site' | 'adm' | 'docs' | 'blog'

/** Garante URL absoluta (evita redirect relativo no OAuth do Supabase). */
function normalizarUrlBase(url: string): string {
  const limpa = url.trim().replace(/\/+$/, '')
  if (/^https?:\/\//i.test(limpa)) return limpa
  return `https://${limpa}`
}

/**
 * Funções usadas no proxy (Edge). Sem Zod, evita falha de bundle no runtime.
 */
export function obterAmbienteDoHost(hostname: string): AmbienteApp {
  const dominioRaiz = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'
  const host = hostname.split(':')[0]

  if (host === 'localhost' || host === '127.0.0.1') {
    return (process.env.VIGMED_DEV_TENANT as AmbienteApp) ?? 'site'
  }

  if (host === dominioRaiz || host === `www.${dominioRaiz}`) return 'site'
  if (host === `adm.${dominioRaiz}`) return 'adm'
  if (host === `docs.${dominioRaiz}`) return 'docs'
  if (host === `blog.${dominioRaiz}`) return 'blog'

  const partes = host.split('.')
  if (partes.length >= 3) {
    const subdominio = partes[0]
    if (subdominio === 'adm') return 'adm'
    if (subdominio === 'docs') return 'docs'
    if (subdominio === 'blog') return 'blog'
  }

  return 'site'
}

export function obterUrlBaseDoAmbiente(ambiente: AmbienteApp): string {
  const dominioRaiz = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'
  const emDesenvolvimento = process.env.NODE_ENV === 'development'

  if (emDesenvolvimento) {
    const porta = process.env.PORT ?? '3000'
    return `http://localhost:${porta}`
  }

  switch (ambiente) {
    case 'adm':
      return normalizarUrlBase(process.env.NEXT_PUBLIC_ADMIN_URL ?? `adm.${dominioRaiz}`)
    case 'docs':
      return normalizarUrlBase(process.env.NEXT_PUBLIC_DOCS_URL ?? `docs.${dominioRaiz}`)
    case 'blog':
      return normalizarUrlBase(process.env.NEXT_PUBLIC_BLOG_URL ?? `blog.${dominioRaiz}`)
    default:
      return normalizarUrlBase(process.env.NEXT_PUBLIC_SITE_URL ?? dominioRaiz)
  }
}

/**
 * Produção com URLs distintas (adm. / docs. / site): sem prefixo no path.
 * Dev e preview com a mesma origem: mantém /adm, /docs.
 */
export function roteamentoPorSubdominio(): boolean {
  if (process.env.NODE_ENV === 'development') return false

  const admin = process.env.NEXT_PUBLIC_ADMIN_URL?.trim()
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (admin && site) {
    try {
      return new URL(normalizarUrlBase(admin)).host !== new URL(normalizarUrlBase(site)).host
    } catch {
      /* fallback abaixo */
    }
  }

  return true
}

/** Domain do cookie para compartilhar sessão entre subdomínios (.vigmed.com.br) */
export function dominioCookieCompartilhado(): string | undefined {
  if (!roteamentoPorSubdominio()) return undefined
  const raiz = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'
  return `.${raiz}`
}
