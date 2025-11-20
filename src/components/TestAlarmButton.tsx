import { Button } from '@/components/ui/button';
import { Siren, Coins, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const TestAlarmButton = () => {
  const [loading, setLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

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

  const clearTestNotifications = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado');
        return;
      }

      const { data, error } = await supabase.functions.invoke('clear-test-notifications');

      if (error) throw error;

      toast.success('Notificações de teste limpas!', {
        description: `${data.count} notificação(ões) removida(s) do histórico.`,
        duration: 3000,
      });
      setShowClearDialog(false);
    } catch (error: any) {
      console.error('Error clearing test notifications:', error);
      toast.error('Erro ao limpar notificações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Limpar Notificações de Teste
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja limpar todas as notificações de teste do histórico? 
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={clearTestNotifications}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Limpando...' : 'Sim, Limpar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
