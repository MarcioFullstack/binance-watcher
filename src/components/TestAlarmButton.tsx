import { Button } from '@/components/ui/button';
import { Siren, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const TestAlarmButton = () => {
  const [loading, setLoading] = useState(false);

  const testAlarm = async (type: 'critical_loss' | 'gain') => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado');
        return;
      }

      const { data, error } = await supabase.functions.invoke('test-loss-alert', {
        body: { type }
      });

      if (error) throw error;

      toast.success(
        type === 'gain' ? 'Teste de alarme de ganho iniciado!' : 'Teste de alarme de perda iniciado!',
        {
          description: 'O alarme deve começar a tocar agora. Use o botão para desligar.',
          duration: 5000,
        }
      );
    } catch (error: any) {
      console.error('Error testing alarm:', error);
      toast.error('Erro ao testar alarme: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2"
        >
          <Siren className="h-4 w-4" />
          {loading ? 'Testando...' : 'Testar Alarmes'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Testar Alarmes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => testAlarm('critical_loss')}>
          <Siren className="mr-2 h-4 w-4 text-destructive" />
          Alarme de Perda
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => testAlarm('gain')}>
          <Coins className="mr-2 h-4 w-4 text-green-500" />
          Alarme de Ganho
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
