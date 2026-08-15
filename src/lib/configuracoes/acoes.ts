'use server'

import { revalidatePath } from 'next/cache'
import { ROTAS } from '@/lib/rotas'
import { exigirAutenticacao, registrarAuditoria } from '@/lib/auth/sessao'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/admin'

export type ConfiguracaoLinha = {
  chave: string
  valor: unknown
  atualizado_em?: string
}

const EXTENSOES_PADRAO = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'rar', 'txt', 'csv',
]

/** Lê um valor de configuração (admin client; ignora RLS). */
export async function obterValorConfiguracao<T>(chave: string, padrao: T): Promise<T> {
  const supabase = criarClienteSupabaseAdmin()
  const { data } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', chave)
    .maybeSingle()

  if (data?.valor === undefined || data?.valor === null) return padrao
  return data.valor as T
}

export async function obterLimitePadraoEmpresaBytes(): Promise<number> {
  const valor = await obterValorConfiguracao<{ mb?: number } | number>(
    'armazenamento_limite_padrao_mb',
    { mb: 5120 },
  )
  if (typeof valor === 'number' && valor > 0) {
    // legado: número puro tratado como MB
    return Math.round(valor * 1024 * 1024)
  }
  const mb = typeof valor === 'object' && valor && 'mb' in valor ? Number(valor.mb) : 5120
  return Math.round((Number.isFinite(mb) && mb > 0 ? mb : 5120) * 1024 * 1024)
}

export async function obterTamanhoMaxUploadBytes(): Promise<number> {
  const valor = await obterValorConfiguracao<number | string>('tamanho_max_upload', 104857600)
  const n = typeof valor === 'string' ? Number(valor) : Number(valor)
  return Number.isFinite(n) && n > 0 ? n : 104857600
}

export async function obterExtensoesPermitidas(): Promise<string[]> {
  const valor = await obterValorConfiguracao<string[] | string>('extensoes_permitidas', EXTENSOES_PADRAO)
  if (Array.isArray(valor)) {
    return valor.map((e) => String(e).toLowerCase().replace(/^\./, '')).filter(Boolean)
  }
  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((e) => String(e).toLowerCase().replace(/^\./, '')).filter(Boolean)
      }
    } catch {
      return valor.split(/[,\s]+/).map((e) => e.toLowerCase().replace(/^\./, '')).filter(Boolean)
    }
  }
  return EXTENSOES_PADRAO
}

export async function listarConfiguracoes(): Promise<ConfiguracaoLinha[]> {
  await exigirAutenticacao(['administrador'])
  const supabase = criarClienteSupabaseAdmin()
  const { data } = await supabase.from('configuracoes').select('*').order('chave')
  return (data ?? []) as ConfiguracaoLinha[]
}

export async function salvarConfiguracao(chave: string, valor: unknown) {
  await exigirAutenticacao(['administrador'])
  const supabase = criarClienteSupabaseAdmin()

  const { error } = await supabase.from('configuracoes').upsert({
    chave,
    valor: valor as Record<string, unknown> | unknown,
    atualizado_em: new Date().toISOString(),
  })

  if (error) return { erro: 'Não foi possível salvar a configuração.' }

  revalidatePath(ROTAS.adm.configuracoes)
  return { sucesso: true }
}

export type DadosConfiguracoesSistema = {
  limitePadraoMb: number
  tamanhoMaxUploadMb: number
  extensoes: string[]
  diasRetencao: number
  emailComunicadoAutomatico: boolean
}

/** Salva o conjunto de parâmetros globais editáveis no painel. */
export async function salvarConfiguracoesSistema(dados: DadosConfiguracoesSistema) {
  const perfil = await exigirAutenticacao(['administrador'])

  const limiteMb = Math.round(Number(dados.limitePadraoMb))
  const uploadMb = Number(dados.tamanhoMaxUploadMb)
  const dias = Math.round(Number(dados.diasRetencao))

  if (!Number.isFinite(limiteMb) || limiteMb <= 0) {
    return { erro: 'Limite de armazenamento inválido.' }
  }
  if (!Number.isFinite(uploadMb) || uploadMb <= 0) {
    return { erro: 'Tamanho máximo de upload inválido.' }
  }
  if (!Number.isFinite(dias) || dias < 0) {
    return { erro: 'Dias de retenção inválidos.' }
  }

  const extensoes = [...new Set(
    (dados.extensoes ?? [])
      .map((e) => e.trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean),
  )]

  if (extensoes.length === 0) {
    return { erro: 'Informe ao menos uma extensão permitida.' }
  }

  const supabase = criarClienteSupabaseAdmin()
  const agora = new Date().toISOString()

  const linhas = [
    { chave: 'armazenamento_limite_padrao_mb', valor: { mb: limiteMb }, atualizado_em: agora, atualizado_por: perfil.id },
    { chave: 'tamanho_max_upload', valor: Math.round(uploadMb * 1024 * 1024), atualizado_em: agora, atualizado_por: perfil.id },
    { chave: 'extensoes_permitidas', valor: extensoes, atualizado_em: agora, atualizado_por: perfil.id },
    { chave: 'dias_retencao', valor: dias, atualizado_em: agora, atualizado_por: perfil.id },
    { chave: 'email_comunicado_automatico', valor: Boolean(dados.emailComunicadoAutomatico), atualizado_em: agora, atualizado_por: perfil.id },
  ]

  const { error } = await supabase.from('configuracoes').upsert(linhas)
  if (error) {
    console.error('[salvarConfiguracoesSistema]', error.message)
    return { erro: 'Não foi possível salvar as configurações.' }
  }

  await registrarAuditoria({
    acao: 'atualizacao',
    usuarioId: perfil.id,
    recurso: 'configuracoes',
    detalhes: {
      limitePadraoMb: limiteMb,
      tamanhoMaxUploadMb: uploadMb,
      diasRetencao: dias,
      emailComunicadoAutomatico: dados.emailComunicadoAutomatico,
      extensoes: extensoes.length,
    },
  })

  revalidatePath(ROTAS.adm.configuracoes)
  return { sucesso: true }
}
