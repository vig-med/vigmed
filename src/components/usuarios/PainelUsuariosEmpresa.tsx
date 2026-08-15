'use client'

import { PainelUsuarios } from '@/components/usuarios/PainelUsuarios'
import type { PapelUsuario } from '@/types'

interface ConviteResumo {
  id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  usado_em: string | null
  criado_em: string
}

interface PerfilResumo {
  id: string
  email: string
  nome_completo: string
  papel: PapelUsuario
  ativo: boolean
  ultimo_login_em: string | null
}

interface Props {
  convites: ConviteResumo[]
  perfis: PerfilResumo[]
  nomeEmpresa: string
}

/** Portal docs: mesma superfície de Pessoas, escopo da empresa */
export function PainelUsuariosEmpresa({ convites, perfis, nomeEmpresa }: Props) {
  return (
    <PainelUsuarios
      modo="empresa"
      titulo="Pessoas"
      descricao={`Acesso à equipe de ${nomeEmpresa}.`}
      convites={convites.map((c) => ({ ...c, ambiente: 'docs' as const }))}
      perfis={perfis}
      empresas={[]}
    />
  )
}
