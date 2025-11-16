import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Bell, Shield, History } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import nottifyLogo from "@/assets/nottify-logo.png";
import { supabase } from "@/integrations/supabase/client";

interface DashboardHeaderProps {
  onLogout: () => void;
  isAdmin?: boolean;
  userId?: string;
}

export const DashboardHeader = ({ onLogout, isAdmin = false, userId }: DashboardHeaderProps) => {
  const [alertsOn, setAlertsOn] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchUnreadCount();
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel('notification-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_history',
            filter: `user_id=eq.${userId}`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchUnreadCount = async () => {
    if (!userId) return;
    
    const { count } = await supabase
      .from('notification_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    setUnreadCount(count || 0);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitor PnL</h1>
          <p className="text-sm text-muted-foreground">USD/S-M</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="icon"
          className="relative"
          onClick={() => navigate("/notifications")}
        >
          <History className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
        <Badge 
          variant={alertsOn ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => setAlertsOn(!alertsOn)}
        >
          <Bell className="w-3 h-3 mr-1" />
          Alertas {alertsOn ? "ON" : "OFF"}
        </Badge>
        {isAdmin && (
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
