import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

export interface AuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: data.userId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        details: data.details,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      });

    if (error) {
      console.error('Error creating audit log:', error);
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
