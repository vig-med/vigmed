'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { PillsFiltro } from '@/components/layout/PillsFiltro'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { alterarStatusPostBlog, excluirPostBlog } from '@/lib/blog/acoes'
import { ROTAS } from '@/lib/rotas'
import { cn, formatarDataHora } from '@/lib/utils'
import type { PostBlog } from '@/types'
import type { EstatisticasPostBlog, StatusPostBlog } from '@/lib/blog/tipos'

type Aba = 'todos' | StatusPostBlog

const ROTULO_STATUS: Record<StatusPostBlog, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
}

interface Props {
  postsIniciais: PostBlog[]
  estatisticas: EstatisticasPostBlog[]
}

export function PainelBlogAdm({ postsIniciais, estatisticas }: Props) {
  const router = useRouter()
  const [aba, definirAba] = useState<Aba>('todos')
  const [busca, definirBusca] = useState('')
  const [pendente, iniciar] = useTransition()

  const mapaStats = useMemo(
    () => new Map(estatisticas.map((e) => [e.postId, e])),
    [estatisticas],
  )

  const posts = useMemo(() => {
    return postsIniciais.filter((p) => {
      if (aba !== 'todos' && p.status !== aba) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (!p.titulo.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [postsIniciais, aba, busca])

  const totais = useMemo(() => {
    const publicados = postsIniciais.filter((p) => p.status === 'publicado')
    const views = postsIniciais.reduce((s, p) => s + (p.total_visualizacoes ?? 0), 0)
    const views7d = estatisticas.reduce((s, e) => s + e.visualizacoes7d, 0)
    return { publicados: publicados.length, views, views7d }
  }, [postsIniciais, estatisticas])

  function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return
    iniciar(async () => {
      const r = await excluirPostBlog(id)
      if (r.erro) toast.error(r.erro)
      else {
        toast.success('Post excluído.')
        router.refresh()
      }
    })
  }

  function arquivar(id: string) {
    iniciar(async () => {
      const r = await alterarStatusPostBlog(id, 'arquivado')
      if (r.erro) toast.error(r.erro)
      else {
        toast.success('Post arquivado.')
        router.refresh()
      }
    })
  }

  return (
    <SecaoPainel>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <CabecalhoPagina
          titulo="Blog VIGMED (em desenvolvimento)"
          descricao="Seção em desenvolvimento. A criação de novos posts estará disponível em breve."
        />
        <Button type="button" disabled className="h-8 gap-1.5 px-2.5">
          <Plus size={16} />
          Novo post (em desenvolvimento)
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="surface-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totais.publicados}</p>
              <p className="text-xs text-muted-foreground">Posts publicados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totais.views.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Visualizações totais</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totais.views7d.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <PillsFiltro
          opcoes={[
            { id: 'todos', rotulo: 'Todos' },
            { id: 'publicado', rotulo: 'Publicados' },
            { id: 'rascunho', rotulo: 'Rascunhos' },
            { id: 'arquivado', rotulo: 'Arquivados' },
          ]}
          ativo={aba}
          onChange={(id) => definirAba(id as Aba)}
        />
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border border-input bg-transparent pl-9 pr-3 py-2 text-sm"
            placeholder="Buscar posts..."
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {posts.map((post) => {
          const stats = mapaStats.get(post.id)
          return (
            <Card key={post.id} className="surface-card overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                {post.imagem_capa_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imagem_capa_url}
                    alt=""
                    className="w-full md:w-28 h-20 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{post.titulo}</h3>
                    <Badge
                      variant={post.status === 'publicado' ? 'success' : 'info'}
                      className={cn(post.status === 'arquivado' && 'opacity-70')}
                    >
                      {ROTULO_STATUS[post.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">/{post.slug}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Atualizado {formatarDataHora(post.atualizado_em)}</span>
                    {post.publicado_em && <span>Publicado {formatarDataHora(post.publicado_em)}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} />
                      {post.total_visualizacoes ?? 0} views
                      {stats && stats.visualizacoes7d > 0 && ` · ${stats.visualizacoes7d} (7d)`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {post.status === 'publicado' && (
                    <a
                      href={ROTAS.blog.post(post.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-button-bg)] px-2.5 text-[0.8rem] font-medium hover:bg-[var(--glass-nav-hover)]"
                    >
                      <Eye size={14} />
                      Ver
                    </a>
                  )}
                  <Link
                    href={ROTAS.adm.blogEditar(post.id)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-button-bg)] px-2.5 text-[0.8rem] font-medium hover:bg-[var(--glass-nav-hover)]"
                  >
                    <Pencil size={14} />
                    Editar
                  </Link>
                  {post.status !== 'arquivado' && (
                    <Button variant="ghost" size="sm" disabled={pendente} onClick={() => arquivar(post.id)}>
                      Arquivar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={pendente}
                    onClick={() => excluir(post.id, post.titulo)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {!posts.length && (
          <div className="surface-card p-12 text-center text-muted-foreground">
            Nenhum post encontrado.
          </div>
        )}
      </div>
    </SecaoPainel>
  )
}
