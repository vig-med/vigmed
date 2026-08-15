import { headers } from 'next/headers'
import {
  obterUrlBaseDoAmbiente,
  roteamentoPorSubdominio,
} from '@/lib/ambiente'
import type { AmbienteApp } from '@/lib/ambiente'
import { ehAdministrador } from '@/lib/auth/sessao'
import { hrefPublico, ROTAS, urlDoAmbiente } from '@/lib/rotas'
import type { PapelUsuario } from '@/types'

/** URL base para telas de autenticação unificadas (fallback por env). */
export function urlBaseAuth(): string {
  return obterUrlBaseDoAmbiente('site')
}

/**
 * URL base do host atual (OAuth, reset de senha).
 * Evita redirect relativo quando env/dashboard não batem com o domínio acessado.
 */
export async function urlBaseAuthDaRequisicao(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host')?.split(',')[0]?.trim() ?? h.get('host')

  if (host) {
    const proto =
      h.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
      (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
    return `${proto}://${host}`
  }

  return urlBaseAuth()
}

/** Ambiente do painel conforme o papel do usuário */
export function ambienteDoPapel(papel: PapelUsuario): AmbienteApp {
  return ehAdministrador(papel) ? 'adm' : 'docs'
}

/** Caminho interno do App Router */
export function caminhoPainelPorPapel(papel: PapelUsuario): string {
  return ehAdministrador(papel) ? ROTAS.adm.painel : ROTAS.docs.painel
}

/** Path público do painel (/painel em prod, /adm/painel em dev) */
export function caminhoPublicoPainelPorPapel(papel: PapelUsuario): string {
  return hrefPublico(caminhoPainelPorPapel(papel))
}

/** URL absoluta do painel no subdomínio correto */
export function urlPainelPorPapel(papel: PapelUsuario): string {
  const ambiente = ambienteDoPapel(papel)
  return urlDoAmbiente(ambiente, caminhoPainelPorPapel(papel))
}

/**
 * Após login: em prod vai ao subdomínio; em dev fica na mesma origem com /adm|/docs.
 */
export function urlPainelAposLogin(papel: PapelUsuario, origem: string): string {
  if (roteamentoPorSubdominio()) {
    return urlPainelPorPapel(papel)
  }
  return `${origem.replace(/\/+$/, '')}${caminhoPainelPorPapel(papel)}`
}

/** @deprecated use urlPainelAposLogin */
export function urlPainelNaOrigem(papel: PapelUsuario, origem: string): string {
  return urlPainelAposLogin(papel, origem)
}
