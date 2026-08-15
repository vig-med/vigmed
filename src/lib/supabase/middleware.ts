import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { comCookieCompartilhado } from '@/lib/supabase/cookies-auth'

/**
 * Atualiza a sessão Supabase a cada requisição.
 * Chamado pelo proxy principal antes de qualquer roteamento.
 */
export async function atualizarSessao(requisicao: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request: requisicao })
  }

  let resposta = NextResponse.next({ request: requisicao })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll()
        },
        setAll(cookiesParaDefinir: { name: string; value: string; options: CookieOptions }[]) {
          cookiesParaDefinir.forEach(({ name, value }) =>
            requisicao.cookies.set(name, value),
          )
          resposta = NextResponse.next({ request: requisicao })
          cookiesParaDefinir.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, comCookieCompartilhado(options)),
          )
        },
      },
    })

    await supabase.auth.getUser()
  } catch (erro) {
    console.error('[proxy] Falha ao atualizar sessão Supabase:', erro)
  }

  return resposta
}
