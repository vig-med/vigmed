import type { PreferenciasAparencia } from '@/lib/tema/tipos'

/** Aparência fixa da landing, blog e telas de entrada */
export const PREFERENCIAS_TEMA_PUBLICO: PreferenciasAparencia = {
  modo: 'light',
  temaVisual: 'banana',
}

/** Paths que sempre usam tema institucional claro (não leem prefs do usuário) */
export const PREFIXOS_ROTA_TEMA_CLARO = [
  '/site',
  '/blog',
  '/doc',
  '/entrar',
  '/cadastro',
  '/recuperar',
] as const

function pathTemTemaClaro(path: string): boolean {
  if (path === '/') return true

  return PREFIXOS_ROTA_TEMA_CLARO.some(
    (prefixo) => path === prefixo || path.startsWith(`${prefixo}/`),
  )
}

function ehHostPainel(host: string): boolean {
  const dominioRaiz = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'
  if (host === `adm.${dominioRaiz}` || host === `docs.${dominioRaiz}`) return true
  const partes = host.split('.')
  if (partes.length >= 3) {
    const sub = partes[0]
    return sub === 'adm' || sub === 'docs'
  }
  return false
}

function ehRotaPainel(path: string, host: string): boolean {
  if (path.startsWith('/adm/') || path.startsWith('/docs/')) return true
  // Em prod no subdomínio: /painel, /empresas, etc. (não auth pública)
  if (ehHostPainel(host) && !pathTemTemaClaro(path)) return true
  return false
}

/** Rotas e hosts que nunca herdam tema escuro salvo no painel */
export function ehRotaPublica(pathname?: string, hostname?: string): boolean {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).split(':')[0]

  if (ehRotaPainel(path, host)) return false

  if (pathTemTemaClaro(path)) return true

  const dominioRaiz = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vigmed.com.br'
  if (host === `blog.${dominioRaiz}`) return true

  return false
}

/** Script inline no <head>; evita flash de tema escuro antes do React */
export function gerarScriptTemaInicial(
  dominioRaiz: string,
  mapaVariaveis: Record<string, { light: Record<string, string>; dark: Record<string, string> }>,
): string {
  const prefixos = JSON.stringify([...PREFIXOS_ROTA_TEMA_CLARO])
  const mapaJson = JSON.stringify(mapaVariaveis)

  return `
(function () {
  try {
    var MAPA = ${mapaJson};

    function aplicarVars(tema, escuro) {
      var pack = MAPA[tema];
      if (!pack) return;
      var vars = escuro ? pack.dark : pack.light;
      var el = document.documentElement;
      for (var k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
          el.style.setProperty(k, vars[k]);
        }
      }
    }

    var path = window.location.pathname;
    var host = window.location.hostname.split(':')[0];
    var root = ${JSON.stringify(dominioRaiz)};
    var prefixos = ${prefixos};

    function pathClaro(p) {
      if (p === '/') return true;
      for (var i = 0; i < prefixos.length; i++) {
        var pref = prefixos[i];
        if (p === pref || p.indexOf(pref + '/') === 0) return true;
      }
      return false;
    }

    function hostPainel(h) {
      if (h === 'adm.' + root || h === 'docs.' + root) return true;
      var partes = h.split('.');
      if (partes.length >= 3) {
        var sub = partes[0];
        return sub === 'adm' || sub === 'docs';
      }
      return false;
    }

    function pathPainel(p, h) {
      if (p.indexOf('/adm/') === 0 || p.indexOf('/docs/') === 0) return true;
      if (hostPainel(h) && !pathClaro(p)) return true;
      return false;
    }

    var publico = !pathPainel(path, host) && (pathClaro(path) || host === 'blog.' + root);

    if (publico) {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.dataset.tema = 'banana';
      document.documentElement.classList.remove('dark');
      aplicarVars('banana', false);
      return;
    }

    var modo = localStorage.getItem('vigmed-theme') || 'system';
    var temaRaw = localStorage.getItem('vigmed-tema-visual') || 'banana';
    var temas = ['banana','limao','azulao','acai'];
    var tema = temas.indexOf(temaRaw) >= 0 ? temaRaw : 'banana';
    var escuro = modo === 'dark' || (modo !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
    document.documentElement.dataset.tema = tema;
    document.documentElement.classList.toggle('dark', escuro);
    aplicarVars(tema, escuro);
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.tema = 'banana';
    document.documentElement.classList.remove('dark');
    aplicarVars('banana', false);
  }
})();
`.trim()
}
