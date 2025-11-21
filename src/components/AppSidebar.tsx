import { LayoutDashboard, Settings, Bell, TrendingUp, LogOut, Shield, User, History } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import nottifyLogo from "@/assets/nottify-logo.png";
import { useAlertHistory } from "@/hooks/useAlertHistory";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Alert History", url: "/alert-history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { data: alertStats } = useAlertHistory();

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout successful");
      navigate("/login");
    } catch (error: any) {
      toast.error("Error logging out");
    }
  };

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-64"} border-r border-border bg-card transition-all`}
    >
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img src={nottifyLogo} alt="Nottify" className="w-10 h-10 glow-primary-hover" />
            {!isCollapsed && <span className="font-bold text-xl text-foreground">Nottify</span>}
          </div>
        </div>

        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "hidden" : ""}>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end
                    className="hover:bg-muted/50 transition-all hover:glow-primary-hover"
                    activeClassName="bg-muted text-primary font-medium border-glow"
                  >
                      <div className="flex items-center gap-3 flex-1">
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </div>
                      {!isCollapsed && item.url === "/alert-history" && alertStats?.pending && alertStats.pending > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {alertStats.pending}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                  <NavLink
                    to="/admin"
                    end
                    className="hover:bg-muted/50 transition-all hover:glow-primary-hover"
                    activeClassName="bg-muted text-primary font-medium border-glow"
                  >
                      <div className="flex items-center gap-3 flex-1">
                        <Shield className="h-5 w-5" />
                        {!isCollapsed && <span>Administration</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
