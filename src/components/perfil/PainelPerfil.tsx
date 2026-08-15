'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CabecalhoPagina } from '@/components/layout/CabecalhoPagina'
import { SecaoPainel } from '@/components/layout/SecaoPainel'
import { ConfiguracaoAparencia } from '@/components/perfil/ConfiguracaoAparencia'
import { Avatar, Button, Card, CardContent, Input } from '@/components/ui'
import { useAcaoPendente } from '@/hooks/use-acao-pendente'
import { atualizarPerfil } from '@/lib/perfil/preferencias'
import type { Perfil } from '@/types'

interface Props {
  perfil: Perfil
}

export function PainelPerfil({ perfil }: Props) {
  const router = useRouter()
  const { pendente, executar } = useAcaoPendente<'salvar'>()
  const [nome, definirNome] = useState(perfil.nome_completo)
  const [telefone, definirTelefone] = useState(perfil.telefone ?? '')

  function salvar() {
    void executar('salvar', async () => {
      const resultado = await atualizarPerfil({ nomeCompleto: nome, telefone })
      if (resultado.erro) {
        toast.error(resultado.erro)
        return
      }
      toast.success('Perfil atualizado.')
      router.refresh()
    })
  }

  return (
    <SecaoPainel>
      <CabecalhoPagina
        titulo="Meu Perfil"
        descricao="Gerencie suas informações pessoais e preferências de aparência."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="surface-card">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={perfil.nome_completo} size="lg" />
              <div>
                <p className="font-semibold">{perfil.nome_completo}</p>
                <p className="text-sm text-muted-foreground capitalize">{perfil.papel.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <Input label="Nome completo" value={nome} onChange={(e) => definirNome(e.target.value)} />
            <Input label="E-mail" value={perfil.email} disabled />
            <Input label="Telefone" value={telefone} onChange={(e) => definirTelefone(e.target.value)} />

            <Button variant="primary" loading={pendente('salvar')} onClick={salvar}>
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        <ConfiguracaoAparencia />
      </div>
    </SecaoPainel>
  )
}
