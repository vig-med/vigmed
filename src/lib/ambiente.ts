import { z } from 'zod'
import {
  obterAmbienteDoHost as obterAmbienteDoHostEdge,
  obterUrlBaseDoAmbiente as obterUrlBaseDoAmbienteEdge,
  roteamentoPorSubdominio as roteamentoPorSubdominioEdge,
  dominioCookieCompartilhado as dominioCookieCompartilhadoEdge,
} from '@/lib/ambiente-edge'

export {
  obterAmbienteDoHostEdge as obterAmbienteDoHost,
  obterUrlBaseDoAmbienteEdge as obterUrlBaseDoAmbiente,
  roteamentoPorSubdominioEdge as roteamentoPorSubdominio,
  dominioCookieCompartilhadoEdge as dominioCookieCompartilhado,
}

/** Validação das variáveis de ambiente - falha cedo se algo estiver ausente */
const esquemaAmbiente = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('VIGMED'),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('vigmed.com.br'),
  VIGMED_DEV_TENANT: z.enum(['site', 'adm', 'docs', 'blog']).default('site'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_PROJECT_ID: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_BUCKET_NAME: z.string().default('vigmed-docs'),
  R2_PUBLIC_URL: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
  NEXT_PUBLIC_BLOG_URL: z.string().url().optional(),
})

export type Ambiente = z.infer<typeof esquemaAmbiente>

export type { AmbienteApp } from '@/lib/ambiente-edge'

export function obterAmbiente(): Ambiente {
  return esquemaAmbiente.parse({    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    VIGMED_DEV_TENANT: process.env.VIGMED_DEV_TENANT,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_BLOG_URL: process.env.NEXT_PUBLIC_BLOG_URL,
  })
}
