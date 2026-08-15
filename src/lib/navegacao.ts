import type { NomeIcone } from '@/lib/icones-animados'
import type { AmbienteApp } from '@/lib/ambiente'
import { hrefPublico, ROTAS } from '@/lib/rotas'
import type { PapelUsuario } from '@/types'

export interface SubRota {
  href: string
  rotulo: string
  icone?: NomeIcone
}

export interface ItemNavLink {
  id: string
  tipo: 'link'
  rotulo: string
  icone: NomeIcone
  href: string
}

export interface ItemNavGrupo {
  id: string
  tipo: 'grupo'
  rotulo: string
  icone: NomeIcone
  filhos: SubRota[]
}

export type ItemNavegacao = ItemNavLink | ItemNavGrupo

const NAVEGACAO_ADM: ItemNavegacao[] = [
  { id: 'painel', tipo: 'link', rotulo: 'Painel', icone: 'layout-dashboard', href: hrefPublico(ROTAS.adm.painel) },
  {
    id: 'gestao',
    tipo: 'grupo',
    rotulo: 'Gestão',
    icone: 'building',
    filhos: [
      { href: hrefPublico(ROTAS.adm.empresas), rotulo: 'Empresas', icone: 'building' },
      { href: hrefPublico(ROTAS.adm.usuarios), rotulo: 'Pessoas', icone: 'users' },
    ],
  },
  {
    id: 'conteudo',
    tipo: 'grupo',
    rotulo: 'Conteúdo',
    icone: 'file-text',
    filhos: [
      { href: hrefPublico(ROTAS.adm.documentos), rotulo: 'Documentos', icone: 'file-text' },
      { href: hrefPublico(ROTAS.adm.comunicados), rotulo: 'Comunicados', icone: 'megaphone' },
      { href: hrefPublico(ROTAS.adm.mensagens), rotulo: 'Mensagens', icone: 'message' },
    ],
  },
  {
    id: 'sistema',
    tipo: 'grupo',
    rotulo: 'Sistema',
    icone: 'shield',
    filhos: [
      { href: hrefPublico(ROTAS.adm.relatorios), rotulo: 'Relatórios', icone: 'chart-bar' },
      { href: hrefPublico(ROTAS.adm.auditoria), rotulo: 'Auditoria', icone: 'shield' },
      { href: hrefPublico(ROTAS.adm.atualizacoes), rotulo: 'Atualizações', icone: 'sparkles' },
      { href: hrefPublico(ROTAS.adm.configuracoes), rotulo: 'Configurações', icone: 'monitor' },
    ],
  },
  { id: 'perfil', tipo: 'link', rotulo: 'Perfil', icone: 'user', href: hrefPublico(ROTAS.adm.perfil) },
]

const NAVEGACAO_DOCS: ItemNavegacao[] = [
  { id: 'painel', tipo: 'link', rotulo: 'Início', icone: 'layout-dashboard', href: hrefPublico(ROTAS.docs.painel) },
  { id: 'documentos', tipo: 'link', rotulo: 'Documentos', icone: 'file-text', href: hrefPublico(ROTAS.docs.documentos) },
  {
    id: 'comunicacao',
    tipo: 'grupo',
    rotulo: 'Comunicação',
    icone: 'megaphone',
    filhos: [
      { href: hrefPublico(ROTAS.docs.comunicados), rotulo: 'Comunicados', icone: 'megaphone' },
      { href: hrefPublico(ROTAS.docs.mensagens), rotulo: 'Mensagens', icone: 'message' },
    ],
  },
  { id: 'perfil', tipo: 'link', rotulo: 'Perfil', icone: 'user', href: hrefPublico(ROTAS.docs.perfil) },
]

/** Monta árvore de navegação conforme ambiente e papel do usuário */
export function obterNavegacao(ambiente: AmbienteApp, papel: PapelUsuario): ItemNavegacao[] {
  if (ambiente === 'adm') return NAVEGACAO_ADM

  const itens = [...NAVEGACAO_DOCS]

  if (papel === 'administrador_empresa') {
    const idxPerfil = itens.findIndex((i) => i.id === 'perfil')
    itens.splice(idxPerfil, 0, {
      id: 'equipe',
      tipo: 'link',
      rotulo: 'Pessoas',
      icone: 'users',
      href: hrefPublico(ROTAS.docs.usuarios),
    })
  }

  return itens
}

/** Resolve rótulo da página atual para o cabeçalho */
export function obterRotuloPagina(caminho: string, itens: ItemNavegacao[]): string {
  for (const item of itens) {
    if (item.tipo === 'link' && caminho.startsWith(item.href)) return item.rotulo
    if (item.tipo === 'grupo') {
      const filho = item.filhos.find((f) => caminho.startsWith(f.href))
      if (filho) return filho.rotulo
    }
  }
  return 'Painel'
}

/** Verifica se caminho está ativo dentro de um item */
export function itemEstaAtivo(caminho: string, item: ItemNavegacao): boolean {
  if (item.tipo === 'link') return caminho.startsWith(item.href)
  return item.filhos.some((f) => caminho.startsWith(f.href))
}
