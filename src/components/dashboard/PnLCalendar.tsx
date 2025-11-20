import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface DailyPnL {
  date: string;
  pnl_usd: number;
  pnl_percentage: number;
}

export const PnLCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: dailyPnL, isLoading } = useQuery({
    queryKey: ['daily-pnl', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('daily_pnl')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching daily PnL:', error);
        return [];
      }

      return data as DailyPnL[];
    },
  });

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

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border">
      {/* Header com Navegação */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-7 text-xs"
          >
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid de Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center text-xs font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de Dias do Mês */}
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
                text-sm font-medium cursor-pointer transition-all
                hover:scale-105 hover:shadow-lg relative
                ${isTodayDate ? 'ring-2 ring-primary ring-offset-2' : ''}
                ${pnlData 
                  ? `${getPnLColor(pnlData.pnl_usd)} border`
                  : 'bg-card border border-border hover:border-primary/50'
                }
              `}
              title={pnlData 
                ? `${format(day, 'dd/MM')}\nPnL: ${pnlData.pnl_usd >= 0 ? '+' : ''}${pnlData.pnl_usd.toFixed(2)} USD\n${pnlData.pnl_percentage >= 0 ? '+' : ''}${pnlData.pnl_percentage.toFixed(2)}%` 
                : format(day, 'dd/MM')}
            >
              <span className={isTodayDate ? 'font-bold' : ''}>{dayNum}</span>
              {pnlData && (
                <span className="text-[10px] font-semibold mt-0.5">
                  {pnlData.pnl_usd >= 0 ? '+' : ''}{pnlData.pnl_usd.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda e Estatísticas */}
      <div className="flex flex-col gap-4 mt-6">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-success/20 border border-success/40" />
            <span className="text-muted-foreground">Lucro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" />
            <span className="text-muted-foreground">Perda</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-border" />
            <span className="text-muted-foreground">Sem dados</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
