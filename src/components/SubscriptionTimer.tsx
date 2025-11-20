import { useSubscriptionTimer } from "@/hooks/useSubscriptionTimer";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Subscription Expired</p>
              <p className="text-sm text-muted-foreground">
                Please renew your subscription to continue using the service
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show warning when less than 3 days remaining
  const showWarning = timeRemaining.days < 3;
  const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 12;

  // Don't show anything if subscription is active and no warnings
  if (!showWarning) return null;

  return (
    <Card className={`${showWarning ? 'border-amber-500 bg-amber-500/10' : ''} ${isUrgent ? 'border-destructive bg-destructive/10' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {isUrgent ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <Clock className={`h-5 w-5 ${showWarning ? 'text-amber-600' : 'text-primary'}`} />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
              {isUrgent ? 'Subscription expiring soon!' : showWarning ? 'Subscription expiring soon' : 'Subscription active'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              {timeRemaining.days > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                    {timeRemaining.days}
                  </span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                  {String(timeRemaining.hours).padStart(2, '0')}
                </span>
                <span className="text-sm text-muted-foreground">h</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                  {String(timeRemaining.minutes).padStart(2, '0')}
                </span>
                <span className="text-sm text-muted-foreground">m</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold ${isUrgent ? 'text-destructive' : showWarning ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
                  {String(timeRemaining.seconds).padStart(2, '0')}
                </span>
                <span className="text-sm text-muted-foreground">s</span>
              </div>
            </div>
          </div>
        </div>
        {showWarning && (
          <p className="text-xs text-muted-foreground mt-2">
            {isUrgent 
              ? 'Renew now to avoid service interruption!' 
              : 'Consider renewing your subscription to avoid interruption'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
