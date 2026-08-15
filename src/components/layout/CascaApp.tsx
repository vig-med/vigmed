'use client'

import type { ReactNode } from 'react'
import { FundoPainel } from '@/components/layout/FundoPainel'
import { NavegacaoApp } from '@/components/layout/NavegacaoApp'
import { ProvedorMensagensNaoLidas } from '@/contexts/MensagensNaoLidasContext'
import { obterNavegacao } from '@/lib/navegacao'
import type { Perfil } from '@/types'
import type { AmbienteApp } from '@/lib/ambiente'
import { SincronizarAparencia } from '@/components/perfil/SincronizarAparencia'

interface PropsCascaApp {
  children: ReactNode
  ambiente: AmbienteApp
  perfil: Perfil
  mensagensNaoLidas?: number
}

/** Shell do painel - dock inferior + conteúdo */
export function CascaApp({ children, ambiente, perfil, mensagensNaoLidas = 0 }: PropsCascaApp) {
  const itens = obterNavegacao(ambiente, perfil.papel)

  return (
    <ProvedorMensagensNaoLidas inicial={mensagensNaoLidas}>
      <div className="app-shell app-shell--menu-dock">
        <SincronizarAparencia perfil={perfil} />
        <FundoPainel />

        <main className="app-shell-conteudo">
          <div className="app-shell-pagina animate-fade-in">{children}</div>
        </main>

        <NavegacaoApp itens={itens} ambiente={ambiente} perfil={perfil} />
      </div>
    </ProvedorMensagensNaoLidas>
  )
}
