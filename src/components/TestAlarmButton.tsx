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
        toast.error('You need to be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('test-loss-alert', {
        body: { type }
      });

      if (error) throw error;

      toast.success(
        type === 'gain' ? 'Gain alarm test started!' : 'Loss alarm test started!',
        {
          description: 'The alarm should start sounding now. Use the button to turn it off.',
          duration: 5000,
        }
      );
    } catch (error: any) {
      console.error('Error testing alarm:', error);
      toast.error('Error testing alarm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearTestNotifications = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You need to be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('clear-test-notifications');

      if (error) throw error;

      toast.success('Test notifications cleared!', {
        description: `${data.count} notification(s) removed from history.`,
        duration: 3000,
      });
      setShowClearDialog(false);
    } catch (error: any) {
      console.error('Error clearing test notifications:', error);
      toast.error('Error clearing notifications: ' + error.message);
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
          {loading ? 'Testing...' : 'Test Alarms'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Test Alarms</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => testAlarm('critical_loss')}>
          <Siren className="mr-2 h-4 w-4 text-destructive" />
          Loss Alarm
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => testAlarm('gain')}>
          <Coins className="mr-2 h-4 w-4 text-green-500" />
          Gain Alarm
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Test Notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Cleanup</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to clear all test notifications from history? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={clearTestNotifications}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Clearing...' : 'Yes, Clear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
