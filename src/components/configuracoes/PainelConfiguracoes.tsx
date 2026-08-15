'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel, CartaoPainel } from '@/components/layout/SecaoPainel'
import { Button, Input } from '@/components/ui'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import {
  salvarConfiguracoesSistema,
  type ConfiguracaoLinha,
} from '@/lib/configuracoes/acoes'

interface Props {
  configuracoes: ConfiguracaoLinha[]
}

function lerValor(configs: ConfiguracaoLinha[], chave: string): unknown {
  return configs.find((c) => c.chave === chave)?.valor
}

function limiarPadraoMb(configs: ConfiguracaoLinha[]): number {
  const v = lerValor(configs, 'armazenamento_limite_padrao_mb')
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'mb' in v) return Number((v as { mb: number }).mb) || 5120
  return 5120
}

function uploadPadraoMb(configs: ConfiguracaoLinha[]): number {
  const v = lerValor(configs, 'tamanho_max_upload')
  const bytes = typeof v === 'string' ? Number(v) : Number(v)
  if (!Number.isFinite(bytes) || bytes <= 0) return 100
  return Math.round((bytes / (1024 * 1024)) * 100) / 100
}

function extensoesPadrao(configs: ConfiguracaoLinha[]): string {
  const v = lerValor(configs, 'extensoes_permitidas')
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown
      if (Array.isArray(parsed)) return parsed.join(', ')
    } catch {
      return v
    }
  }
  return 'pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png, gif, webp, zip, rar, txt, csv'
}

function diasPadrao(configs: ConfiguracaoLinha[]): number {
  const v = lerValor(configs, 'dias_retencao')
  const n = typeof v === 'string' ? Number(v) : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function emailPadrao(configs: ConfiguracaoLinha[]): boolean {
  const v = lerValor(configs, 'email_comunicado_automatico')
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === true) return true
  return false
}

function legendaMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return 'Digite um valor em MB'
  const mbFmt = parseFloat(mb.toFixed(mb < 10 ? 2 : mb % 1 === 0 ? 0 : 1))
  if (mb < 1024) return `${mbFmt} MB`
  const gb = mb / 1024
  const gbFmt = parseFloat(gb.toFixed(gb < 10 ? 2 : 1))
  return `${mbFmt} MB = ${gbFmt} GB`
}

export function PainelConfiguracoes({ configuracoes }: Props) {
  const router = useRouter()
  const { pendente, executar } = useAcaoPendente<'salvar'>()

  const [limiteMb, definirLimiteMb] = useState(() => String(limiarPadraoMb(configuracoes)))
  const [uploadMb, definirUploadMb] = useState(() => String(uploadPadraoMb(configuracoes)))
  const [extensoes, definirExtensoes] = useState(() => extensoesPadrao(configuracoes))
  const [diasRetencao, definirDiasRetencao] = useState(() => String(diasPadrao(configuracoes)))
  const [emailAuto, definirEmailAuto] = useState(() => emailPadrao(configuracoes))

  const legendaLimite = useMemo(() => legendaMb(Number(limiteMb)), [limiteMb])
  const legendaUpload = useMemo(() => legendaMb(Number(uploadMb)), [uploadMb])

  function salvar() {
    void executar('salvar', async () => {
      const listaExt = extensoes
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean)

      const resultado = await salvarConfiguracoesSistema({
        limitePadraoMb: Number(limiteMb),
        tamanhoMaxUploadMb: Number(uploadMb),
        extensoes: listaExt,
        diasRetencao: Number(diasRetencao),
        emailComunicadoAutomatico: emailAuto,
      })

      if (resultado.erro) {
        toast.error(resultado.erro)
        return
      }
      toast.success('Configurações salvas.')
      router.refresh()
    })
  }

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Parâmetros globais da plataforma. Alterações valem para novas ações (upload, empresas novas, comunicados)."
        acoes={
          <Button variant="primary" size="sm" loading={pendente('salvar')} onClick={salvar}>
            Salvar alterações
          </Button>
        }
      />

      <CartaoPainel
        titulo="Armazenamento padrão por empresa"
        descricao="Cota inicial aplicada automaticamente ao cadastrar uma empresa nova. Empresas já existentes não mudam sozinhas; edite a cota na ficha da empresa se precisar."
      >
        <div className="flex flex-col sm:flex-row gap-3 items-end max-w-lg">
          <Input
            label="Limite padrão (MB)"
            type="number"
            min={1}
            step={1}
            value={limiteMb}
            onChange={(e) => definirLimiteMb(e.target.value)}
            hint={legendaLimite}
          />
        </div>
      </CartaoPainel>

      <CartaoPainel
        titulo="Upload de arquivos"
        descricao="Regras aplicadas no envio de documentos (admin e empresas)."
      >
        <div className="grid gap-4 max-w-2xl">
          <Input
            label="Tamanho máximo por arquivo (MB)"
            type="number"
            min={0.1}
            step={0.1}
            value={uploadMb}
            onChange={(e) => definirUploadMb(e.target.value)}
            hint={legendaUpload}
          />

          <div className="painel-campo">
            <label className="painel-label">Extensões permitidas</label>
            <textarea
              className="painel-textarea"
              rows={3}
              value={extensoes}
              onChange={(e) => definirExtensoes(e.target.value)}
              placeholder="pdf, docx, xlsx, png..."
            />
            <p className="text-xs text-(--color-text-3) mt-1.5">
              Separe por vírgula. Sem ponto (use <code>pdf</code>, não <code>.pdf</code>).
              Só esses tipos podem ser enviados.
            </p>
          </div>
        </div>
      </CartaoPainel>

      <CartaoPainel
        titulo="Retenção de documentos"
        descricao="Política de tempo de vida dos arquivos na plataforma. Exclusão automática pode ser ligada depois sem mudar este campo. Não foi feito o teste ainda."
      >
        <div className="max-w-lg">
          <Input
            label="Dias de retenção"
            type="number"
            min={0}
            step={1}
            value={diasRetencao}
            onChange={(e) => definirDiasRetencao(e.target.value)}
            hint="0 = manter indefinidamente. Ex.: 365 remove (quando automatizado) arquivos com mais de 1 ano."
          />
        </div>
      </CartaoPainel>

      <CartaoPainel
        titulo="Comunicados"
        descricao="Comportamento de avisos enviados às empresas."
      >
        <label className="flex items-start gap-3 cursor-pointer max-w-xl">
          <input
            type="checkbox"
            className="mt-1"
            checked={emailAuto}
            onChange={(e) => definirEmailAuto(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-(--color-text-1)">
              E-mail automático ao publicar comunicado
            </span>
            <span className="block text-xs text-(--color-text-3) mt-0.5">
              Se ativo, a plataforma pode disparar e-mail para usuários das empresas destinatárias
              quando um comunicado for publicado. Se desligado, o aviso aparece só no portal Docs. Mas não recomendo usar, porque o SMTP do db é muito limitado.
            </span>
          </span>
        </label>
      </CartaoPainel>
    </SecaoPainel>
  )
}
