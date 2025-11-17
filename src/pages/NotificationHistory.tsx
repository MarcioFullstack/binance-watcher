import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, CheckCircle2, AlertCircle, XCircle, ArrowLeft, Trash2, CalendarIcon, Filter, ArrowUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const NotificationHistory = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [sortBy, setSortBy] = useState<string>("newest");
  const navigate = useNavigate();

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return ptBR;
    }
  };

  useEffect(() => {
    checkUserAndFetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, typeFilter, startDate, endDate, sortBy]);

  const applyFilters = () => {
    let filtered = [...notifications];

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(n => 
        isAfter(new Date(n.created_at), startOfDay(startDate)) ||
        new Date(n.created_at).toDateString() === startDate.toDateString()
      );
    }

    if (endDate) {
      filtered = filtered.filter(n => 
        isBefore(new Date(n.created_at), endOfDay(endDate)) ||
        new Date(n.created_at).toDateString() === endDate.toDateString()
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "unread":
          // Unread first, then by newest
          if (a.is_read === b.is_read) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.is_read ? 1 : -1;
        default:
          return 0;
      }
    });

    setFilteredNotifications(filtered);
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setSortBy("newest");
  };

  const checkUserAndFetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      await fetchNotifications(user.id);
    } catch (error) {
      console.error("Error:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error loading notifications",
        description: "Não foi possível carregar o histórico de notificações.",
        variant: "destructive",
      });
    } else {
      setNotifications(data || []);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notification_history')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      setNotifications(updatedNotifications);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notification_history')
      .delete()
      .eq('id', notificationId);

    if (error) {
      toast({
        title: "Error deleting",
        description: "Could not delete notification.",
        variant: "destructive",
      });
    } else {
      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast({
        title: "Notificação excluída",
        description: "A notificação foi removida do histórico.",
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notification_history')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast({
        title: "Notificações marcadas como lidas",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    }
  };

  const clearAll = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notification_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error clearing history",
        description: "Could not clear notification history.",
        variant: "destructive",
      });
    } else {
      setNotifications([]);
      toast({
        title: "Histórico limpo",
        description: "Todas as notificações foram removidas.",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <Badge className="bg-success/10 text-success border-success/20">{t('notifications.success')}</Badge>;
      case 'warning':
        return <Badge className="bg-warning/10 text-warning border-warning/20">{t('notifications.warning')}</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{t('notifications.error')}</Badge>;
      default:
        return <Badge>{t('notifications.info')}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;
  const hasActiveFilters = typeFilter !== "all" || startDate !== undefined || endDate !== undefined || sortBy !== "newest";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{t('notifications.title')}</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 
                ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
                : 'Todas as notificações lidas'
              }
              {hasActiveFilters && ` • ${filteredNotifications.length} de ${notifications.length} notificações`}
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>{t('notifications.filterBy')} e {t('notifications.sortBy')}</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('notifications.clearFilters')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('notifications.type')}</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('notifications.type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('notifications.all')}</SelectItem>
                    <SelectItem value="success">{t('notifications.success')}</SelectItem>
                    <SelectItem value="warning">{t('notifications.warning')}</SelectItem>
                    <SelectItem value="error">{t('notifications.error')}</SelectItem>
                    <SelectItem value="info">{t('notifications.info')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {t('notifications.sortBy')}
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('notifications.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('notifications.newest')}</SelectItem>
                    <SelectItem value="oldest">{t('notifications.oldest')}</SelectItem>
                    <SelectItem value="unread">{t('notifications.unreadFirst')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('notifications.startDate')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => 
                        date > new Date() || (startDate ? date < startDate : false)
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {notifications.length > 0 && (
          <div className="flex gap-2 mb-6">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                Marcar todas como lidas
              </Button>
            )}
            <Button variant="outline" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar histórico
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  {hasActiveFilters 
                    ? "No notifications found with the filters applied"
                    : "No notifications in history"
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-all ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{notification.title}</CardTitle>
                          {getTypeBadge(notification.type)}
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                        <CardDescription>{notification.description}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Marcar como lida
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistory;
