'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { contarMensagensNaoLidas } from '@/lib/mensagens/acoes'

interface ContextoMensagensNaoLidas {
  total: number
  definirTotal: (n: number) => void
  atualizar: () => Promise<void>
}

const Contexto = createContext<ContextoMensagensNaoLidas | null>(null)

export function ProvedorMensagensNaoLidas({
  inicial = 0,
  children,
}: {
  inicial?: number
  children: ReactNode
}) {
  const [total, definirTotal] = useState(inicial)

  const atualizar = useCallback(async () => {
    const r = await contarMensagensNaoLidas()
    definirTotal(r.total)
  }, [])

  useEffect(() => {
    definirTotal(inicial)
  }, [inicial])

  useEffect(() => {
    const id = window.setInterval(() => {
      void atualizar()
    }, 25000)
    return () => window.clearInterval(id)
  }, [atualizar])

  const valor = useMemo(
    () => ({ total, definirTotal, atualizar }),
    [total, atualizar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useMensagensNaoLidas() {
  const ctx = useContext(Contexto)
  if (!ctx) {
    return {
      total: 0,
      definirTotal: (_n: number) => {},
      atualizar: async () => {},
    }
  }
  return ctx
}
