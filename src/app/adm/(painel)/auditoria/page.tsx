import { Suspense } from 'react'
import { listarAuditoria } from '@/lib/auditoria/acoes'
import { PainelAuditoria } from '@/components/auditoria/PainelAuditoria'

export const metadata = { title: 'Auditoria · VIGMED Admin' }

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function valor(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] ?? '' : v ?? ''
}

export default async function PaginaAuditoria({ searchParams }: Props) {
  const params = await searchParams
  const pagina = Math.max(1, Number(valor(params.pagina)) || 1)
  const busca = valor(params.busca)
  const acao = valor(params.acao)
  const dataInicio = valor(params.de)
  const dataFim = valor(params.ate)

  const resultado = await listarAuditoria({
    pagina,
    porPagina: 50,
    busca: busca || undefined,
    acao: acao || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  })

  return (
    <Suspense fallback={null}>
      <PainelAuditoria
        registros={resultado.registros}
        total={resultado.total}
        pagina={resultado.pagina}
        porPagina={resultado.porPagina}
        totalPaginas={resultado.totalPaginas}
        dataInicio={dataInicio}
        dataFim={dataFim}
        acaoInicial={acao}
        buscaInicial={busca}
      />
    </Suspense>
  )
}
