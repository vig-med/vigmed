import Link from 'next/link'
import { ROTAS, hrefPublico } from '@/lib/rotas'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel, CartaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { IconeAnimado } from '@/components/ui/icone-animado'
import { Button } from '@/components/ui'
import { formatarDataHora } from '@/lib/utils'

interface Props {
  primeiroNome: string
  totalDocumentos: number
  comunicadosNaoLidos: number
  mensagensNovas: number
  documentosRecentes: {
    id: string
    titulo: string
    criado_em: string
    nome_arquivo?: string
  }[]
}

export function PainelInicioDocs({
  primeiroNome,
  totalDocumentos,
  comunicadosNaoLidos,
  mensagensNovas,
  documentosRecentes,
}: Props) {
  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo={`Olá, ${primeiroNome}`}
        descricao="Resumo das suas atividades."
      />

      <RevelarScroll>
        <div className="grid grid-cols-3 gap-3">
          {[
            { rotulo: 'Documentos', valor: totalDocumentos, icone: 'file-text' as const },
            { rotulo: 'Comunicados não lidos', valor: comunicadosNaoLidos, icone: 'megaphone' as const },
            { rotulo: 'Mensagens novas', valor: mensagensNovas, icone: 'message' as const },
          ].map((m) => (
            <div key={m.rotulo} className="metrica-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.55rem' }}>
              <div className="metrica-icone">
                <IconeAnimado nome={m.icone} tamanho={16} />
              </div>
              <div>
                <p className="metrica-valor">{m.valor}</p>
                <p className="metrica-titulo">{m.rotulo}</p>
              </div>
            </div>
          ))}
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.05}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--color-border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <Link href={hrefPublico(ROTAS.docs.documentos)} style={{ display: 'block', padding: '0.9rem 1rem', background: 'var(--color-surface)', textDecoration: 'none', transition: 'background 0.15s' }}
            className="hover:bg-(--color-surface-2)">
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-1)' }}>Documentos</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.2rem' }}>Enviar e baixar arquivos da empresa</p>
          </Link>
          <Link href={hrefPublico(ROTAS.docs.comunicados)} style={{ display: 'block', padding: '0.9rem 1rem', background: 'var(--color-surface)', textDecoration: 'none', transition: 'background 0.15s' }}
            className="hover:bg-(--color-surface-2)">
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-1)' }}>Comunicados</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.2rem' }}>Avisos da administração</p>
          </Link>
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.09}>
        <CartaoPainel titulo="Recentes">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {documentosRecentes.map((doc) => (
              <Link
                key={doc.id}
                href={hrefPublico(ROTAS.docs.documentos)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0', borderBottom: '1px solid var(--color-border)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                className="last:border-0 hover:opacity-75"
              >
                <IconeAnimado nome="file-text" tamanho={13} className="shrink-0 text-(--color-text-3)" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.titulo}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--color-text-3)' }}>{formatarDataHora(doc.criado_em)}</p>
                </div>
              </Link>
            ))}
            {documentosRecentes.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', padding: '0.75rem 0', textAlign: 'center' }}>
                Nenhum documento recente.
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full h-7 text-xs" render={<Link href={hrefPublico(ROTAS.docs.documentos)} />}>
            Ver todos
          </Button>
        </CartaoPainel>
      </RevelarScroll>
    </SecaoPainel>
  )
}
