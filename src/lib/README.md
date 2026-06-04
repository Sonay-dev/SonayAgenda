# src/lib

Codigo compartilhado do AgendaSonay.

- **`supabase.ts`** — cliente do Supabase (`@supabase/supabase-js`), lendo as
  chaves de `.env.local`. **Ainda sem autenticacao/login** — apenas o cliente
  configurado, pronto para a fase do banco.

## Como ligar ao seu projeto Supabase

1. Crie um projeto em https://supabase.com.
2. Em **Project Settings > API**, copie a **Project URL** e a **anon public key**.
3. Cole no arquivo `.env.local` (na raiz), nas variaveis
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Reinicie o `npm run dev` para o Next recarregar as variaveis.

> Quando entrarmos no login, o ideal e migrar para `@supabase/ssr` com
> clientes separados de servidor e navegador (cookies de sessao). Por ora,
> o cliente unico anon atende.
