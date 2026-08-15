'use client'

import { useCallback, useState } from 'react'

/**
 * Loading por ação, sem useTransition.
 * Evita que um botão "ligue" o loading de todos os outros e que
 * router.refresh() mantenha a UI inteira em estado pendente.
 */
export function useAcaoPendente<T extends string = string>() {
  const [acao, definirAcao] = useState<T | null>(null)

  const executar = useCallback(async (id: T, fn: () => Promise<void>) => {
    definirAcao(id)
    try {
      await fn()
    } finally {
      definirAcao(null)
    }
  }, [])

  return {
    acao,
    pendente: (id: T) => acao === id,
    ocupado: acao !== null,
    executar,
  }
}
