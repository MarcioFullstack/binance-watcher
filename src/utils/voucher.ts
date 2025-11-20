import { supabase } from "@/integrations/supabase/client";

export const activateVoucher = async (code: string) => {
  const { data, error } = await supabase.functions.invoke('activate-voucher', {
    body: { code }
  });

  if (error) {
    throw error;
  }

  return data;
};
