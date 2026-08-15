const BLOCOS_NIVEL = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const
const LARGURA_ROTULO_PADRAO = 18

export interface ItemGrafico {
  nome: string
  valor: number
}

export type ModoGraficoBarras = 'parte' | 'comparativo'

export interface OpcoesBlocoBarras {
  /** Total de referência no modo parte (padrão: soma dos itens) */
  total?: number
  /** parte: % do total; comparativo: escala pelo maior valor */
  modo?: ModoGraficoBarras
  largura?: number
}

function truncarRotulo(texto: string, largura = LARGURA_ROTULO_PADRAO): string {
  if (texto.length <= largura) return texto.padEnd(largura, ' ')
  return `${texto.slice(0, largura - 1)}…`
}

function referenciaBarras(itens: ItemGrafico[], opcoes?: OpcoesBlocoBarras): number {
  const modo = opcoes?.modo ?? 'parte'
  if (modo === 'comparativo') {
    return Math.max(...itens.map((i) => i.valor), 1)
  }
  return opcoes?.total ?? itens.reduce((soma, item) => soma + item.valor, 0)
}

/** Barra horizontal com rótulo, preenchimento, valor e opcionalmente % */
export function barraHorizontal(
  item: ItemGrafico,
  referencia: number,
  opcoes?: OpcoesBlocoBarras,
): string {
  const largura = opcoes?.largura ?? 24
  const modo = opcoes?.modo ?? 'parte'

  let preenchido = 0
  let pct = 0
  if (referencia > 0 && item.valor > 0) {
    preenchido = Math.max(1, Math.round((item.valor / referencia) * largura))
    if (modo === 'parte') {
      pct = Math.round((item.valor / referencia) * 100)
    }
  }

  if (referencia > 0 && item.valor > 0 && preenchido > largura) {
    preenchido = largura
  }

  const barra = '█'.repeat(preenchido) + '░'.repeat(Math.max(0, largura - preenchido))
  const rotulo = truncarRotulo(item.nome)
  const num =
    modo === 'parte'
      ? `${String(item.valor).padStart(4)} ${String(pct).padStart(3)}%`.padStart(10, ' ')
      : String(item.valor).padStart(6, ' ')

  return `${rotulo} ${barra} ${num}`
}

/** Várias barras; no modo parte cada barra é % do total informado ou da soma */
export function blocoBarras(itens: ItemGrafico[], opcoes?: OpcoesBlocoBarras): string {
  if (!itens.length) return ''

  const modo = opcoes?.modo ?? 'parte'
  const referencia = referenciaBarras(itens, opcoes)
  const linhas = itens.map((item) => barraHorizontal(item, referencia > 0 ? referencia : 1, opcoes))

  if (modo === 'parte') {
    const rotuloTotal = truncarRotulo('Total')
    const numTotal = String(referencia).padStart(6, ' ')
    return `${linhas.join('\n')}\n${rotuloTotal} ${'─'.repeat(opcoes?.largura ?? 24)} ${numTotal}`
  }

  return linhas.join('\n')
}

/** Sparkline proporcional ao maior valor do grupo */
export function sparkline(itens: ItemGrafico[]): string {
  const maximo = Math.max(...itens.map((i) => i.valor), 1)
  return itens
    .map((item) => {
      const idx =
        item.valor <= 0
          ? 0
          : Math.min(BLOCOS_NIVEL.length - 1, Math.round((item.valor / maximo) * (BLOCOS_NIVEL.length - 1)))
      return BLOCOS_NIVEL[idx]
    })
    .join('')
}

/** Sparkline com rótulos e valores absolutos */
export function blocoSparkline(itens: ItemGrafico[]): string {
  const linha = sparkline(itens)
  const rotulos = itens.map((i) => i.nome.slice(0, 3).padEnd(4)).join('')
  const valores = itens.map((i) => String(i.valor).padStart(4)).join('')
  return `${linha}\n${rotulos}\n${valores}`
}

/** Barra única de progresso em caracteres (0-100%) */
export function barraProgresso(pct: number, largura = 36): string {
  const preenchido = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * largura)
  return `[${'█'.repeat(preenchido)}${'·'.repeat(Math.max(0, largura - preenchido))}] ${pct}%`
}

/** Colunas verticais; escala comparativa pelo maior valor */
export function colunasAscii(itens: ItemGrafico[], altura = 6): string {
  const maximo = Math.max(...itens.map((i) => i.valor), 1)
  const linhas: string[] = []

  for (let nivel = altura; nivel >= 1; nivel--) {
    const linha = itens
      .map((item) => {
        const h = item.valor <= 0 ? 0 : Math.round((item.valor / maximo) * altura)
        return h >= nivel ? ' ██ ' : '    '
      })
      .join('')
    linhas.push(linha)
  }

  const base = itens.map((i) => i.nome.slice(0, 4).padEnd(4)).join('    ')
  const nums = itens.map((i) => String(i.valor).padStart(4)).join('    ')
  return [...linhas, '-'.repeat(itens.length * 5), base, nums].join('\n')
}
