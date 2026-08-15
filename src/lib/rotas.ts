import type { AmbienteApp } from '@/lib/ambiente'
import {
  obterUrlBaseDoAmbiente,
  roteamentoPorSubdominio,
} from '@/lib/ambiente-edge'

export { roteamentoPorSubdominio } from '@/lib/ambiente-edge'

/**
 * Caminhos internos do App Router (sempre com /adm, /docs).
 * Use em revalidatePath, layouts e proxy rewrite.
 * Para Link / router.push use hrefPublico().
 */
export const ROTAS = {
  site: {
    home: '/site',
  },
  blog: {
    home: '/blog',
    post: (slug: string) => `/blog/${slug}`,
  },
  doc: {
    arquivo: (id: string) => `/doc/${id}`,
  },
  auth: {
    entrar: '/entrar',
    cadastro: '/cadastro',
    recuperar: '/recuperar',
  },
  adm: {
    entrar: '/entrar',
    cadastro: '/cadastro',
    recuperar: '/recuperar',
    painel: '/adm/painel',
    empresas: '/adm/empresas',
    empresa: (id: string) => `/adm/empresas/${id}`,
    empresaDocumentos: (id: string) => `/adm/empresas/${id}/documentos`,
    usuarios: '/adm/usuarios',
    documentos: '/adm/documentos',
    comunicados: '/adm/comunicados',
    blog: '/adm/blog',
    blogNovo: '/adm/blog/novo',
    blogEditar: (id: string) => `/adm/blog/${id}/editar`,
    mensagens: '/adm/mensagens',
    relatorios: '/adm/relatorios',
    auditoria: '/adm/auditoria',
    configuracoes: '/adm/configuracoes',
    atualizacoes: '/adm/atualizacoes',
    perfil: '/adm/perfil',
  },
  docs: {
    entrar: '/entrar',
    cadastro: '/cadastro',
    recuperar: '/recuperar',
    painel: '/docs/painel',
    documentos: '/docs/documentos',
    comunicados: '/docs/comunicados',
    mensagens: '/docs/mensagens',
    usuarios: '/docs/usuarios',
    perfil: '/docs/perfil',
  },
} as const

const PREFIXOS_TENANT = ['/adm', '/docs', '/site', '/blog'] as const

/** Path visto no browser: /painel em prod (subdomínio), /adm/painel em dev */
export function hrefPublico(caminhoInterno: string): string {
  if (!roteamentoPorSubdominio()) return caminhoInterno

  for (const prefixo of PREFIXOS_TENANT) {
    if (caminhoInterno === prefixo) return '/'
    if (caminhoInterno.startsWith(`${prefixo}/`)) {
      return caminhoInterno.slice(prefixo.length) || '/'
    }
  }
  return caminhoInterno
}

/** URL absoluta no host do ambiente (ex.: https://adm.vigmed.com.br/painel) */
export function urlDoAmbiente(ambiente: AmbienteApp, caminhoInterno: string): string {
  const base = obterUrlBaseDoAmbiente(ambiente)
  return `${base}${hrefPublico(caminhoInterno)}`
}

const dominioRaiz = () => process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'

/** URL pública do blog (subdomínio) */
export function urlBlogPublico() {
  return process.env.NEXT_PUBLIC_BLOG_URL ?? `https://blog.${dominioRaiz()}`
}

export function rotasDoAmbiente(ambiente: AmbienteApp) {
  return ambiente === 'adm' ? ROTAS.adm : ROTAS.docs
}

export function caminhoEntrar() {
  return ROTAS.auth.entrar
}
