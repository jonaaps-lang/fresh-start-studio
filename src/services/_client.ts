// Internal helper — the ONLY place where services import the Supabase client.
// Routes and components must import from `@/services/*`, never from here.
export { supabase } from "@/integrations/supabase/client";

export function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
