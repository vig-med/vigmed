'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink, Save, Send } from 'lucide-react'
import { EditorBlog } from '@/components/blog/EditorBlog'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { criarPostBlog, atualizarPostBlog } from '@/lib/blog/acoes'
import { gerarSlug } from '@/lib/blog/gerar-slug'
import { ROTAS, hrefPublico } from '@/lib/rotas'
import { obterUrlBaseDoAmbiente } from '@/lib/ambiente'
import type { PostBlog } from '@/types'
import type { StatusPostBlog } from '@/lib/blog/tipos'

interface Props {
  post?: PostBlog | null
}

export function FormularioPostBlog({ post }: Props) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const editando = Boolean(post?.id)

  const [postId, definirPostId] = useState(post?.id ?? '')
  const [titulo, definirTitulo] = useState(post?.titulo ?? '')
  const [slug, definirSlug] = useState(post?.slug ?? '')
  const [resumo, definirResumo] = useState(post?.resumo ?? '')
  const [corpoHtml, definirCorpoHtml] = useState(post?.corpo_html ?? '')
  const [metaTitulo, definirMetaTitulo] = useState(post?.meta_titulo ?? '')
  const [metaDescricao, definirMetaDescricao] = useState(post?.meta_descricao ?? '')
  const [tagsTexto, definirTagsTexto] = useState((post?.tags ?? []).join(', '))
  const [imagemCapaUrl, definirImagemCapaUrl] = useState(post?.imagem_capa_url ?? '')
  const [imagemCapaChave, definirImagemCapaChave] = useState(post?.imagem_capa_chave ?? '')
  const [status, definirStatus] = useState<StatusPostBlog>(post?.status ?? 'rascunho')

  const slugPreview = slug.trim() || gerarSlug(titulo)
  const urlBlog = `${obterUrlBaseDoAmbiente('blog')}${ROTAS.blog.post(slugPreview)}`

  async function enviarCapa(arquivo: File) {
    const resposta = await fetch('/api/upload/presign-blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeArquivo: arquivo.name,
        tipoMime: arquivo.type,
        tamanho: arquivo.size,
        postId: postId || undefined,
      }),
    })
    if (!resposta.ok) {
      toast.error('Erro ao preparar capa.')
      return
    }
    const dados = await resposta.json()
    const put = await fetch(dados.urlUpload, {
      method: 'PUT',
      headers: { 'Content-Type': arquivo.type },
      body: arquivo,
    })
    if (!put.ok) {
      toast.error('Erro ao enviar capa.')
      return
    }
    if (!postId && dados.postId) definirPostId(dados.postId)
    definirImagemCapaUrl(dados.urlExibicao)
    definirImagemCapaChave(dados.chaveArquivo)
    toast.success('Capa enviada.')
  }

  function salvar(publicar: boolean) {
    if (!titulo.trim()) {
      toast.error('Informe o título.')
      return
    }
    if (!corpoHtml.trim() || corpoHtml === '<p></p>') {
      toast.error('Escreva o conteúdo do post.')
      return
    }

    const tags = tagsTexto
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      titulo,
      slug: slug || gerarSlug(titulo),
      resumo,
      corpoHtml,
      imagemCapaUrl: imagemCapaUrl || null,
      imagemCapaChave: imagemCapaChave || null,
      metaTitulo: metaTitulo || titulo,
      metaDescricao: metaDescricao || resumo,
      tags,
      status: publicar ? ('publicado' as const) : status,
      publicar,
    }

    iniciar(async () => {
      const resultado = editando
        ? await atualizarPostBlog(post!.id, payload)
        : await criarPostBlog(payload)

      if (resultado.erro) {
        toast.error(resultado.erro)
        return
      }

      toast.success(publicar ? 'Post publicado!' : 'Rascunho salvo.')
      if (!editando && 'id' in resultado && resultado.id) {
        router.push(hrefPublico(ROTAS.adm.blogEditar(resultado.id)))
      } else {
        router.refresh()
      }
    })
  }

  return (
    <SecaoPainel className="max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Link href={hrefPublico(ROTAS.adm.blog)} className="btn-icon-glass">
            <ArrowLeft size={16} />
          </Link>
          <CabecalhoPagina
            titulo={editando ? 'Editar post' : 'Novo post'}
            descricao="Redija, adicione imagens e publique no blog público."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pendente} onClick={() => salvar(false)}>
            <Save size={16} />
            Salvar rascunho
          </Button>
          <Button disabled={pendente} onClick={() => salvar(true)}>
            <Send size={16} />
            Publicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(e) => {
                definirTitulo(e.target.value)
                if (!slug || slug === gerarSlug(titulo)) definirSlug(gerarSlug(e.target.value))
              }}
              placeholder="Título do artigo"
            />
          </div>

          <EditorBlog
            conteudo={corpoHtml}
            onChange={definirCorpoHtml}
            postId={postId || undefined}
            onPostId={definirPostId}
          />
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Publicação</Label>
            <div className="space-y-2">
              <Label className="text-sm">Slug (URL)</Label>
              <Input value={slug} onChange={(e) => definirSlug(gerarSlug(e.target.value))} />
              <a
                href={urlBlog}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {slugPreview}
                <ExternalLink size={12} />
              </a>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Status</Label>
              <select
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                value={status}
                onChange={(e) => definirStatus(e.target.value as StatusPostBlog)}
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          <div className="surface-card p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">SEO</Label>
            <div className="space-y-2">
              <Label className="text-sm">Meta título</Label>
              <Input value={metaTitulo} onChange={(e) => definirMetaTitulo(e.target.value)} placeholder={titulo || 'Título para Google'} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Meta descrição</Label>
              <Textarea
                value={metaDescricao}
                onChange={(e) => definirMetaDescricao(e.target.value)}
                rows={3}
                placeholder="Resumo para resultados de busca"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Tags (vírgula)</Label>
              <Input value={tagsTexto} onChange={(e) => definirTagsTexto(e.target.value)} placeholder="saúde, documentos, compliance" />
            </div>
          </div>

          <div className="surface-card p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Capa</Label>
            <p className="text-xs text-muted-foreground">Imagem de destaque e compartilhamento social.</p>
            {imagemCapaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemCapaUrl} alt="Capa" className="w-full rounded-xl object-cover max-h-40" />
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = () => {
                  const arq = input.files?.[0]
                  if (arq) void enviarCapa(arq)
                }
                input.click()
              }}
            >
              {imagemCapaUrl ? 'Trocar capa' : 'Enviar capa'}
            </Button>
          </div>

          <div className="surface-card p-4 space-y-2">
            <Label className="text-sm">Resumo</Label>
            <Textarea
              value={resumo}
              onChange={(e) => definirResumo(e.target.value)}
              rows={4}
              placeholder="Breve descrição exibida na listagem"
            />
          </div>
        </aside>
      </div>
    </SecaoPainel>
  )
}
