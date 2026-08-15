'use client'

import { Check, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  ariaLabel: string
  confirmando: boolean
  desabilitado?: boolean
  onPedir: () => void
  onConfirmar: () => void
  onCancelar: () => void
  /** Visual mais compacto para chat / listas densas */
  compacta?: boolean
  /** Texto curto na confirmação */
  rotuloConfirmar?: string
}

/** Exclusão na linha: lixeira → confirma / cancela */
export function ConfirmacaoExclusaoInline({
  ariaLabel,
  confirmando,
  desabilitado,
  onPedir,
  onConfirmar,
  onCancelar,
  compacta = false,
  rotuloConfirmar = 'Excluir?',
}: Props) {
  if (confirmando) {
    return (
      <div
        className={cn(
          'exclusao-inline exclusao-inline--confirmando',
          compacta && 'exclusao-inline--compacta',
        )}
        role="group"
        aria-label={`Confirmar ${ariaLabel}`}
      >
        <span className="exclusao-inline-rotulo">{rotuloConfirmar}</span>
        <button
          type="button"
          className="exclusao-inline-btn exclusao-inline-btn--ok"
          disabled={desabilitado}
          onClick={onConfirmar}
          aria-label={`Confirmar ${ariaLabel}`}
        >
          <Check size={compacta ? 13 : 14} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="exclusao-inline-btn exclusao-inline-btn--cancelar"
          disabled={desabilitado}
          onClick={onCancelar}
          aria-label="Cancelar exclusão"
        >
          <X size={compacta ? 13 : 14} strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'exclusao-inline exclusao-inline-btn exclusao-inline-btn--pedir',
        compacta && 'exclusao-inline--compacta',
      )}
      disabled={desabilitado}
      onClick={onPedir}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Trash2 size={compacta ? 13 : 14} strokeWidth={2.2} />
    </button>
  )
}
