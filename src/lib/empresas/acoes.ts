'use server'

import { revalidatePath } from 'next/cache'
import { exigirAutenticacao, registrarAuditoria } from '@/lib/auth/sessao'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/admin'
import { criarClienteSupabaseServidor } from '@/lib/supabase/servidor'
import { ROTAS } from '@/lib/rotas'
import type { Empresa, StatusEmpresa } from '@/types'

export async function listarEmpresas(filtros?: { busca?: string; status?: StatusEmpresa | '' }) {
  await exigirAutenticacao(['administrador'])
  const supabase = await criarClienteSupabaseServidor()

  let query = supabase.from('empresas').select('*').order('nome_fantasia')

  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.busca) {
    const termo = filtros.busca.trim().toLowerCase()
    // Filtro aplicado no cliente quando necessário; busca simples no servidor
    query = query.ilike('nome_fantasia', `%${termo}%`)
  }

  const { data, error } = await query
  if (error) return { erro: 'Erro ao listar empresas.', empresas: [] as Empresa[] }
  return { empresas: (data ?? []) as Empresa[] }
}

export async function salvarEmpresa(dados: {
  id?: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  email: string
  telefone?: string
  responsavel?: string
  status?: StatusEmpresa
  armazenamentoLimite?: number
}) {
  const perfil = await exigirAutenticacao(['administrador'])
  const admin = criarClienteSupabaseAdmin()

  const cnpjLimpo = dados.cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length < 11) {
    return { erro: 'CNPJ inválido.' }
  }

  const payload: Record<string, unknown> = {
    razao_social: dados.razaoSocial.trim(),
    nome_fantasia: dados.nomeFantasia.trim(),
    cnpj: cnpjLimpo,
    email: dados.email.trim(),
    telefone: dados.telefone?.trim() || null,
    responsavel: dados.responsavel?.trim() || null,
    status: dados.status ?? 'ativo',
  }

  if (dados.armazenamentoLimite != null) {
    payload.armazenamento_limite = dados.armazenamentoLimite
  } else if (!dados.id) {
    const { obterLimitePadraoEmpresaBytes } = await import('@/lib/configuracoes/acoes')
    payload.armazenamento_limite = await obterLimitePadraoEmpresaBytes()
  }

  if (dados.id) {
    const { error } = await admin.from('empresas').update(payload).eq('id', dados.id)
    if (error) {
      console.error('[salvarEmpresa] update', error.code, error.message)
      if (error.code === '23505') return { erro: 'CNPJ já cadastrado em outra empresa.' }
      return { erro: 'Não foi possível atualizar a empresa.' }
    }
    await registrarAuditoria({
      acao: 'atualizacao_empresa',
      usuarioId: perfil.id,
      recurso: 'empresa',
      recursoId: dados.id,
      detalhes: { nome: payload.nome_fantasia },
    })
  } else {
    const { data, error } = await admin.from('empresas').insert(payload).select('id').single()
    if (error) {
      console.error('[salvarEmpresa] insert', error.code, error.message)
      return { erro: error.code === '23505' ? 'CNPJ já cadastrado.' : 'Erro ao criar empresa.' }
    }
    await registrarAuditoria({
      acao: 'criacao_empresa',
      usuarioId: perfil.id,
      recurso: 'empresa',
      recursoId: data.id,
      detalhes: { nome: payload.nome_fantasia },
    })
    revalidatePath(ROTAS.adm.empresas)
    return { sucesso: true, id: data.id }
  }

  revalidatePath(ROTAS.adm.empresas)
  revalidatePath(ROTAS.adm.empresa(dados.id!))
  revalidatePath(ROTAS.adm.empresaDocumentos(dados.id!))
  return { sucesso: true, id: dados.id }
}

export async function obterEmpresa(id: string) {
  await exigirAutenticacao(['administrador'])
  const supabase = await criarClienteSupabaseServidor()
  const { data, error } = await supabase.from('empresas').select('*').eq('id', id).maybeSingle()
  if (error || !data) return { erro: 'Empresa não encontrada.', empresa: null }
  return { empresa: data as Empresa }
}

export async function excluirEmpresa(id: string) {
  const perfil = await exigirAutenticacao(['administrador'])
  const admin = criarClienteSupabaseAdmin()

  const { data: empresa } = await admin.from('empresas').select('id, nome_fantasia').eq('id', id).maybeSingle()
  if (!empresa) return { erro: 'Empresa não encontrada.' }

  const { count } = await admin
    .from('perfis')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', id)
    .eq('ativo', true)

  if ((count ?? 0) > 0) {
    return { erro: 'Desative ou remova os usuários ativos antes de excluir a empresa.' }
  }

  const { error } = await admin.from('empresas').delete().eq('id', id)
  if (error) return { erro: 'Não foi possível excluir a empresa.' }

  await registrarAuditoria({
    acao: 'exclusao',
    usuarioId: perfil.id,
    recurso: 'empresa',
    recursoId: id,
    detalhes: { nome: empresa.nome_fantasia },
  })

  revalidatePath(ROTAS.adm.empresas)
  return { sucesso: true }
}

export async function listarEmpresasResumo() {
  const supabase = await criarClienteSupabaseServidor()
  const { data } = await supabase
    .from('empresas')
    .select('id, nome_fantasia, status, armazenamento_limite')
    .eq('status', 'ativo')
    .order('nome_fantasia')
  return data ?? []
}
