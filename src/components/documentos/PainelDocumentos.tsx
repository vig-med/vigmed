'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconeAnimado } from '@/components/ui/icone-animado'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { Badge, Button } from '@/components/ui'
import { DialogoDetalheDocumento } from '@/components/documentos/DialogoDetalheDocumento'
import { SeletorEmpresasUpload } from '@/components/documentos/SeletorEmpresasUpload'
import { cn, formatarBytes, formatarData } from '@/lib/utils'

interface DocumentoItem {
  id: string
  titulo: string
  nome_arquivo: string
  tamanho_arquivo?: number
  total_downloads: number
  total_visualizacoes?: number
  valido_ate: string | null
  criado_em: string
  categoria_id?: string | null
  origem_publicacao?: 'admin' | 'empresa'
  permitir_compartilhar?: boolean
  enviado_por?: string | null
  categorias?: { nome: string } | null
  documento_empresas?: { empresa_id?: string; empresas?: { nome_fantasia: string } | null }[]
}

interface Props {
  documentos: DocumentoItem[]
  empresas: { id: string; nome_fantasia: string; armazenamento_limite?: number; consumoEmpresa?: number }[]
  categorias: { id: string; nome: string }[]
  modo: 'adm' | 'docs'
  perfilId?: string
  empresaFixa?: { id: string; nome: string }
  tituloPagina?: string
  descricaoPagina?: string
}

export function PainelDocumentos({
  documentos,
  empresas,
  categorias,
  modo,
  perfilId,
  empresaFixa,
  tituloPagina,
  descricaoPagina,
}: Props) {
  const router = useRouter()
  const [busca, definirBusca] = useState('')
  const [empresaId, definirEmpresaId] = useState(empresaFixa?.id ?? '')
  const [categoriaId, definirCategoriaId] = useState('')
  const [empresasUpload, definirEmpresasUpload] = useState<string[]>(
    empresaFixa ? [empresaFixa.id] : [],
  )
  const [documentoAberto, definirDocumentoAberto] = useState<DocumentoItem | null>(null)
  const [arrastando, definirArrastando] = useState(false)
  const [enviando, iniciarEnvio] = useTransition()
  const mostrarStats = modo === 'adm'
  const mostrarSeletorEmpresas = modo === 'adm'

  useEffect(() => {
    if (empresaFixa) {
      definirEmpresasUpload([empresaFixa.id])
      definirEmpresaId(empresaFixa.id)
    }
  }, [empresaFixa])

  const filtrados = useMemo(() => {
    return documentos.filter((d) => {
      if (busca && !d.titulo.toLowerCase().includes(busca.toLowerCase())) return false
      if (categoriaId && d.categoria_id !== categoriaId) return false
      if (empresaId && modo === 'adm') {
        const vinculos = d.documento_empresas ?? []
        if (!vinculos.some((v) => v.empresa_id === empresaId)) return false
      }
      return true
    })
  }, [documentos, busca, empresaId, categoriaId, modo])

  const enviarArquivo = useCallback(
    (arquivo: File) => {
      if (!arquivo) return

      if (modo === 'adm' && empresasUpload.length === 0) {
        toast.error('Selecione ao menos uma empresa para o upload.')
        return
      }

      iniciarEnvio(async () => {
        try {
          const res = await fetch('/api/upload/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nomeArquivo: arquivo.name,
              tipoMime: arquivo.type || 'application/octet-stream',
              tamanho: arquivo.size,
              titulo: arquivo.name.replace(/\.[^.]+$/, ''),
              empresaIds: modo === 'adm' ? empresasUpload : undefined,
              categoriaId: categoriaId || undefined,
            }),
          })
          const dados = await res.json()
          if (!res.ok) {
            toast.error(dados.erro ?? 'Erro no upload.')
            return
          }
          const put = await fetch(dados.urlUpload, {
            method: 'PUT',
            headers: { 'Content-Type': arquivo.type || 'application/octet-stream' },
            body: arquivo,
          })
          if (!put.ok) {
            toast.error('Falha ao enviar arquivo ao armazenamento. Verifique CORS do bucket R2.')
            return
          }
          toast.success('Documento enviado com sucesso.')
          router.refresh()
        } catch {
          toast.error('Falha ao enviar arquivo.')
        }
      })
    },
    [empresasUpload, categoriaId, modo, router],
  )

  function nomesEmpresas(doc: DocumentoItem) {
    const nomes = (doc.documento_empresas ?? [])
      .map((v) => v.empresas?.nome_fantasia)
      .filter(Boolean) as string[]
    return nomes.length ? nomes.join(', ') : '-'
  }

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo={tituloPagina ?? 'Documentos'}
        descricao={
          descricaoPagina ??
          (modo === 'adm'
            ? 'Envie arquivos para uma ou várias empresas. O mesmo arquivo é compartilhado via vínculos, sem duplicar no bucket.'
            : 'Publique e acesse os arquivos da sua empresa.')
        }
        acoes={
          <label className="cursor-pointer">
            <Button variant="primary" size="sm" loading={enviando} render={<span />}>
              <IconeAnimado nome="cloud-upload" tamanho={15} />
              Enviar arquivo
            </Button>
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && enviarArquivo(e.target.files[0])}
            />
          </label>
        }
      />

      {mostrarSeletorEmpresas && (
        <RevelarScroll>
          <SeletorEmpresasUpload
            empresas={empresas}
            selecionadas={empresasUpload}
            onChange={definirEmpresasUpload}
            fixas={empresaFixa ? [empresaFixa.id] : []}
            className="mb-4"
          />
        </RevelarScroll>
      )}

      <RevelarScroll>
        <div className="painel-filtros">
          <div className="painel-busca" style={{ minWidth: 180 }}>
            <IconeAnimado nome="search" tamanho={13} className="painel-busca-icone" />
            <input
              className="painel-busca-input"
              placeholder="Buscar por título..."
              value={busca}
              onChange={(e) => definirBusca(e.target.value)}
            />
          </div>
          {modo === 'adm' && !empresaFixa && (
            <>
              <select className="painel-select" value={empresaId} onChange={(e) => definirEmpresaId(e.target.value)}>
                <option value="">Todas as empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome_fantasia}
                  </option>
                ))}
              </select>
              <select className="painel-select" value={categoriaId} onChange={(e) => definirCategoriaId(e.target.value)}>
                <option value="">Todas as categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.05}>
        <div
          className={cn('painel-dropzone', arrastando && 'painel-dropzone--ativo')}
          onDragOver={(e) => {
            e.preventDefault()
            definirArrastando(true)
          }}
          onDragLeave={() => definirArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            definirArrastando(false)
            const f = e.dataTransfer.files[0]
            if (f) enviarArquivo(f)
          }}
          onClick={() => document.getElementById('upload-input-docs')?.click()}
        >
          <IconeAnimado nome="cloud-upload" tamanho={14} />
          Arraste um arquivo ou clique para enviar. PDF, DOCX e planilhas até 50 MB.
          <input
            id="upload-input-docs"
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && enviarArquivo(e.target.files[0])}
          />
        </div>
      </RevelarScroll>

      <RevelarScroll atraso={0.08}>
        <div className="painel-tabela-wrap">
          <div className="overflow-x-auto">
            <table className="painel-tabela">
              <thead className="painel-tabela-thead">
                <tr>
                  <th>Documento</th>
                  {modo === 'adm' && !empresaFixa && <th className="hidden md:table-cell">Empresas</th>}
                  <th className="hidden sm:table-cell">Categoria</th>
                  {mostrarStats && <th className="hidden lg:table-cell">Origem</th>}
                  <th className="hidden sm:table-cell">Tamanho</th>
                  {mostrarStats && <th className="hidden lg:table-cell">Views</th>}
                  {mostrarStats && <th className="hidden xl:table-cell">Downloads</th>}
                  <th className="hidden md:table-cell">Público</th>
                </tr>
              </thead>
              <tbody className="painel-tabela-tbody">
                {filtrados.map((doc) => (
                  <tr
                    key={doc.id}
                    className="cursor-pointer hover:bg-(--color-surface-2)"
                    onClick={() => definirDocumentoAberto(doc)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <IconeAnimado nome="file-text" tamanho={14} className="shrink-0 text-(--color-text-3)" />
                        <div>
                          <span className="tabela-nome">{doc.titulo}</span>
                          <span className="tabela-sub">{formatarData(doc.criado_em)}</span>
                        </div>
                      </div>
                    </td>
                    {modo === 'adm' && !empresaFixa && (
                      <td className="hidden md:table-cell">
                        <span className="tabela-mono text-xs">{nomesEmpresas(doc)}</span>
                      </td>
                    )}
                    <td className="hidden sm:table-cell">
                      {doc.categorias ? (
                        <Badge variant="default" className="text-[10px] py-0">
                          {doc.categorias.nome}
                        </Badge>
                      ) : (
                        <span className="tabela-mono">-</span>
                      )}
                    </td>
                    {mostrarStats && (
                      <td className="hidden lg:table-cell">
                        <Badge
                          variant={doc.origem_publicacao === 'empresa' ? 'default' : 'success'}
                          className="text-[10px] py-0"
                        >
                          {doc.origem_publicacao === 'empresa' ? 'Empresa' : 'VIGMED'}
                        </Badge>
                      </td>
                    )}
                    <td className="hidden sm:table-cell tabela-mono">
                      {doc.tamanho_arquivo ? formatarBytes(doc.tamanho_arquivo) : '-'}
                    </td>
                    {mostrarStats && (
                      <td className="hidden lg:table-cell tabela-mono">{doc.total_visualizacoes ?? 0}</td>
                    )}
                    {mostrarStats && (
                      <td className="hidden xl:table-cell tabela-mono">{doc.total_downloads}</td>
                    )}
                    <td className="hidden md:table-cell">
                      <Badge variant={doc.permitir_compartilhar ? 'success' : 'default'} className="text-[10px] py-0">
                        {doc.permitir_compartilhar ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtrados.length === 0 && (
            <div className="painel-vazio">
              <IconeAnimado nome="file-text" tamanho={22} className="opacity-40" />
              Nenhum documento encontrado.
            </div>
          )}
        </div>
      </RevelarScroll>

      <p className="mt-2 text-xs text-(--color-text-3)">Clique em um documento para ver detalhes, preview e compartilhar.</p>

      <DialogoDetalheDocumento
        documento={documentoAberto}
        aberto={!!documentoAberto}
        onFechar={() => definirDocumentoAberto(null)}
        empresas={empresas}
        modo={modo}
        perfilId={perfilId}
      />
    </SecaoPainel>
  )
}
