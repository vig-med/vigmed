import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { comCookieCompartilhado } from '@/lib/supabase/cookies-auth'

/**
 * Cliente Supabase para Server Components e Server Actions.
 * Lê/escreve cookies de sessão automaticamente.
 */
export async function criarClienteSupabaseServidor() {
  const armazenamentoCookies = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return armazenamentoCookies.getAll()
        },
        setAll(cookiesParaDefinir: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesParaDefinir.forEach(({ name, value, options }) =>
              armazenamentoCookies.set(name, value, comCookieCompartilhado(options)),
            )
          } catch {
            // Em Server Components puros os cookies são gerenciados pelo proxy
          }
        },
      },
    },
  )
}
