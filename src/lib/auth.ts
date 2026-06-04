// Regras de acesso da entrada do app (prd.md secao 7).

// So este e-mail acessa o painel de administracao. Mesmo valor usado pela
// funcao is_admin() do banco (supabase/schema.sql).
export const ADMIN_EMAIL = "sonaydev88@gmail.com";

/**
 * Para onde mandar o usuario logado, conforme o e-mail:
 * admin -> painel de administracao; demais -> painel do profissional.
 */
export function rotaAposLogin(email: string | null | undefined): string {
  return email?.toLowerCase() === ADMIN_EMAIL ? "/admin" : "/profissional";
}
