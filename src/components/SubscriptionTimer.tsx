import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";
import { Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

interface SubscriptionTimerProps {
  userId: string | undefined;
  onExpired?: () => void;
}

export const SubscriptionTimer = ({ userId, onExpired }: SubscriptionTimerProps) => {
  const { timeRemaining, loading } = useSubscriptionTimer(userId);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      <div className={`flex items-center gap-1.5 ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-md border border-destructive bg-destructive/10`}>
        <AlertTriangle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-destructive flex-shrink-0`} />
        <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-destructive`}>
          {isMobile ? 'Expirado' : 'Assinatura Expirada'}
        </span>
      </div>
    );
  }

  // Show warning when less than 3 days remaining
  const showWarning = timeRemaining.days < 3;
  const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 12;

  // Don't show anything if subscription is active and no warnings
  if (!showWarning) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-md border cursor-pointer transition-colors hover:bg-accent/50 ${showWarning ? 'border-amber-500 bg-amber-500/10' : ''} ${isUrgent ? 'border-destructive bg-destructive/10' : ''}`}>
            {isUrgent ? (
              <AlertTriangle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-destructive flex-shrink-0`} />
            ) : (
              <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${showWarning ? 'text-amber-600' : 'text-primary'} flex-shrink-0`} />
            )}
            <div className={`flex items-center ${isMobile ? 'gap-0.5' : 'gap-1.5'}`}>
              {timeRemaining.days > 0 && (
                <>
                  <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                    {timeRemaining.days}
                  </span>
                  <span className="text-[10px] text-muted-foreground">d</span>
                  {!isMobile && <span className="text-muted-foreground">:</span>}
                </>
              )}
              <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                {String(timeRemaining.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-muted-foreground">h</span>
              {!isMobile && (
                <>
                  <span className="text-muted-foreground">:</span>
                  <span className={`text-lg font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                    {String(timeRemaining.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-muted-foreground">m</span>
                </>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-center">
            <p className="font-semibold">Assinatura expira em:</p>
            <p className="text-sm text-muted-foreground mt-1">
              {timeRemaining.expiresAt && format(timeRemaining.expiresAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
