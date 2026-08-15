'use server'

import { revalidatePath } from 'next/cache'
import { ROTAS } from '@/lib/rotas'
import { exigirAutenticacao } from '@/lib/auth/sessao'
import { criarClienteSupabaseServidor } from '@/lib/supabase/servidor'
import type { ModoTema, IdTemaVisual } from '@/lib/tema/tipos'

export async function salvarPreferenciasAparencia(modo: ModoTema, temaVisual: IdTemaVisual) {
  const perfil = await exigirAutenticacao()
  const supabase = await criarClienteSupabaseServidor()

  const metadados = {
    ...(perfil.metadados ?? {}),
    aparencia: { modo, temaVisual },
  }

  const { error } = await supabase
    .from('perfis')
    .update({ metadados })
    .eq('id', perfil.id)

  if (error) return { erro: 'Não foi possível salvar preferências.' }

  // Sem revalidatePath aqui: evita atualizar o Router durante troca de tema no client
  return { sucesso: true }
}

export async function atualizarPerfil(dados: {
  nomeCompleto?: string
  telefone?: string
}) {
  const perfil = await exigirAutenticacao()
  const supabase = await criarClienteSupabaseServidor()

  const { error } = await supabase
    .from('perfis')
    .update({
      nome_completo: dados.nomeCompleto?.trim() ?? perfil.nome_completo,
      telefone: dados.telefone?.trim() || null,
    })
    .eq('id', perfil.id)

  if (error) return { erro: 'Não foi possível atualizar o perfil.' }

  revalidatePath(ROTAS.adm.perfil)
  revalidatePath(ROTAS.docs.perfil)

  return { sucesso: true }
}
