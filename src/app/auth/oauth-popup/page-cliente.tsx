'use client'

import { useEffect } from 'react'
import { ROTAS } from '@/lib/rotas'

/** Fallback se o callback cair aqui sem opener (redirect normal). */
export default function PaginaOAuthPopup() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const destino = params.get('destino')
    const erroCodigo = params.get('erro')
    const msg = params.get('msg')

    if (destino) {
      window.location.replace(destino)
      return
    }

    const qs = new URLSearchParams({ erro: erroCodigo ?? 'auth' })
    if (msg) qs.set('msg', msg)
    window.location.replace(`${ROTAS.auth.entrar}?${qs.toString()}`)
  }, [])

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 text-sm text-muted-foreground">
      Concluindo login...
    </main>
  )
}
