import { createClient } from "@/lib/supabase/client";

/**
 * Singleton do cliente de NAVEGADOR, mantido para compatibilidade com a
 * pagina publica do cliente (/cliente), que importa `supabase` direto.
 *
 * Codigo novo deve preferir `createClient()` de "@/lib/supabase/client"
 * (navegador) ou "@/lib/supabase/server" (servidor).
 */
export const supabase = createClient();
