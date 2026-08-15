'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { IconeAnimado } from '@/components/ui/icone-animado'
import { RevelarScroll } from '@/components/ui/revelar-scroll'
import { ROTAS } from '@/lib/rotas'
import { obterUrlBaseDoAmbiente } from '@/lib/ambiente-edge'
import type { NomeIcone } from '@/lib/icones-animados'
import { cn } from '@/lib/utils'

const RECURSOS: { icone: NomeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'lock',
    titulo: 'Por empresa',
    texto: 'Cada cliente vê só os documentos destinados a ela.',
  },
  {
    icone: 'shield',
    titulo: 'Auditoria',
    texto: 'Login, envio e download ficam registrados.',
  },
  {
    icone: 'file-text',
    titulo: 'Quem publica',
    texto: 'Administração e empresas têm papéis diferentes na publicação.',
  },
]

const PILARES_VIGMED: { icone: NomeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'building',
    titulo: 'Administração',
    texto: 'Cadastra empresas, publica documentos e acompanha o uso.',
  },
  {
    icone: 'file-text',
    titulo: 'Portal da empresa',
    texto: 'Consulta arquivos, comunicados e mensagens da organização.',
  },
  {
    icone: 'shield',
    titulo: 'Acesso fechado',
    texto: 'Entrada só com e-mail pré-autorizado pelo administrador.',
  },
  {
    icone: 'monitor',
    titulo: 'Dois endereços',
    texto: 'adm.vigmed.com.br para o time interno; docs.vigmed.com.br para clientes.',
  },
]
const AMBIENTES = [
  {
    host: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br',
    rotulo: 'Institucional',
    href: '/',
  },
  {
    host: `adm.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'}`,
    rotulo: 'Administração',
    href: obterUrlBaseDoAmbiente('adm'),
  },
  {
    host: `docs.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'}`,
    rotulo: 'Portal empresas',
    href: obterUrlBaseDoAmbiente('docs'),
  },
] as const

const PILARES = [
  {
    titulo: 'Menu no celular',
    descricao: 'Itens agrupados por área: gestão, conteúdo e sistema.',
  },
  {
    titulo: 'Permissões visíveis',
    descricao: 'O que cada perfil pode fazer aparece na prática, não só na documentação.',
  },
  {
    titulo: 'Uso no dia a dia',
    descricao: 'Upload, download e comunicados sem sair do painel.',
  },
] as const

export function LandingInstitucional() {
  const reduzir = useReducedMotion()

  return (
    <div className="landing">
      <div className="landing-assets" aria-hidden>
        <motion.img
          src="/assets/padrao-grade.svg"
          alt=""
          className="landing-asset landing-asset--grade"
          animate={reduzir ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.img
          src="/assets/padrao-orbita.svg"
          alt=""
          className="landing-asset landing-asset--orbita"
          animate={reduzir ? undefined : { rotate: [0, 3, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <header className="landing-nav">
        <div className="landing-frame landing-nav-inner">
          <span className="landing-logo">VIGMED</span>
          <Link href={ROTAS.auth.entrar} className="landing-nav-entrar">
            Entrar
          </Link>
        </div>
      </header>

      <main className="landing-main landing-frame">
        <section className="landing-grade landing-grade--topo" aria-label="VIGMED">
          <div className="landing-grade-topo">
            <div className="landing-grade-intro">
              <div className="landing-grade-intro-linha">
                <h1 className="landing-intro-titulo">
                  Documentos para empresas, com controle de quem acessa.
                </h1>
              </div>
              <div className="landing-grade-intro-linha">
                <p className="landing-intro-texto">
                  Você publica arquivos, define permissões e vê quem baixou o quê.
                  Cada empresa entra no portal dela; a administração fica separada.
                </p>
              </div>
              <div className="landing-grade-intro-linha landing-grade-intro-linha--acesso">
                <p className="landing-intro-acesso">
                  E-mail autorizado?{' '}
                  <Link href={ROTAS.auth.cadastro}>Ativar conta</Link>
                  {' ou '}
                  <Link href={ROTAS.auth.entrar}>entrar</Link>.
                </p>
              </div>
            </div>

            <aside className="landing-vigmed landing-vigmed--grade" aria-label="Como funciona">
              <p className="landing-vigmed-kicker">Na prática</p>
              <ul className="landing-vigmed-lista landing-vigmed-lista--compacta">
                {PILARES_VIGMED.map((item) => (
                  <li key={item.titulo} className="landing-vigmed-item grupo-icone">
                    <span className="landing-vigmed-icone" aria-hidden>
                      <IconeAnimado nome={item.icone} tamanho={16} />
                    </span>
                    <div>
                      <h3>{item.titulo}</h3>
                      <p>{item.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {[
            ...[
              { valor: '3', rotulo: 'áreas do sistema' },
              { valor: 'Convite', rotulo: 'acesso por e-mail autorizado' },
              { valor: 'Log', rotulo: 'de downloads e logins' },
              { valor: 'RLS', rotulo: 'isolamento por empresa' },
            ].map((item) => ({ tipo: 'stat' as const, ...item })),
            ...AMBIENTES.map((item) => ({ tipo: 'env' as const, ...item })),
            ...RECURSOS.map((item) => ({ tipo: 'recurso' as const, ...item })),
            ...PILARES.map((item, indice) => ({
              tipo: 'pilar' as const,
              ordem: `0${indice + 1}`,
              titulo: item.titulo,
              descricao: item.descricao,
            })),
          ].map((celula, indice) => (
            <RevelarScroll
              key={`${celula.tipo}-${indice}`}
              className={cn(
                'landing-grade-celula grupo-icone',
                celula.tipo === 'stat' && 'landing-grade-celula--stat',
                celula.tipo === 'env' && 'landing-grade-celula--env',
                celula.tipo === 'recurso' && 'landing-grade-celula--recurso',
                celula.tipo === 'pilar' && 'landing-grade-celula--pilar',
              )}
              atraso={(indice % 4) * 0.05}
            >
              {celula.tipo === 'stat' && (
                <>
                  <p className="landing-grade-valor">{celula.valor}</p>
                  <p className="landing-grade-rotulo">{celula.rotulo}</p>
                </>
              )}
              {celula.tipo === 'env' && (
                <Link href={celula.href} className="landing-grade-link">
                  <p className="landing-grade-host">{celula.host}</p>
                  <p className="landing-grade-rotulo">{celula.rotulo}</p>
                </Link>
              )}
              {celula.tipo === 'recurso' && (
                <>
                  <div className="landing-grade-icone">
                    <IconeAnimado nome={celula.icone} tamanho={18} />
                  </div>
                  <h3 className="landing-grade-titulo">{celula.titulo}</h3>
                  <p className="landing-grade-texto">{celula.texto}</p>
                </>
              )}
              {celula.tipo === 'pilar' && (
                <>
                  <p className="landing-grade-ordem">{celula.ordem}</p>
                  <h3 className="landing-grade-titulo">{celula.titulo}</h3>
                  <p className="landing-grade-texto">{celula.descricao}</p>
                </>
              )}
            </RevelarScroll>
          ))}
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-frame landing-footer-inner">
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} VIGMED
          </p>
          <nav className="landing-footer-nav" aria-label="Acesso ao sistema">
            <span className="landing-footer-sep" aria-hidden>·</span>
            <span>adm.vigmed.com.br</span>
            <span className="landing-footer-sep" aria-hidden>·</span>
            <span>docs.vigmed.com.br</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
