'use client'

import { criarClienteSupabase } from '@/lib/supabase/cliente'

/**
 * Login Google no browser (redirect na mesma aba).
 * Sempre usa o host atual — evita loop se SITE_URL (apex/www) divergir da Vercel.
 */
export async function entrarComGoogleNoCliente(): Promise<{ ok: false; erro: string } | void> {
  const supabase = criarClienteSupabase()
  const redirectTo = `${window.location.origin}/api/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    return { ok: false, erro: 'Não foi possível iniciar login com Google.' }
  }

  window.location.assign(data.url)
}
