import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  const [alertsOn, setAlertsOn] = useState(true);
  const navigate = useNavigate();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold">N</span>
        </div>
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
