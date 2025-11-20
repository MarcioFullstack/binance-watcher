import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, BarChart3, Calendar as CalendarIcon } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DailyPnL {
  date: string;
  pnl_usd: number;
  pnl_percentage: number;
}

export const PnLCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [marketType, setMarketType] = useState<'USDT' | 'COIN'>('USDT');
  const [viewMode, setViewMode] = useState<'calendar' | 'chart'>('calendar');

  const { data: dailyPnL, isLoading, refetch } = useQuery({
    queryKey: ['daily-pnl', format(currentDate, 'yyyy-MM'), marketType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('daily_pnl')
        .select('*')
        .eq('user_id', user.id)
        .eq('market_type', marketType)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching daily PnL:', error);
        return [];
      }

      return data as DailyPnL[];
    },
    refetchInterval: 120000, // Refetch every 2 minutes to avoid rate limits
  });

  // Auto-sync when component mounts or user comes back to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  const getPnLForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dailyPnL?.find(d => d.date === dateStr);
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'bg-success/20 text-success border-success/40';
    if (pnl < 0) return 'bg-destructive/20 text-destructive border-destructive/40';
    return 'bg-muted text-muted-foreground';
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });
  
  // Dias da semana
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  // Preencher dias vazios no início
  const firstDayOfWeek = getDay(start);
  const emptyDays = Array(firstDayOfWeek).fill(null);

  return (
    <Card className="p-0 border-border bg-card overflow-hidden">
      {/* Header com Abas e Navegação */}
      <div className="bg-background/50 border-b border-border">
        {/* Market Type Tabs */}
        <div className="flex items-center justify-between px-6 pt-4">
          <Tabs value={marketType} onValueChange={(v) => setMarketType(v as 'USDT' | 'COIN')} className="w-auto">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="USDT" className="text-xs font-medium">
                USD⊕-M
              </TabsTrigger>
              <TabsTrigger value="COIN" className="text-xs font-medium">
                COIN-M
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('chart')}
              className="h-8 w-8"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('calendar')}
              className="h-8 w-8"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-foreground">
              Ganhos e Perdas Diários
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[120px] text-center">
              <span className="text-sm font-medium text-foreground">
                {format(currentDate, 'yyyy-MM', { locale: ptBR })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs ml-2"
            >
              Hoje
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {days.map((day, i) => {
                const pnlData = getPnLForDate(day);
                const dayNum = format(day, 'd');
                const isTodayDate = isToday(day);
                
                return (
                  <div
                    key={i}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center
                      text-sm font-medium relative transition-all
                      ${isTodayDate ? 'ring-2 ring-primary' : ''}
                      ${pnlData 
                        ? pnlData.pnl_usd > 0 
                          ? 'bg-success/10 hover:bg-success/20 border border-success/20'
                          : pnlData.pnl_usd < 0
                          ? 'bg-destructive/10 hover:bg-destructive/20 border border-destructive/20'
                          : 'bg-muted/50 hover:bg-muted border border-border'
                        : 'bg-background/50 hover:bg-muted/50 border border-border/50'
                      }
                    `}
                    title={pnlData 
                      ? `${format(day, 'dd/MM')}\nPnL: ${pnlData.pnl_usd >= 0 ? '+' : ''}${pnlData.pnl_usd.toFixed(2)} USD\n${pnlData.pnl_percentage >= 0 ? '+' : ''}${pnlData.pnl_percentage.toFixed(2)}%` 
                      : format(day, 'dd/MM')}
                  >
                    <span className={`text-base ${isTodayDate ? 'font-bold text-primary' : 'text-foreground'}`}>
                      {dayNum}
                    </span>
                    {pnlData && pnlData.pnl_usd !== 0 && (
                      <span className={`text-[10px] font-semibold mt-1 ${
                        pnlData.pnl_usd > 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {pnlData.pnl_usd >= 0 ? '+' : ''}{pnlData.pnl_usd.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
