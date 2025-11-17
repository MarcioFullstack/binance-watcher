import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BarChart3, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface DailyPnL {
  date: string;
  pnl_usd: number;
  pnl_percentage: number;
  market_type: string;
}

interface PnLCalendarProps {
  isSyncing?: boolean;
  syncProgress?: { current: number; total: number };
}

export const PnLCalendar = ({ isSyncing = false, syncProgress }: PnLCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [marketType, setMarketType] = useState<"USDT" | "COIN">("USDT");
  const [pnlData, setPnlData] = useState<Record<string, DailyPnL>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "chart">("calendar");

  useEffect(() => {
    loadPnLData();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('daily-pnl-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_pnl'
        },
        () => {
          loadPnLData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate, marketType]);

  const loadPnLData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('daily_pnl')
        .select('*')
        .eq('user_id', user.id)
        .eq('market_type', marketType)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      if (error) throw error;

      const dataMap: Record<string, DailyPnL> = {};
      data?.forEach(record => {
        dataMap[record.date] = record;
      });
      setPnlData(dataMap);
    } catch (error) {
      console.error('Error loading PnL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getPnLForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return pnlData[dateStr];
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Get the day of week for the first day (0 = Sunday)
  const firstDayOfMonth = startOfMonth(currentDate).getDay();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Daily Gains and Losses Analysis</CardTitle>
              {isSyncing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "chart" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isSyncing && syncProgress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Syncing PnL data from Binance...</span>
                <span>{syncProgress.current}/{syncProgress.total}</span>
              </div>
              <Progress 
                value={(syncProgress.current / syncProgress.total) * 100} 
                className="h-1"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Type Tabs */}
        <Tabs value={marketType} onValueChange={(v) => setMarketType(v as "USDT" | "COIN")}>
          <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
            <TabsTrigger value="USDT">USD$-M</TabsTrigger>
            <TabsTrigger value="COIN">COIN-M</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "calendar" && (
          <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Daily Gains and Losses</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {format(currentDate, 'yyyy-MM')}
                </span>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Week day headers */}
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}
              
              {/* Calendar days */}
              {daysInMonth.map((day) => {
                const pnl = getPnLForDate(day);
                const hasPnL = !!pnl;
                const isProfit = pnl && pnl.pnl_usd > 0;
                const isLoss = pnl && pnl.pnl_usd < 0;
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-2 rounded-lg min-h-[60px] transition-colors",
                      hasPnL && "bg-card/50 border border-border",
                      !hasPnL && "bg-transparent"
                    )}
                  >
                    <span className="text-sm font-medium mb-1">
                      {format(day, 'd')}
                    </span>
                    {hasPnL && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isProfit && "text-green-500",
                          isLoss && "text-red-500"
                        )}
                      >
                        {isProfit ? '+' : ''}{pnl.pnl_usd.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "chart" && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Chart view coming soon...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};