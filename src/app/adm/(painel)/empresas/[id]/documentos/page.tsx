import { notFound } from 'next/navigation'
import Link from 'next/link'
import { listarDocumentos, listarCategorias } from '@/lib/documentos/acoes'
import { obterEmpresa, listarEmpresasResumo } from '@/lib/empresas/acoes'
import { PainelDocumentos } from '@/components/documentos/PainelDocumentos'
import { ROTAS, hrefPublico } from '@/lib/rotas'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Documentos da empresa · VIGMED Admin' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function PaginaDocumentosEmpresa({ params }: Props) {
  const { id } = await params
  const [{ empresa }, { documentos }, empresas, categorias] = await Promise.all([
    obterEmpresa(id),
    listarDocumentos({ empresaId: id }),
    listarEmpresasResumo(),
    listarCategorias(),
  ])

  if (!empresa) notFound()

  return (
    <>
      <div className="px-1 pb-2">
        <Link
          href={hrefPublico(ROTAS.adm.empresa(id))}
          className="inline-flex items-center gap-1 text-sm text-(--color-text-3) hover:text-(--color-text-1)"
        >
          <ArrowLeft size={14} />
          {empresa.nome_fantasia}
        </Link>
      </div>
      <PainelDocumentos
        documentos={documentos ?? []}
        empresas={empresas}
        categorias={categorias}
        modo="adm"
        empresaFixa={{ id: empresa.id, nome: empresa.nome_fantasia }}
        tituloPagina={`Documentos · ${empresa.nome_fantasia}`}
        descricaoPagina="Arquivos vinculados a esta empresa. Um mesmo arquivo pode ser compartilhado com outras sem duplicar no armazenamento."
      />
    </>
  )
}
