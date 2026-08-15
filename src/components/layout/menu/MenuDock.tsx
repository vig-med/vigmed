'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconeAnimado } from '@/components/ui/icone-animado'
import { MenuAcoesUsuario } from '@/components/layout/menu/MenuAcoesUsuario'
import { PipulaDock } from '@/components/layout/menu/PipulaDock'
import { useMensagensNaoLidas } from '@/contexts/MensagensNaoLidasContext'
import type { NomeIcone } from '@/lib/icones-animados'
import type { ItemNavegacao } from '@/lib/navegacao'
import { listarAreas } from '@/lib/navegacao-menu'
import type { AmbienteApp } from '@/lib/ambiente'
import type { Perfil } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  itens: ItemNavegacao[]
  ambiente: AmbienteApp
  perfil: Perfil
}

interface PropsItemDock {
  href: string
  rotulo: string
  icone: NomeIcone
  ativo: boolean
  aoClicar?: () => void
  externo?: boolean
  comRotulo?: boolean
  badge?: number
}

function ItemDock({ href, rotulo, icone, ativo, aoClicar, externo, comRotulo, badge = 0 }: PropsItemDock) {
  const classe = cn(
    'menu-dock-item grupo-icone',
    ativo && 'menu-dock-item--ativo',
    comRotulo && 'menu-dock-item--com-rotulo',
  )

  const badgeEl = badge > 0 ? (
    <span className="menu-nav-badge" aria-label={`${badge} não lidas`}>
      {badge > 99 ? '99+' : badge}
    </span>
  ) : null

  const conteudo = (
    <>
      <span className="menu-dock-item-icone" aria-hidden>
        <IconeAnimado nome={icone} tamanho={20} />
        {badgeEl}
      </span>
      {comRotulo && <span className="menu-dock-item-rotulo">{rotulo}</span>}
    </>
  )

  if (comRotulo) {
    if (externo) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classe}
          aria-label={badge > 0 ? `${rotulo}, ${badge} não lidas` : rotulo}
          onClick={aoClicar}
        >
          {conteudo}
        </a>
      )
    }
    return (
      <Link
        href={href}
        className={classe}
        aria-label={badge > 0 ? `${rotulo}, ${badge} não lidas` : rotulo}
        onClick={aoClicar}
      >
        {conteudo}
      </Link>
    )
  }

  return (
    <PipulaDock texto={badge > 0 ? `${rotulo} (${badge})` : rotulo}>
      {(pipula) => {
        const iconeSlot = (
          <span className="menu-dock-item-icone" aria-hidden>
            <IconeAnimado nome={icone} tamanho={20} />
            {badgeEl}
          </span>
        )

        if (externo) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={classe}
              aria-label={badge > 0 ? `${rotulo}, ${badge} não lidas` : rotulo}
              onClick={aoClicar}
              ref={pipula.ref as (node: HTMLAnchorElement | null) => void}
              onMouseEnter={pipula.onMouseEnter}
              onMouseLeave={pipula.onMouseLeave}
              onFocus={pipula.onFocus}
              onBlur={pipula.onBlur}
            >
              {iconeSlot}
            </a>
          )
        }

        return (
          <Link
            href={href}
            className={classe}
            aria-label={badge > 0 ? `${rotulo}, ${badge} não lidas` : rotulo}
            onClick={aoClicar}
            ref={pipula.ref as (node: HTMLAnchorElement | null) => void}
            onMouseEnter={pipula.onMouseEnter}
            onMouseLeave={pipula.onMouseLeave}
            onFocus={pipula.onFocus}
            onBlur={pipula.onBlur}
          >
            {iconeSlot}
          </Link>
        )
      }}
    </PipulaDock>
  )
}

function ehHrefMensagens(href: string) {
  return href.includes('/mensagens') || href === '/mensagens'
}

/** Dock inferior: desktop e mobile em linha; no mobile overflow-x com seta de slider */
export function MenuDock({ itens, ambiente, perfil }: Props) {
  const caminho = usePathname()
  const { total: mensagensNaoLidas } = useMensagensNaoLidas()
  const areas = listarAreas(itens)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [podeEsquerda, definirPodeEsquerda] = useState(false)
  const [podeDireita, definirPodeDireita] = useState(false)

  const itensPlanos = areas.flatMap((area) => {
    if (area.tipo === 'link' && area.href) {
      return [{
        key: area.id,
        href: area.href,
        rotulo: area.rotulo,
        icone: area.icone,
        externo: area.href.startsWith('http'),
      }]
    }
    if (area.tipo === 'grupo' && area.filhos?.length) {
      return area.filhos.map((filho) => ({
        key: `${area.id}-${filho.href}`,
        href: filho.href,
        rotulo: filho.rotulo,
        icone: filho.icone ?? area.icone,
        externo: false,
      }))
    }
    return []
  })

  const atualizarSetas = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    definirPodeEsquerda(el.scrollLeft > 4)
    definirPodeDireita(max > 4 && el.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    atualizarSetas()
    el.addEventListener('scroll', atualizarSetas, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(atualizarSetas) : null
    ro?.observe(el)
    window.addEventListener('resize', atualizarSetas)
    return () => {
      el.removeEventListener('scroll', atualizarSetas)
      ro?.disconnect()
      window.removeEventListener('resize', atualizarSetas)
    }
  }, [atualizarSetas, itensPlanos.length])

  function deslizar(direcao: 1 | -1) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direcao * Math.min(160, el.clientWidth * 0.65), behavior: 'smooth' })
  }

  return (
    <>
      <nav className="menu-dock-barra hidden md:flex" aria-label="Navegação principal">
        <div className="menu-dock-inner">
          <div className="menu-dock-scroll">
            {itensPlanos.map((item) => (
              <ItemDock
                key={item.key}
                href={item.href}
                rotulo={item.rotulo}
                icone={item.icone}
                ativo={caminho.startsWith(item.href)}
                externo={item.externo}
                badge={ehHrefMensagens(item.href) ? mensagensNaoLidas : 0}
              />
            ))}
          </div>
          <span className="menu-dock-separador" aria-hidden />
          <MenuAcoesUsuario ambiente={ambiente} perfil={perfil} compacto noDock />
        </div>
      </nav>

      <nav className="menu-dock-barra md:hidden" aria-label="Navegação principal">
        <div className="menu-dock-inner menu-dock-inner--mobile">
          <div className="menu-dock-slider">
            {podeEsquerda && (
              <button
                type="button"
                className="menu-dock-slider-seta menu-dock-slider-seta--esq"
                onClick={() => deslizar(-1)}
                aria-label="Itens anteriores"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <div
              ref={scrollRef}
              className="menu-dock-scroll menu-dock-scroll--mobile"
              role="list"
            >
              {itensPlanos.map((item) => (
                <ItemDock
                  key={item.key}
                  href={item.href}
                  rotulo={item.rotulo}
                  icone={item.icone}
                  ativo={caminho.startsWith(item.href)}
                  externo={item.externo}
                  comRotulo
                  badge={ehHrefMensagens(item.href) ? mensagensNaoLidas : 0}
                />
              ))}
            </div>

            {podeDireita && (
              <button
                type="button"
                className="menu-dock-slider-seta menu-dock-slider-seta--dir"
                onClick={() => deslizar(1)}
                aria-label="Mais itens"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          <span className="menu-dock-separador" aria-hidden />
          <MenuAcoesUsuario ambiente={ambiente} perfil={perfil} compacto noDock />
        </div>
      </nav>
    </>
  )
}
