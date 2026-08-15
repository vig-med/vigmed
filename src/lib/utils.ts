import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { NomeArquivoAnalisado } from '@/types'

/** Combina classes Tailwind sem conflitos (usado pelo shadcn) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) {
    const casas = mb < 10 ? 2 : 1
    return `${parseFloat(mb.toFixed(casas))} MB`
  }
  const gb = mb / 1024
  const casas = gb < 10 ? 2 : 1
  return `${parseFloat(gb.toFixed(casas))} GB`
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export function obterIniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

/**
 * Analisa nomes no padrão VIGMED:
 * "{contrato ou tipo} - {tipo documento} - {nome produto}.pdf"
 */
export function analisarNomeArquivo(original: string): NomeArquivoAnalisado {
  const semExtensao = original.replace(/\.[^.]+$/, '')
  const partes = semExtensao.split(' - ').map((s) => s.trim())

  if (partes.length >= 3) {
    return {
      empresa: partes[0],
      tipoDocumento: partes[1],
      nomeDocumento: partes.slice(2).join(' - '),
      valido: true,
      original,
    }
  }

  if (partes.length === 2) {
    return {
      empresa: partes[0],
      tipoDocumento: partes[1],
      nomeDocumento: '',
      valido: false,
      original,
    }
  }

  return {
    empresa: '',
    tipoDocumento: '',
    nomeDocumento: original,
    valido: false,
    original,
  }
}

export function sanitizarParteNomeArquivo(texto: string): string {
  return texto.replace(/\.pdf/gi, '').replace(/-/g, '')
}

export function montarNomeArquivo(empresa: string, tipoDocumento: string, nomeDocumento: string): string {
  return `${empresa.trim()} - ${tipoDocumento.trim()} - ${nomeDocumento.trim()}.pdf`
}

export function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatarCnpj(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '')
  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  )
}

export function obterExtensao(nomeArquivo: string): string {
  const partes = nomeArquivo.split('.')
  return partes.length > 1 ? partes.pop()!.toLowerCase() : ''
}
