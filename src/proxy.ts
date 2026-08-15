import { type NextRequest, NextResponse } from 'next/server'
import { atualizarSessao } from '@/lib/supabase/middleware'
import {
  obterAmbienteDoHost,
  obterUrlBaseDoAmbiente,
  roteamentoPorSubdominio,
} from '@/lib/ambiente-edge'
import { hrefPublico, ROTAS } from '@/lib/rotas'

const ROTAS_AUTH_UNIFICADAS: string[] = [
  ROTAS.auth.entrar,
  ROTAS.auth.cadastro,
  ROTAS.auth.recuperar,
]

const ROTAS_AUTH_LEGADAS: string[] = [
  '/adm/entrar',
  '/adm/cadastro',
  '/adm/recuperar',
  '/docs/entrar',
  '/docs/cadastro',
  '/docs/recuperar',
]

export async function proxy(requisicao: NextRequest) {
  try {
    return await executarProxy(requisicao)
  } catch (erro) {
    console.error('[proxy] Erro não tratado:', erro)
    return NextResponse.next({ request: requisicao })
  }
}

async function executarProxy(requisicao: NextRequest) {
  const { pathname } = requisicao.nextUrl
  const host = requisicao.headers.get('host') ?? 'localhost'
  const ambiente = obterAmbienteDoHost(host)
  const porSubdominio = roteamentoPorSubdominio()

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.')
  ) {
    return atualizarSessao(requisicao)
  }

  if (ROTAS_AUTH_UNIFICADAS.includes(pathname)) {
    return atualizarSessao(requisicao)
  }

  if (ROTAS_AUTH_LEGADAS.includes(pathname)) {
    const destino = requisicao.nextUrl.clone()
    const mapa: Record<string, string> = {
      '/adm/entrar': ROTAS.auth.entrar,
      '/docs/entrar': ROTAS.auth.entrar,
      '/adm/cadastro': ROTAS.auth.cadastro,
      '/docs/cadastro': ROTAS.auth.cadastro,
      '/adm/recuperar': ROTAS.auth.recuperar,
      '/docs/recuperar': ROTAS.auth.recuperar,
    }
    destino.pathname = mapa[pathname] ?? ROTAS.auth.entrar
    return NextResponse.redirect(destino)
  }

  // Apex com path /adm|/docs → subdomínio canônico (só em prod com URLs distintas)
  if (porSubdominio && ambiente === 'site') {
    if (pathname === '/adm' || pathname.startsWith('/adm/')) {
      const resto = pathname === '/adm' ? '/painel' : pathname.slice('/adm'.length)
      return NextResponse.redirect(new URL(resto || '/painel', obterUrlBaseDoAmbiente('adm')))
    }
    if (pathname === '/docs' || pathname.startsWith('/docs/')) {
      const resto = pathname === '/docs' ? '/painel' : pathname.slice('/docs'.length)
      return NextResponse.redirect(new URL(resto || '/painel', obterUrlBaseDoAmbiente('docs')))
    }
    if (pathname === '/blog' || pathname.startsWith('/blog/')) {
      const resto = pathname === '/blog' ? '/' : pathname.slice('/blog'.length)
      return NextResponse.redirect(new URL(resto || '/', obterUrlBaseDoAmbiente('blog')))
    }
  }

  // No subdomínio, remove prefixo duplicado /adm/painel → /painel
  if (porSubdominio && (ambiente === 'adm' || ambiente === 'docs' || ambiente === 'blog')) {
    const prefixo = `/${ambiente}`
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) {
      const resto = pathname === prefixo ? (ambiente === 'blog' ? '/' : '/painel') : pathname.slice(prefixo.length)
      const destino = requisicao.nextUrl.clone()
      destino.pathname = resto || (ambiente === 'blog' ? '/' : '/painel')
      return NextResponse.redirect(destino)
    }
  }

  const url = requisicao.nextUrl.clone()
  const prefixoAmbiente = `/${ambiente}`

  // Raiz do subdomínio → painel (URL canônica)
  if ((ambiente === 'adm' || ambiente === 'docs') && pathname === '/') {
    const destino = requisicao.nextUrl.clone()
    destino.pathname = '/painel'
    return NextResponse.redirect(destino)
  }

  if (!pathname.startsWith(prefixoAmbiente) && ambiente !== 'site') {
    url.pathname = `${prefixoAmbiente}${pathname === '/' ? '' : pathname}`
    const resposta = NextResponse.rewrite(url)
    return await aplicarProtecaoAuth(resposta, requisicao, ambiente, url.pathname)
  }

  if (ambiente === 'site' && !pathname.startsWith('/site') && pathname === '/') {
    url.pathname = '/site'
    return NextResponse.rewrite(url)
  }

  if (ambiente === 'blog' && !pathname.startsWith('/blog')) {
    url.pathname = `/blog${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  return await aplicarProtecaoAuth(
    await atualizarSessao(requisicao),
    requisicao,
    ambiente,
    pathname.startsWith(prefixoAmbiente) ? pathname : url.pathname,
  )
}

async function aplicarProtecaoAuth(
  resposta: NextResponse,
  requisicao: NextRequest,
  ambiente: string,
  caminho: string,
) {
  if (ambiente === 'site' || ambiente === 'blog') return resposta

  const temSessao = requisicao.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  if (!temSessao) {
    const siteBase = obterUrlBaseDoAmbiente('site')
    const loginUrl = new URL(`${siteBase}${ROTAS.auth.entrar}`)
    // Guarda path público no subdomínio de origem para voltar depois do login
    const publico = hrefPublico(caminho)
    loginUrl.searchParams.set('redirect', publico)
    loginUrl.searchParams.set('ambiente', ambiente)
    return NextResponse.redirect(loginUrl)
  }

  return resposta
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
