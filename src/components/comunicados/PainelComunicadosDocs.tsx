'use client'

import { useEffect, useRef } from 'react'
import { Pin } from 'lucide-react'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { IconeAnimado } from '@/components/ui/icone-animado'
import { marcarComunicadosLidos, type ComunicadoComLido } from '@/lib/comunicados/acoes'
import { cn, formatarDataHora } from '@/lib/utils'

interface Props {
  comunicados: ComunicadoComLido[]
}

export function PainelComunicadosDocs({ comunicados }: Props) {
  const marcados = useRef(new Set<string>())

  useEffect(() => {
    const naoLidos = comunicados.filter((c) => !c.lido && !marcados.current.has(c.id)).map((c) => c.id)
    if (naoLidos.length === 0) return

    for (const id of naoLidos) marcados.current.add(id)
    // Sem router.refresh: evita remount da página inteira
    void marcarComunicadosLidos(naoLidos)
  }, [comunicados])

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Comunicados"
        descricao="Avisos e atualizações publicados pela administração VIGMED."
      />

      <div className="flex flex-col gap-3">
        {comunicados.map((c, i) => (
          <RevelarScroll key={c.id} atraso={i * 0.04}>
            <div className={cn('comunicado-card', c.fixado && 'comunicado-card--fixado', !c.lido && 'comunicado-card--nao-lido')}>
              {c.fixado && (
                <div className="comunicado-card-barra">
                  <span className="flex items-center gap-1.5"><Pin size={11} /> Fixado</span>
                </div>
              )}
              <div className="comunicado-card-corpo">
                <div className="flex justify-between items-start gap-2">
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{c.titulo}</h3>
                  <span className={cn('badge-prioridade', `prioridade-${c.prioridade}`)}>{c.prioridade}</span>
                </div>
                <span className="tabela-mono">{formatarDataHora(c.publicado_em)}</span>
                {/<[a-z][\s\S]*>/i.test(c.corpo) ? (
                  <div
                    className="blog-prose comunicado-corpo-html"
                    style={{ fontSize: '0.82rem', color: 'var(--color-text-2)' }}
                    dangerouslySetInnerHTML={{ __html: c.corpo }}
                  />
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-2)', lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>
                    {c.corpo}
                  </p>
                )}
              </div>
            </div>
          </RevelarScroll>
        ))}

        {comunicados.length === 0 && (
          <RevelarScroll>
            <div className="painel-vazio painel-card">
              <IconeAnimado nome="megaphone" tamanho={24} className="opacity-40" />
              Nenhum comunicado no momento.
            </div>
          </RevelarScroll>
        )}
      </div>
    </SecaoPainel>
  )
}
