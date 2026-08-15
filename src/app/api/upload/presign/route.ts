import { NextResponse } from 'next/server'
import { exigirAutenticacao, ehAdministrador, ehUsuarioEmpresa } from '@/lib/auth/sessao'
import { recalcularArmazenamentoEmpresa, obterConsumoCotaEmpresa } from '@/lib/documentos/armazenamento'
import { origemPublicacaoDocumento } from '@/lib/documentos/upload'
import { gerarUrlUploadAssinada, montarChaveArquivo } from '@/lib/r2/cliente'
import { criarClienteSupabaseServidor } from '@/lib/supabase/servidor'
import { randomUUID } from 'crypto'

/**
 * Gera URL assinada para upload direto ao R2.
 * Cria o registro do documento no Supabase antes de retornar a URL.
 */
export async function POST(requisicao: Request) {
  try {
    const perfil = await exigirAutenticacao([
      'administrador',
      'administrador_empresa',
      'usuario_empresa',
    ])

    const corpo = await requisicao.json()
    const { nomeArquivo, tipoMime, tamanho, titulo, empresaIds, categoriaId } = corpo

    if (!nomeArquivo || !tipoMime || !titulo) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })
    }

    const documentoId = randomUUID()
    const empresaUsuario = ehUsuarioEmpresa(perfil.papel) ? perfil.empresa_id : null

    let idsEmpresas: string[]
    if (empresaUsuario) {
      if (empresaIds?.some((id: string) => id !== empresaUsuario)) {
        return NextResponse.json({ erro: 'Sem permissão para esta empresa.' }, { status: 403 })
      }
      idsEmpresas = [empresaUsuario]
    } else if (ehAdministrador(perfil.papel)) {
      if (!Array.isArray(empresaIds) || empresaIds.length === 0) {
        return NextResponse.json({ erro: 'Selecione ao menos uma empresa.' }, { status: 400 })
      }
      idsEmpresas = [...new Set(empresaIds as string[])]
    } else {
      return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 })
    }

    const chaveArquivo = montarChaveArquivo(documentoId, nomeArquivo)
    const supabase = await criarClienteSupabaseServidor()
    const tamanhoArquivo = tamanho ?? 0
    const origem = origemPublicacaoDocumento(perfil)
    const uploadAdmin = ehAdministrador(perfil.papel)

    const { obterExtensoesPermitidas, obterTamanhoMaxUploadBytes } = await import(
      '@/lib/configuracoes/acoes'
    )
    const tamanhoMax = await obterTamanhoMaxUploadBytes()
    if (tamanhoArquivo > tamanhoMax) {
      const mb = Math.round((tamanhoMax / (1024 * 1024)) * 10) / 10
      return NextResponse.json(
        { erro: `Arquivo acima do limite de ${mb} MB.` },
        { status: 400 },
      )
    }

    const ext = nomeArquivo.split('.').pop()?.toLowerCase() ?? ''
    const extensoes = await obterExtensoesPermitidas()
    if (!ext || !extensoes.includes(ext)) {
      return NextResponse.json(
        { erro: `Extensão .${ext || '?'} não permitida.` },
        { status: 400 },
      )
    }

    if (!uploadAdmin) {
      for (const empresaId of idsEmpresas) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('armazenamento_limite')
          .eq('id', empresaId)
          .single()

        if (!empresa) {
          return NextResponse.json({ erro: 'Empresa não encontrada.' }, { status: 400 })
        }

        const consumoEmpresa = await obterConsumoCotaEmpresa(empresaId)

        if (consumoEmpresa + tamanhoArquivo > empresa.armazenamento_limite) {
          return NextResponse.json(
            { erro: 'Limite de armazenamento da empresa atingido.' },
            { status: 400 },
          )
        }
      }
    }

    const { error: erroInsert } = await supabase.from('documentos').insert({
      id: documentoId,
      titulo,
      chave_arquivo: chaveArquivo,
      nome_arquivo: nomeArquivo,
      tamanho_arquivo: tamanhoArquivo,
      tipo_mime: tipoMime,
      extensao: nomeArquivo.split('.').pop()?.toLowerCase(),
      categoria_id: categoriaId ?? null,
      enviado_por: perfil.id,
      origem_publicacao: origem,
    })

    if (erroInsert) {
      return NextResponse.json({ erro: 'Erro ao registrar documento' }, { status: 500 })
    }

    await supabase.from('documento_empresas').insert(
      idsEmpresas.map((empresaId) => ({
        documento_id: documentoId,
        empresa_id: empresaId,
      })),
    )

    for (const empresaId of idsEmpresas) {
      await recalcularArmazenamentoEmpresa(empresaId)
    }

    const urlUpload = await gerarUrlUploadAssinada(chaveArquivo, tipoMime, tamanhoArquivo)

    return NextResponse.json({
      urlUpload,
      documentoId,
      chaveArquivo,
    })
  } catch {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }
}
