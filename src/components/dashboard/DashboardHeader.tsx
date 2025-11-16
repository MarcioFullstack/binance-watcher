import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Bell, Shield } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import nottifyLogo from "@/assets/nottify-logo.png";

interface DashboardHeaderProps {
  onLogout: () => void;
  isAdmin?: boolean;
}

export const DashboardHeader = ({ onLogout, isAdmin = false }: DashboardHeaderProps) => {
  const [alertsOn, setAlertsOn] = useState(true);
  const navigate = useNavigate();

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
