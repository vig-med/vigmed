'use server'

import { revalidatePath } from 'next/cache'
import { ROTAS } from '@/lib/rotas'
import { exigirAutenticacao, ehAdministrador, registrarAuditoria } from '@/lib/auth/sessao'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/admin'
import { criarClienteSupabaseServidor } from '@/lib/supabase/servidor'
import type { Comunicado, PrioridadeComunicado } from '@/types'

export type ComunicadoComLido = Comunicado & { lido: boolean }

export type ComunicadoAdmin = Comunicado & { empresa_ids: string[] }

export type VisualizacaoEmpresa = {
  empresa_id: string
  nome: string
  visualizou: boolean
  lido_em: string | null
}

function corpoTemTexto(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length > 0
}

export async function listarComunicadosAdmin(filtros?: {
  busca?: string
  aba?: 'ativos' | 'rascunhos' | 'historico'
}) {
  await exigirAutenticacao(['administrador'])
  const supabase = await criarClienteSupabaseServidor()

  let query = supabase
    .from('comunicados')
    .select('*, comunicado_empresas(empresa_id)')
    .order('fixado', { ascending: false })
    .order('publicado_em', { ascending: false })

  const aba = filtros?.aba
  if (aba === 'ativos') query = query.eq('ativo', true)
  else if (aba === 'rascunhos') query = query.eq('ativo', false).contains('metadados', { rascunho: true })
  else if (aba === 'historico') query = query.eq('ativo', false).not('metadados', 'cs', '{"rascunho":true}')

  if (filtros?.busca) {
    query = query.or(`titulo.ilike.%${filtros.busca}%,corpo.ilike.%${filtros.busca}%`)
  }

  const { data, error } = await query
  if (error) return { erro: 'Erro ao listar comunicados.', comunicados: [] as ComunicadoAdmin[] }

  const comunicados = (data ?? []).map((row) => {
    const { comunicado_empresas, ...resto } = row as Comunicado & {
      comunicado_empresas?: { empresa_id: string }[]
    }
    return {
      ...resto,
      empresa_ids: comunicado_empresas?.map((v) => v.empresa_id) ?? [],
    } as ComunicadoAdmin
  })

  return { comunicados }
}

export async function listarComunicadosEmpresa() {
  const perfil = await exigirAutenticacao()
  const supabase = await criarClienteSupabaseServidor()

  const { data: todos } = await supabase
    .from('comunicados')
    .select('*')
    .eq('ativo', true)
    .order('fixado', { ascending: false })
    .order('publicado_em', { ascending: false })

  if (!todos) return { comunicados: [] as ComunicadoComLido[], naoLidos: 0 }

  if (ehAdministrador(perfil.papel) || !perfil.empresa_id) {
    return {
      comunicados: (todos as Comunicado[]).map((c) => ({ ...c, lido: true })),
      naoLidos: 0,
    }
  }

  const { data: vinculos } = await supabase
    .from('comunicado_empresas')
    .select('comunicado_id')
    .eq('empresa_id', perfil.empresa_id)

  const idsVinculados = new Set(vinculos?.map((v) => v.comunicado_id) ?? [])
  const filtrados = (todos as Comunicado[]).filter((c) => c.para_todos || idsVinculados.has(c.id))

  const { data: leituras } = await supabase
    .from('comunicado_leituras')
    .select('comunicado_id')
    .eq('usuario_id', perfil.id)

  const lidos = new Set(leituras?.map((l) => l.comunicado_id) ?? [])
  const comunicados = filtrados.map((c) => ({ ...c, lido: lidos.has(c.id) }))
  const naoLidos = comunicados.filter((c) => !c.lido).length

  return { comunicados, naoLidos }
}

async function sincronizarEmpresas(
  comunicadoId: string,
  paraTodos: boolean,
  empresaIds: string[] | undefined,
) {
  const admin = criarClienteSupabaseAdmin()
  await admin.from('comunicado_empresas').delete().eq('comunicado_id', comunicadoId)

  if (!paraTodos && empresaIds?.length) {
    await admin.from('comunicado_empresas').insert(
      empresaIds.map((empresaId) => ({
        comunicado_id: comunicadoId,
        empresa_id: empresaId,
      })),
    )
  }
}

export async function publicarComunicado(dados: {
  titulo: string
  corpo: string
  prioridade: PrioridadeComunicado
  paraTodos: boolean
  empresaIds?: string[]
  fixado?: boolean
  rascunho?: boolean
}) {
  const perfil = await exigirAutenticacao(['administrador'])

  if (!dados.titulo.trim() || !corpoTemTexto(dados.corpo)) {
    return { erro: 'Preencha título e mensagem.' }
  }

  const admin = criarClienteSupabaseAdmin()

  const { data: comunicado, error } = await admin
    .from('comunicados')
    .insert({
      titulo: dados.titulo.trim(),
      corpo: dados.corpo,
      prioridade: dados.prioridade,
      para_todos: dados.paraTodos,
      fixado: dados.fixado ?? false,
      ativo: !dados.rascunho,
      autor_id: perfil.id,
      metadados: dados.rascunho ? { rascunho: true } : {},
    })
    .select('id')
    .single()

  if (error || !comunicado) return { erro: 'Não foi possível publicar o comunicado.' }

  await sincronizarEmpresas(comunicado.id, dados.paraTodos, dados.empresaIds)

  await registrarAuditoria({
    acao: 'criacao',
    usuarioId: perfil.id,
    recurso: 'comunicado',
    recursoId: comunicado.id,
    detalhes: { titulo: dados.titulo, rascunho: dados.rascunho },
  })

  revalidatePath(ROTAS.adm.comunicados)
  revalidatePath(ROTAS.docs.comunicados)
  return { sucesso: true }
}

export async function atualizarComunicado(dados: {
  id: string
  titulo: string
  corpo: string
  prioridade: PrioridadeComunicado
  paraTodos: boolean
  empresaIds?: string[]
  fixado?: boolean
  rascunho?: boolean
}) {
  const perfil = await exigirAutenticacao(['administrador'])

  if (!dados.titulo.trim() || !corpoTemTexto(dados.corpo)) {
    return { erro: 'Preencha título e mensagem.' }
  }

  const admin = criarClienteSupabaseAdmin()

  const { error } = await admin
    .from('comunicados')
    .update({
      titulo: dados.titulo.trim(),
      corpo: dados.corpo,
      prioridade: dados.prioridade,
      para_todos: dados.paraTodos,
      fixado: dados.fixado ?? false,
      ativo: !dados.rascunho,
      metadados: dados.rascunho ? { rascunho: true } : {},
    })
    .eq('id', dados.id)

  if (error) return { erro: 'Não foi possível atualizar o comunicado.' }

  await sincronizarEmpresas(dados.id, dados.paraTodos, dados.empresaIds)

  await registrarAuditoria({
    acao: 'atualizacao',
    usuarioId: perfil.id,
    recurso: 'comunicado',
    recursoId: dados.id,
    detalhes: { titulo: dados.titulo, rascunho: dados.rascunho },
  })

  revalidatePath(ROTAS.adm.comunicados)
  revalidatePath(ROTAS.docs.comunicados)
  return { sucesso: true }
}

export async function excluirComunicado(comunicadoId: string) {
  const perfil = await exigirAutenticacao(['administrador'])
  const admin = criarClienteSupabaseAdmin()

  const { data: existente } = await admin
    .from('comunicados')
    .select('titulo')
    .eq('id', comunicadoId)
    .maybeSingle()

  const { error } = await admin.from('comunicados').delete().eq('id', comunicadoId)
  if (error) return { erro: 'Não foi possível excluir o comunicado.' }

  await registrarAuditoria({
    acao: 'exclusao',
    usuarioId: perfil.id,
    recurso: 'comunicado',
    recursoId: comunicadoId,
    detalhes: { titulo: existente?.titulo },
  })

  revalidatePath(ROTAS.adm.comunicados)
  revalidatePath(ROTAS.docs.comunicados)
  revalidatePath(ROTAS.docs.painel)
  return { sucesso: true }
}

export async function marcarComunicadoLido(comunicadoId: string) {
  const perfil = await exigirAutenticacao()
  if (ehAdministrador(perfil.papel)) return { sucesso: true }

  const supabase = await criarClienteSupabaseServidor()

  await supabase.from('comunicado_leituras').upsert({
    comunicado_id: comunicadoId,
    usuario_id: perfil.id,
  })

  revalidatePath('/docs/comunicados')
  revalidatePath(ROTAS.docs.painel)
  return { sucesso: true }
}

export async function marcarComunicadosLidos(comunicadoIds: string[]) {
  const perfil = await exigirAutenticacao()
  if (ehAdministrador(perfil.papel) || comunicadoIds.length === 0) return { sucesso: true }

  const supabase = await criarClienteSupabaseServidor()
  await supabase.from('comunicado_leituras').upsert(
    comunicadoIds.map((id) => ({
      comunicado_id: id,
      usuario_id: perfil.id,
    })),
  )

  revalidatePath('/docs/comunicados')
  revalidatePath(ROTAS.docs.painel)
  return { sucesso: true }
}

/** Empresas destinatárias e se já visualizaram (pelo menos um usuário da empresa). */
export async function listarVisualizacoesComunicado(comunicadoId: string) {
  await exigirAutenticacao(['administrador'])
  const admin = criarClienteSupabaseAdmin()

  const { data: comunicado } = await admin
    .from('comunicados')
    .select('para_todos')
    .eq('id', comunicadoId)
    .maybeSingle()

  if (!comunicado) return { empresas: [] as VisualizacaoEmpresa[] }

  let destinatarios: { id: string; nome_fantasia: string }[] = []

  if (comunicado.para_todos) {
    const { data } = await admin
      .from('empresas')
      .select('id, nome_fantasia')
      .eq('status', 'ativo')
      .order('nome_fantasia')
    destinatarios = data ?? []
  } else {
    const { data: vinculos } = await admin
      .from('comunicado_empresas')
      .select('empresa_id, empresas(id, nome_fantasia)')
      .eq('comunicado_id', comunicadoId)

    destinatarios = (vinculos ?? [])
      .map((v) => {
        const emp = v.empresas as unknown as { id: string; nome_fantasia: string } | null
        return emp ? { id: emp.id, nome_fantasia: emp.nome_fantasia } : null
      })
      .filter((e): e is { id: string; nome_fantasia: string } => Boolean(e))
      .sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia, 'pt-BR'))
  }

  const { data: leituras } = await admin
    .from('comunicado_leituras')
    .select('lido_em, usuario_id')
    .eq('comunicado_id', comunicadoId)

  const usuarioIds = [...new Set((leituras ?? []).map((l) => l.usuario_id))]
  const leituraPorUsuario = new Map((leituras ?? []).map((l) => [l.usuario_id, l.lido_em as string]))

  const empresaMaisCedo = new Map<string, string>()

  if (usuarioIds.length) {
    const { data: perfis } = await admin
      .from('perfis')
      .select('id, empresa_id')
      .in('id', usuarioIds)

    for (const p of perfis ?? []) {
      if (!p.empresa_id) continue
      const lidoEm = leituraPorUsuario.get(p.id)
      if (!lidoEm) continue
      const atual = empresaMaisCedo.get(p.empresa_id)
      if (!atual || lidoEm < atual) empresaMaisCedo.set(p.empresa_id, lidoEm)
    }
  }

  const empresas: VisualizacaoEmpresa[] = destinatarios.map((e) => ({
    empresa_id: e.id,
    nome: e.nome_fantasia,
    visualizou: empresaMaisCedo.has(e.id),
    lido_em: empresaMaisCedo.get(e.id) ?? null,
  }))

  return { empresas }
}
