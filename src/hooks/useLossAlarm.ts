import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useLossAlarm = (currentBalance: number, enabled: boolean = true) => {
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const lastBalanceRef = useRef<number>(currentBalance);

  const playPoliceSiren = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 3;
    const startTime = audioContext.currentTime;
    
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(800, startTime);
    oscillator2.frequency.setValueAtTime(1200, startTime);
    
    gainNode.gain.setValueAtTime(0.7, startTime);
    
    for (let i = 0; i < duration * 2; i++) {
      const time = startTime + (i * 0.5);
      if (i % 2 === 0) {
        oscillator1.frequency.linearRampToValueAtTime(800, time);
        oscillator2.frequency.linearRampToValueAtTime(1200, time);
      } else {
        oscillator1.frequency.linearRampToValueAtTime(1000, time);
        oscillator2.frequency.linearRampToValueAtTime(900, time);
      }
    }
    
    gainNode.gain.setValueAtTime(0.7, startTime + duration - 0.5);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator1.start(startTime);
    oscillator2.start(startTime);
    oscillator1.stop(startTime + duration);
    oscillator2.stop(startTime + duration);
  };

  const playAlarm = (type: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 3;
    const startTime = audioContext.currentTime;
    
    if (type === "police") {
      playPoliceSiren();
    } else if (type === "ambulance") {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(500, startTime);
      gainNode.gain.setValueAtTime(0.6, startTime);
      
      for (let i = 0; i < duration * 4; i++) {
        const time = startTime + (i * 0.25);
        oscillator.frequency.linearRampToValueAtTime(
          i % 2 === 0 ? 500 : 700,
          time
        );
      }
      
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } else if (type === "fire") {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(600, startTime);
      gainNode.gain.setValueAtTime(0.5, startTime);
      
      for (let i = 0; i < duration * 8; i++) {
        const time = startTime + (i * 0.125);
        oscillator.frequency.linearRampToValueAtTime(
          i % 2 === 0 ? 600 : 450,
          time
        );
      }
      
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } else if (type === "air-raid") {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, startTime);
      gainNode.gain.setValueAtTime(0.6, startTime);
      
      oscillator.frequency.exponentialRampToValueAtTime(800, startTime + duration / 2);
      oscillator.frequency.exponentialRampToValueAtTime(200, startTime + duration);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } else if (type === "alarm-clock") {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1000, startTime);
      
      for (let i = 0; i < duration * 4; i++) {
        const time = startTime + (i * 0.25);
        gainNode.gain.setValueAtTime(i % 2 === 0 ? 0.5 : 0, time);
      }
      
      gainNode.gain.setValueAtTime(0, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    }
  };

  const { data: settings } = useQuery({
    queryKey: ["loss-alarm-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("risk_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled,
  });

  useEffect(() => {
    if (!settings || !settings.risk_active || !enabled) {
      return;
    }

    const initialBalance = settings.initial_balance || 0;
    const riskPercent = settings.risk_percent || 5;
    
    if (initialBalance <= 0) {
      return;
    }

    // Calcular perda atual
    const loss = initialBalance - currentBalance;
    const lossPercentage = (loss / initialBalance) * 100;

    // Verificar se atingiu o limite de perda
    if (lossPercentage >= riskPercent && !alarmTriggered) {
      // Trigger alarm
      const sirenType = settings.siren_type || "police";
      playAlarm(sirenType);
      
      toast.error(
        `⚠️ ALARME DE PERDA ACIONADO!\nPerda de ${lossPercentage.toFixed(2)}% (${loss.toFixed(2)} USD)`,
        {
          duration: 10000,
          position: "top-center",
        }
      );
      
      setAlarmTriggered(true);
      
      // Send notification to history
      supabase
        .from("notification_history")
        .insert({
          user_id: (settings as any).user_id,
          title: "Alarme de Perda Acionado",
          description: `Sua perda atingiu ${lossPercentage.toFixed(2)}% (${loss.toFixed(2)} USD) do saldo inicial.`,
          type: "warning",
        })
        .then();
    }

    // Reset alarm if balance recovers above threshold
    if (lossPercentage < riskPercent - 1 && alarmTriggered) {
      setAlarmTriggered(false);
    }

    lastBalanceRef.current = currentBalance;
  }, [currentBalance, settings, enabled, alarmTriggered]);

  const calculateLossPercentage = () => {
    if (!settings || settings.initial_balance <= 0) return 0;
    const loss = settings.initial_balance - currentBalance;
    return (loss / settings.initial_balance) * 100;
  };

  return {
    settings,
    alarmTriggered,
    lossPercentage: calculateLossPercentage(),
  };
};
