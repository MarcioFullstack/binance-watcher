import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface DailyPnL {
  date: string;
  pnl_usd: number;
  pnl_percentage: number;
}

export const PnLCalendar = () => {
  const [currentDate] = useState(new Date(2025, 10, 1)); // November 2025

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
    if (pnl > 0) return 'bg-success text-success-foreground';
    if (pnl < 0) return 'bg-destructive text-destructive-foreground';
    return 'bg-muted text-muted-foreground';
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
      {/* Grid de Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground">
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
          
          return (
            <div
              key={i}
              className={`
                aspect-square rounded-lg flex items-center justify-center
                text-sm font-medium cursor-pointer transition-all
                hover:scale-105 hover:shadow-md
                ${pnlData 
                  ? getPnLColor(pnlData.pnl_usd)
                  : 'bg-card border border-border hover:border-primary/50'
                }
              `}
              title={pnlData ? `${dayNum}: ${pnlData.pnl_usd >= 0 ? '+' : ''}${pnlData.pnl_usd.toFixed(2)} USD (${pnlData.pnl_percentage >= 0 ? '+' : ''}${pnlData.pnl_percentage.toFixed(2)}%)` : dayNum}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success" />
          <span className="text-muted-foreground">Lucro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive" />
          <span className="text-muted-foreground">Perda</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-border" />
          <span className="text-muted-foreground">Sem dados</span>
        </div>
      </div>
    </Card>
  );
};
