import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { validarPerfilAposAutenticacao } from '@/lib/auth/perfil-servidor'
import {
  ambienteDoPapel,
  urlPainelAposLogin,
} from '@/lib/auth/redirecionamento'
import { ROTAS, urlDoAmbiente } from '@/lib/rotas'
import { comCookieCompartilhado } from '@/lib/supabase/cookies-auth'

/** Copia cookies de sessão (PKCE) para o redirect final */
function redirecionarComCookies(respostaOrigem: NextResponse, url: string) {
  const destino = NextResponse.redirect(url)
  respostaOrigem.cookies.getAll().forEach((cookie) => {
    destino.cookies.set(
      cookie.name,
      cookie.value,
      comCookieCompartilhado({
        path: cookie.path || '/',
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: (cookie.sameSite as CookieOptions['sameSite']) ?? 'lax',
        maxAge: cookie.maxAge,
        expires: cookie.expires ? new Date(cookie.expires) : undefined,
      }),
    )
  })
  return destino
}

function criarSupabaseCallback(requisicao: NextRequest) {
  let respostaComCookies = NextResponse.next({ request: requisicao })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll()
        },
        setAll(cookiesParaDefinir: { name: string; value: string; options: CookieOptions }[]) {
          cookiesParaDefinir.forEach(({ name, value }) => requisicao.cookies.set(name, value))
          respostaComCookies = NextResponse.next({ request: requisicao })
          cookiesParaDefinir.forEach(({ name, value, options }) =>
            respostaComCookies.cookies.set(name, value, comCookieCompartilhado(options)),
          )
        },
      },
    },
  )

  return {
    supabase,
    obterRespostaComCookies: () => respostaComCookies,
  }
}

/** Usa o host da própria requisição (evita loop apex↔www se SITE_URL divergir da Vercel). */
function urlBaseAuthCallback(requisicao: NextRequest): string {
  const host =
    requisicao.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    requisicao.headers.get('host')
  const proto =
    requisicao.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    (host?.startsWith('localhost') ? 'http' : 'https')
  if (host) return `${proto}://${host}`
  const origem = new URL(requisicao.url)
  return `${origem.protocol}//${origem.host}`
}

function mensagemErroSessao(mensagem?: string, temVerifier?: boolean): string {
  const base = (mensagem ?? '').toLowerCase()
  if (!temVerifier || base.includes('code verifier') || base.includes('pkce')) {
    return 'Login Google incompleto (sessão temporária perdida). Feche abas duplicadas e tente de novo.'
  }
  if (base.includes('expired') || base.includes('invalid')) {
    return 'O código de login expirou. Tente entrar com Google novamente.'
  }
  return mensagem?.slice(0, 180) || 'Não foi possível concluir o login. Tente novamente.'
}

/** Callback OAuth (Google) e redefinição de senha; redireciona pelo papel */
export async function GET(requisicao: NextRequest) {
  const urlAuth = urlBaseAuthCallback(requisicao)
  const { searchParams } = new URL(requisicao.url)
  const codigo = searchParams.get('code')
  const tipo = searchParams.get('tipo')
  const oauthErro = searchParams.get('error')
  const oauthDescricao = searchParams.get('error_description')

  const urlErro = (codigoErro: string, msg?: string) => {
    const params = new URLSearchParams({ erro: codigoErro })
    if (msg) params.set('msg', msg)
    return `${urlAuth}${ROTAS.auth.entrar}?${params.toString()}`
  }

  try {
    if (oauthErro) {
      console.error('[auth/callback] OAuth:', oauthErro, oauthDescricao)
      return NextResponse.redirect(urlErro('oauth', oauthDescricao ?? oauthErro))
    }

    if (!codigo) {
      console.error('[auth/callback] Sem code na query')
      return NextResponse.redirect(
        urlErro('auth', 'Resposta do Google sem código. Confira as URLs de redirect no Supabase.'),
      )
    }

    const temVerifier = requisicao.cookies
      .getAll()
      .some((c) => c.name.includes('code-verifier') && Boolean(c.value))

    if (!temVerifier) {
      console.error('[auth/callback] Cookie PKCE code-verifier ausente', {
        host: requisicao.headers.get('host'),
        cookies: requisicao.cookies.getAll().map((c) => c.name),
      })
    }

    const { supabase, obterRespostaComCookies } = criarSupabaseCallback(requisicao)
    const { data, error } = await supabase.auth.exchangeCodeForSession(codigo)

    if (error || !data.user) {
      console.error('[auth/callback] Sessão inválida:', error?.message, { temVerifier })
      return NextResponse.redirect(
        urlErro('auth', mensagemErroSessao(error?.message, temVerifier)),
      )
    }

    const validacao = await validarPerfilAposAutenticacao(
      data.user.id,
      data.user.email ?? '',
    )

    if ('erro' in validacao) {
      await supabase.auth.signOut()
      return redirecionarComCookies(obterRespostaComCookies(), urlErro('sem_acesso'))
    }

    const { perfil } = validacao

    await supabase
      .from('perfis')
      .update({ ultimo_login_em: new Date().toISOString() })
      .eq('id', data.user.id)

    const ambiente = ambienteDoPapel(perfil.papel)

    const destino =
      tipo === 'redefinir'
        ? urlDoAmbiente(ambiente, ambiente === 'adm' ? ROTAS.adm.perfil : ROTAS.docs.perfil) + '?redefinir=1'
        : urlPainelAposLogin(perfil.papel, urlAuth)

    return redirecionarComCookies(obterRespostaComCookies(), destino)
  } catch (erro) {
    console.error('[auth/callback] Erro não tratado:', erro)
    return NextResponse.redirect(urlErro('auth', 'Falha inesperada no callback de autenticação.'))
  }
}
