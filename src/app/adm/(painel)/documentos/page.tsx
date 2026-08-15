import { listarDocumentos, listarCategorias } from '@/lib/documentos/acoes'
import { listarEmpresasResumo } from '@/lib/empresas/acoes'
import { obterConsumoPorEmpresas } from '@/lib/documentos/armazenamento'
import { PainelDocumentos } from '@/components/documentos/PainelDocumentos'

export const metadata = { title: 'Documentos · VIGMED Admin' }

export default async function PaginaDocumentosAdmin() {
  const [{ documentos }, empresas, categorias] = await Promise.all([
    listarDocumentos(),
    listarEmpresasResumo(),
    listarCategorias(),
  ])

  const consumo = await obterConsumoPorEmpresas(empresas.map((e) => e.id))
  const empresasComCota = empresas.map((e) => ({
    ...e,
    consumoEmpresa: consumo.get(e.id)?.empresa ?? 0,
  }))

  return (
    <PainelDocumentos
      documentos={documentos ?? []}
      empresas={empresasComCota}
      categorias={categorias}
      modo="adm"
    />
  )
}
