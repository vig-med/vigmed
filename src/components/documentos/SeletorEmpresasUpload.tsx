'use client'

import { cn, formatarBytes } from '@/lib/utils'

export interface EmpresaUploadOpcao {
  id: string
  nome_fantasia: string
  armazenamento_limite?: number
  consumoEmpresa?: number
}

interface Props {
  empresas: EmpresaUploadOpcao[]
  selecionadas: string[]
  onChange: (ids: string[]) => void
  fixas?: string[]
  titulo?: string
  className?: string
}

export function SeletorEmpresasUpload({
  empresas,
  selecionadas,
  onChange,
  fixas = [],
  titulo = 'Empresas destino',
  className,
}: Props) {
  const idsFixas = new Set(fixas)
  const selecionaveis = empresas.filter((e) => !idsFixas.has(e.id))
  const todasSelecionadas =
    selecionaveis.length > 0 && selecionaveis.every((e) => selecionadas.includes(e.id))

  function alternar(id: string) {
    if (idsFixas.has(id)) return
    onChange(
      selecionadas.includes(id)
        ? selecionadas.filter((x) => x !== id)
        : [...selecionadas, id],
    )
  }

  function alternarTodas() {
    if (todasSelecionadas) {
      onChange(selecionadas.filter((id) => idsFixas.has(id)))
    } else {
      onChange([...new Set([...selecionadas, ...selecionaveis.map((e) => e.id)])])
    }
  }

  return (
    <div className={cn('rounded-xl border border-(--color-border) bg-(--color-surface) p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-(--color-text-1)">
          {titulo}
          {selecionadas.length > 0 && (
            <span className="ml-2 text-xs font-normal text-(--color-text-3)">
              ({selecionadas.length})
            </span>
          )}
        </span>
        {selecionaveis.length > 1 && (
          <button
            type="button"
            className="text-xs font-medium text-(--color-accent) hover:underline"
            onClick={alternarTodas}
          >
            {todasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        )}
      </div>

      <p className="text-xs text-(--color-text-3) mb-2">
        Upload admin não consome a cota da empresa. A barra mostra o uso atual dos arquivos enviados pela empresa.
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-56 overflow-y-auto">
        {empresas.map((e) => {
          const fixa = idsFixas.has(e.id)
          const marcada = selecionadas.includes(e.id)
          const limite = e.armazenamento_limite ?? 0
          const usado = e.consumoEmpresa ?? 0
          const pct = limite > 0 ? Math.min((usado / limite) * 100, 100) : 0
          const quaseCheia = pct >= 90

          return (
            <label
              key={e.id}
              className={cn(
                'flex flex-col gap-1.5 rounded-lg border px-2 py-1.5 text-sm cursor-pointer transition-colors',
                marcada
                  ? 'border-(--color-accent) bg-(--color-info-bg)'
                  : 'border-(--color-border) text-(--color-text-2)',
                fixa && 'opacity-80 cursor-default',
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={marcada}
                  disabled={fixa}
                  onChange={() => alternar(e.id)}
                />
                <span className="truncate font-medium">{e.nome_fantasia}</span>
                {fixa && <span className="text-[10px] text-(--color-text-3)">(fixa)</span>}
              </span>
              {limite > 0 && (
                <span className="pl-6">
                  <span className="barra-uso block">
                    <span
                      className={cn('barra-uso-fill', quaseCheia && 'barra-uso-fill--alerta')}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className={cn('tabela-mono text-[10px]', quaseCheia && 'text-(--color-danger)')}>
                    {formatarBytes(usado)} / {formatarBytes(limite)} ({pct.toFixed(0)}%)
                  </span>
                </span>
              )}
            </label>
          )
        })}
      </div>

      {selecionadas.length === 0 && (
        <p className="mt-2 text-xs text-(--color-warning)">
          Selecione ao menos uma empresa antes de enviar arquivos.
        </p>
      )}
    </div>
  )
}
