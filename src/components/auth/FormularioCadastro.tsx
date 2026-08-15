'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import { Button, Input, Card, CardContent, Separator } from '@/components/ui'
import { cadastrarComEmail } from '@/lib/auth/acoes'
import { entrarComGoogleNoCliente } from '@/lib/auth/google-cliente'
import { ROTAS } from '@/lib/rotas'

function FormularioCadastroInterno() {
  const parametros = useSearchParams()
  const [nome, definirNome] = useState('')
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [confirmarSenha, definirConfirmarSenha] = useState('')
  const [erro, definirErro] = useState('')
  const [pendente, iniciarTransicao] = useTransition()

  useEffect(() => {
    const e = parametros.get('email')
    if (e) definirEmail(e)
  }, [parametros])

  function aoLoginGoogle() {
    definirErro('')
    iniciarTransicao(async () => {
      const resultado = await entrarComGoogleNoCliente()
      if (resultado?.erro) definirErro(resultado.erro)
    })
  }

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault()
    definirErro('')

    if (senha !== confirmarSenha) {
      definirErro('As senhas não coincidem.')
      return
    }

    if (senha.length < 8) {
      definirErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    iniciarTransicao(async () => {
      const resultado = await cadastrarComEmail(email, senha, nome)
      if (resultado?.erro) definirErro(resultado.erro)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-sm mx-auto"
    >
      <Card className="p-6">
        <CardContent className="p-0">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold">Ativar conta</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use o e-mail autorizado. Ao criar a conta, você já entra automaticamente.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            loading={pendente}
            onClick={aoLoginGoogle}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ou defina uma senha</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={aoEnviar} className="flex flex-col gap-4">
            <Input label="Nome completo" value={nome} onChange={(e) => definirNome(e.target.value)} placeholder="Seu nome" required />
            <Input label="E-mail" type="email" value={email} onChange={(e) => definirEmail(e.target.value)} placeholder="seu@email.com" required />
            <Input label="Senha" type="password" value={senha} onChange={(e) => definirSenha(e.target.value)} placeholder="Mínimo 8 caracteres" required />
            <Input label="Confirmar senha" type="password" value={confirmarSenha} onChange={(e) => definirConfirmarSenha(e.target.value)} placeholder="Repita a senha" required />

            {erro && <p className="text-xs text-destructive text-center">{erro}</p>}

            <Button type="submit" variant="primary" className="w-full mt-1" loading={pendente}>
              <UserPlus size={15} />
              Criar conta
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Já tem conta?{' '}
            <a href={ROTAS.auth.entrar} className="font-medium text-foreground underline-offset-2 hover:underline">
              Entrar
            </a>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Cadastro com convite; e-mail pode vir de /cadastro?email= */
export function FormularioCadastro() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm mx-auto p-6 text-sm text-muted-foreground text-center">Carregando...</div>}>
      <FormularioCadastroInterno />
    </Suspense>
  )
}
