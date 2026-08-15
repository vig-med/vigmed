'use server'

import { revalidatePath } from 'next/cache'
import { ROTAS } from '@/lib/rotas'
import { exigirAutenticacao, ehAdministrador, registrarAuditoria } from '@/lib/auth/sessao'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/admin'
import type { PapelUsuario } from '@/types'

function revalidarMensagens() {
  revalidatePath(ROTAS.adm.mensagens)
  revalidatePath(ROTAS.docs.mensagens)
  revalidatePath(ROTAS.adm.painel)
  revalidatePath(ROTAS.docs.painel)
}

async function idsConversasDoUsuario(perfil: {
  papel: PapelUsuario
  empresa_id: string | null
}) {
  const admin = criarClienteSupabaseAdmin()
  let query = admin.from('conversas').select('id').eq('ativo', true)

  if (!ehAdministrador(perfil.papel)) {
    if (!perfil.empresa_id) return [] as string[]
    query = query.eq('empresa_id', perfil.empresa_id)
  }

  const { data } = await query
  return (data ?? []).map((c) => c.id)
}

async function usuarioPodeAcessarConversa(
  perfil: { papel: PapelUsuario; empresa_id: string | null },
  conversaId: string,
) {
  const admin = criarClienteSupabaseAdmin()
  const { data } = await admin
    .from('conversas')
    .select('id, empresa_id, ativo')
    .eq('id', conversaId)
    .maybeSingle()

  if (!data || !data.ativo) return null
  if (ehAdministrador(perfil.papel)) return data
  if (perfil.empresa_id && data.empresa_id === perfil.empresa_id) return data
  return null
}

/** Total de mensagens recebidas ainda não lidas */
export async function contarMensagensNaoLidas() {
  const perfil = await exigirAutenticacao()
  const ids = await idsConversasDoUsuario(perfil)
  if (ids.length === 0) return { total: 0 }

  const admin = criarClienteSupabaseAdmin()
  const { count, error } = await admin
    .from('mensagens')
    .select('*', { count: 'exact', head: true })
    .in('conversa_id', ids)
    .eq('lida', false)
    .neq('remetente_id', perfil.id)

  if (error) {
    console.error('[contarMensagensNaoLidas]', error.message)
    return { total: 0 }
  }

  return { total: count ?? 0 }
}

export async function listarConversas() {
  const perfil = await exigirAutenticacao()
  const admin = criarClienteSupabaseAdmin()

  let query = admin
    .from('conversas')
    .select('id, assunto, atualizado_em, criado_em, empresa_id, ativo, empresas(nome_fantasia)')
    .eq('ativo', true)
    .order('atualizado_em', { ascending: false })

  if (!ehAdministrador(perfil.papel)) {
    if (!perfil.empresa_id) return { conversas: [] as const }
    query = query.eq('empresa_id', perfil.empresa_id)
  }

  const { data, error } = await query
  if (error) {
    console.error('[listarConversas]', error.code, error.message)
    return { conversas: [], erro: 'Erro ao listar conversas.' }
  }

  const conversas = data ?? []
  const ids = conversas.map((c) => c.id)
  const naoLidasPorConversa = new Map<string, number>()

  if (ids.length > 0) {
    const { data: msgs } = await admin
      .from('mensagens')
      .select('conversa_id')
      .in('conversa_id', ids)
      .eq('lida', false)
      .neq('remetente_id', perfil.id)

    for (const m of msgs ?? []) {
      naoLidasPorConversa.set(m.conversa_id, (naoLidasPorConversa.get(m.conversa_id) ?? 0) + 1)
    }
  }

  return {
    conversas: conversas.map((c) => ({
      ...c,
      nao_lidas: naoLidasPorConversa.get(c.id) ?? 0,
    })),
  }
}

export async function criarConversa(assunto: string, empresaId?: string) {
  const perfil = await exigirAutenticacao()
  const admin = criarClienteSupabaseAdmin()

  const empresa = ehAdministrador(perfil.papel) ? empresaId : perfil.empresa_id
  if (!empresa) return { erro: 'Empresa não informada.' }
  if (!assunto.trim()) return { erro: 'Informe o assunto.' }

  if (!ehAdministrador(perfil.papel) && empresa !== perfil.empresa_id) {
    return { erro: 'Sem permissão para esta empresa.' }
  }

  const { data, error } = await admin
    .from('conversas')
    .insert({
      assunto: assunto.trim(),
      empresa_id: empresa,
      ativo: true,
    })
    .select('id, assunto, atualizado_em, empresa_id, empresas(nome_fantasia)')
    .single()

  if (error || !data) {
    console.error('[criarConversa]', error?.code, error?.message)
    return { erro: 'Não foi possível criar a conversa.' }
  }

  await registrarAuditoria({
    acao: 'criacao',
    usuarioId: perfil.id,
    recurso: 'conversa',
    recursoId: data.id,
    detalhes: { assunto: data.assunto, empresa_id: data.empresa_id },
  })

  revalidarMensagens()

  const empresaJoin = data.empresas as unknown as { nome_fantasia: string } | null

  return {
    sucesso: true,
    conversaId: data.id,
    conversa: {
      id: data.id,
      assunto: data.assunto,
      atualizado_em: data.atualizado_em,
      empresa_id: data.empresa_id,
      empresas: empresaJoin,
      nao_lidas: 0,
      mensagens: [] as { corpo: string; criado_em: string }[],
    },
  }
}

export async function enviarMensagem(conversaId: string, corpo: string) {
  const perfil = await exigirAutenticacao()
  const texto = corpo.trim()
  if (!texto) return { erro: 'Mensagem vazia.' }

  const conversa = await usuarioPodeAcessarConversa(perfil, conversaId)
  if (!conversa) return { erro: 'Conversa não encontrada.' }

  const admin = criarClienteSupabaseAdmin()
  const agora = new Date().toISOString()

  const { data, error } = await admin
    .from('mensagens')
    .insert({
      conversa_id: conversaId,
      remetente_id: perfil.id,
      corpo: texto,
      lida: false,
    })
    .select('id, corpo, criado_em, remetente_id, lida, lida_em')
    .single()

  if (error || !data) {
    console.error('[enviarMensagem]', error?.code, error?.message)
    return { erro: 'Não foi possível enviar a mensagem.' }
  }

  await admin
    .from('conversas')
    .update({ atualizado_em: agora })
    .eq('id', conversaId)

  await registrarAuditoria({
    acao: 'criacao',
    usuarioId: perfil.id,
    recurso: 'mensagem',
    recursoId: conversaId,
  })

  revalidarMensagens()

  return {
    sucesso: true,
    mensagem: {
      id: data.id,
      corpo: data.corpo,
      criado_em: data.criado_em,
      remetente_id: data.remetente_id,
      lida: Boolean(data.lida),
      lida_em: data.lida_em as string | null,
      perfis: { nome_completo: perfil.nome_completo },
    },
  }
}

/** Marca como lidas as mensagens recebidas na conversa */
export async function marcarMensagensLidas(conversaId: string) {
  const perfil = await exigirAutenticacao()
  const conversa = await usuarioPodeAcessarConversa(perfil, conversaId)
  if (!conversa) return { sucesso: false, marcadas: 0 }

  const admin = criarClienteSupabaseAdmin()
  const agora = new Date().toISOString()

  const { data, error } = await admin
    .from('mensagens')
    .update({ lida: true, lida_em: agora })
    .eq('conversa_id', conversaId)
    .eq('lida', false)
    .neq('remetente_id', perfil.id)
    .select('id')

  if (error) {
    console.error('[marcarMensagensLidas]', error.message)
    return { sucesso: false, marcadas: 0 }
  }

  if ((data?.length ?? 0) > 0) revalidarMensagens()
  return { sucesso: true, marcadas: data?.length ?? 0 }
}

export async function listarMensagens(conversaId: string) {
  const perfil = await exigirAutenticacao()
  const conversa = await usuarioPodeAcessarConversa(perfil, conversaId)
  if (!conversa) return []

  await marcarMensagensLidas(conversaId)

  const admin = criarClienteSupabaseAdmin()
  const { data, error } = await admin
    .from('mensagens')
    .select('id, corpo, criado_em, remetente_id, lida, lida_em, perfis(nome_completo, email)')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true })

  if (error) {
    console.error('[listarMensagens]', error.code, error.message)
    const { data: simples } = await admin
      .from('mensagens')
      .select('id, corpo, criado_em, remetente_id, lida, lida_em')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
    return simples ?? []
  }

  return data ?? []
}

/** Exclui conversa e todas as mensagens (somente admin do sistema) */
export async function excluirConversa(conversaId: string) {
  const perfil = await exigirAutenticacao()
  if (!ehAdministrador(perfil.papel)) return { erro: 'Sem permissão.' }

  const admin = criarClienteSupabaseAdmin()
  const { data: conversa } = await admin
    .from('conversas')
    .select('id, assunto, empresa_id')
    .eq('id', conversaId)
    .maybeSingle()

  if (!conversa) return { erro: 'Conversa não encontrada.' }

  const { error } = await admin.from('conversas').delete().eq('id', conversaId)
  if (error) {
    console.error('[excluirConversa]', error.code, error.message)
    return { erro: 'Não foi possível excluir a conversa.' }
  }

  await registrarAuditoria({
    acao: 'exclusao',
    usuarioId: perfil.id,
    recurso: 'conversa',
    recursoId: conversaId,
    detalhes: { assunto: conversa.assunto, empresa_id: conversa.empresa_id },
  })

  revalidarMensagens()
  return { sucesso: true }
}

/** Exclui uma mensagem (somente admin do sistema) */
export async function excluirMensagem(mensagemId: string) {
  const perfil = await exigirAutenticacao()
  if (!ehAdministrador(perfil.papel)) return { erro: 'Sem permissão.' }

  const admin = criarClienteSupabaseAdmin()
  const { data: mensagem } = await admin
    .from('mensagens')
    .select('id, conversa_id, corpo')
    .eq('id', mensagemId)
    .maybeSingle()

  if (!mensagem) return { erro: 'Mensagem não encontrada.' }

  const { error } = await admin.from('mensagens').delete().eq('id', mensagemId)
  if (error) {
    console.error('[excluirMensagem]', error.code, error.message)
    return { erro: 'Não foi possível excluir a mensagem.' }
  }

  await admin
    .from('conversas')
    .update({ atualizado_em: new Date().toISOString() })
    .eq('id', mensagem.conversa_id)

  await registrarAuditoria({
    acao: 'exclusao',
    usuarioId: perfil.id,
    recurso: 'mensagem',
    recursoId: mensagemId,
    detalhes: { conversa_id: mensagem.conversa_id },
  })

  revalidarMensagens()
  return { sucesso: true }
}

/** Retorna conversa ativa da empresa ou cria uma nova (admin) */
export async function garantirConversaEmpresa(empresaId: string) {
  const perfil = await exigirAutenticacao()
  if (!ehAdministrador(perfil.papel)) return { erro: 'Sem permissão.' }

  const admin = criarClienteSupabaseAdmin()

  const { data: existente } = await admin
    .from('conversas')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existente) return { conversaId: existente.id }

  const { data: empresa } = await admin
    .from('empresas')
    .select('nome_fantasia')
    .eq('id', empresaId)
    .maybeSingle()

  const { data, error } = await admin
    .from('conversas')
    .insert({
      assunto: empresa?.nome_fantasia ?? 'Conversa',
      empresa_id: empresaId,
      ativo: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[garantirConversaEmpresa]', error?.code, error?.message)
    return { erro: 'Não foi possível iniciar a conversa.' }
  }

  revalidarMensagens()
  return { conversaId: data.id }
}
