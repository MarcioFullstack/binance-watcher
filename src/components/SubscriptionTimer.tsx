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

  // Alerta sonoro quando faltar menos de 1 hora
  useEffect(() => {
    if (!loading && !timeRemaining.isExpired && timeRemaining.total > 0) {
      const oneHourInMs = 60 * 60 * 1000;
      
      if (timeRemaining.total <= oneHourInMs && timeRemaining.total > oneHourInMs - 60000) {
        // Toca alerta sonoro apenas uma vez quando atingir 1 hora
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVKzn8a1hGAg+ltry0H0pBSh+zPHaizsIGGS56+mbTA0OTqXh8bllHQc2jdXzzn4qBSh9y/DblTsKF2O56+aaTQwNTKPh8bllHQg2jdT0z4AqBSh9yvDblDsKF2O46+aaTAwOTKPh8bllHQg2jdX0z38qBSh9yfDblDsKGGO46+aaTAwOTKPg8rllHQg2jdX0z38qBSh9yfDblDwKF2O46+aaTAwOTKPh8bllHQg2jdXzzn8qBSh9yfDblDwKGGO46+aaTAwOTKPh8rllHQg2jdX0z38qBSh9yfDblDwKGGO46+aaTAwOTKPh8rllHQg2jdX0z38pBSh9yfDblDwKGGO46+aaTAwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTAwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBSh9yfDblTwKGGO46+aaTQwOTKPh8rllHQg2jdX0z38pBQ==');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Erro ao tocar alerta:', err));
        
        toast.warning('⚠️ URGENTE: Menos de 1 hora para sua assinatura expirar!', {
          description: 'Renove agora para evitar interrupção do serviço.',
          duration: 10000,
        });
      }
    }
  }, [timeRemaining.total, loading, timeRemaining.isExpired]);

  const handleClick = () => {
    navigate('/payment');
  };

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
      <div 
        onClick={handleClick}
        className={`flex items-center gap-1.5 ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-md border border-destructive bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors`}
      >
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
          <div 
            onClick={handleClick}
            className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-md border cursor-pointer transition-all hover:bg-accent/50 hover:scale-105 ${showWarning ? 'border-amber-500 bg-amber-500/10' : ''} ${isUrgent ? 'border-destructive bg-destructive/10 animate-pulse' : ''}`}
          >
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
            <p className="font-semibold">Subscription expires in:</p>
            <p className="text-sm text-muted-foreground mt-1">
              {timeRemaining.expiresAt && format(timeRemaining.expiresAt, "MMMM dd, yyyy 'at' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-primary mt-2 font-medium">Click to renew now</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
