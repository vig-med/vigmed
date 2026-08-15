import type { CookieOptions } from '@supabase/ssr'
import { dominioCookieCompartilhado } from '@/lib/ambiente-edge'

/** Opções de cookie com domain compartilhado entre subdomínios em produção */
export function comCookieCompartilhado(options: CookieOptions = {}): CookieOptions {
  const domain = dominioCookieCompartilhado()
  if (!domain) return options
  return {
    ...options,
    domain,
    sameSite: options.sameSite ?? 'lax',
    secure: options.secure ?? true,
    path: options.path ?? '/',
  }
}
