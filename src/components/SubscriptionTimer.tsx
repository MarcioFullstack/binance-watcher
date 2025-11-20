import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";
import { Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";

interface SubscriptionTimerProps {
  userId: string | undefined;
  onExpired?: () => void;
}

export const SubscriptionTimer = ({ userId, onExpired }: SubscriptionTimerProps) => {
  const { timeRemaining, loading } = useSubscriptionTimer(userId);
  const navigate = useNavigate();

  useEffect(() => {
    if (timeRemaining.isExpired && !loading) {
      toast.error("Your subscription has expired! Please renew to continue.");
      if (onExpired) {
        onExpired();
      } else {
        navigate("/payment");
      }
    }
  }, [timeRemaining.isExpired, loading, navigate, onExpired]);

  if (loading || !userId) return null;

  if (timeRemaining.isExpired) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-sm font-medium text-destructive">Assinatura Expirada</span>
      </div>
    );
  }

  // Show warning when less than 3 days remaining
  const showWarning = timeRemaining.days < 3;
  const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 12;

  // Don't show anything if subscription is active and no warnings
  if (!showWarning) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${showWarning ? 'border-amber-500 bg-amber-500/10' : ''} ${isUrgent ? 'border-destructive bg-destructive/10' : ''}`}>
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
      ) : (
        <Clock className={`h-4 w-4 ${showWarning ? 'text-amber-600' : 'text-primary'} flex-shrink-0`} />
      )}
      <div className="flex items-center gap-1.5">
        {timeRemaining.days > 0 && (
          <>
            <span className={`text-lg font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
              {timeRemaining.days}
            </span>
            <span className="text-xs text-muted-foreground">d</span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className={`text-lg font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
          {String(timeRemaining.hours).padStart(2, '0')}
        </span>
        <span className="text-xs text-muted-foreground">h</span>
        <span className="text-muted-foreground">:</span>
        <span className={`text-lg font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
          {String(timeRemaining.minutes).padStart(2, '0')}
        </span>
        <span className="text-xs text-muted-foreground">m</span>
      </div>
    </div>
  );
};
