import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LossAlertLevel {
  id: string;
  level_name: 'warning' | 'danger' | 'critical' | 'emergency';
  loss_percentage: number;
  enabled: boolean;
  sound_enabled: boolean;
  visual_alert: boolean;
  push_notification: boolean;
}

interface LossStatus {
  currentLossPercent: number;
  currentLossAmount: number;
  triggeredLevel: LossAlertLevel | null;
  isInLoss: boolean;
}

export const useAdvancedLossAlarm = (
  currentBalance: number,
  initialBalance: number,
  enabled: boolean = true
) => {
  const [lossStatus, setLossStatus] = useState<LossStatus>({
    currentLossPercent: 0,
    currentLossAmount: 0,
    triggeredLevel: null,
    isInLoss: false,
  });

  const lastTriggeredLevelRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Buscar níveis de alerta configurados
  const { data: alertLevels } = useQuery({
    queryKey: ['loss-alert-levels'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('loss_alert_levels')
        .select('*')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .order('loss_percentage', { ascending: true });

      if (error) throw error;
      return data as LossAlertLevel[];
    },
    enabled: enabled && initialBalance > 0,
    refetchInterval: 5000,
  });

  // Calcular status de perda em tempo real
  useEffect(() => {
    if (!enabled || !initialBalance || initialBalance === 0 || !alertLevels) return;

    const lossAmount = initialBalance - currentBalance;
    const lossPercent = (lossAmount / initialBalance) * 100;

    // Encontrar o nível mais alto atingido
    let triggeredLevel: LossAlertLevel | null = null;
    
    for (const level of [...(alertLevels || [])].reverse()) {
      if (lossPercent >= level.loss_percentage) {
        triggeredLevel = level;
        break;
      }
    }

    setLossStatus({
      currentLossPercent: lossPercent,
      currentLossAmount: lossAmount,
      triggeredLevel,
      isInLoss: lossPercent > 0,
    });

    // Disparar alarme se mudou de nível
    if (triggeredLevel && triggeredLevel.id !== lastTriggeredLevelRef.current) {
      lastTriggeredLevelRef.current = triggeredLevel.id;
      handleLossAlert(triggeredLevel, lossPercent, lossAmount);
    } else if (!triggeredLevel) {
      lastTriggeredLevelRef.current = null;
    }

  }, [currentBalance, initialBalance, enabled, alertLevels]);

  const handleLossAlert = async (
    level: LossAlertLevel,
    lossPercent: number,
    lossAmount: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Alertas visuais
    if (level.visual_alert) {
      const messages = {
        warning: `⚠️ Atenção: Você atingiu ${lossPercent.toFixed(2)}% de perda`,
        danger: `🔴 Alerta de Perda: ${lossPercent.toFixed(2)}% - Revise suas posições!`,
        critical: `🚨 CRÍTICO: ${lossPercent.toFixed(2)}% de perda - Ação necessária!`,
        emergency: `🆘 EMERGÊNCIA: ${lossPercent.toFixed(2)}% de perda - FECHE POSIÇÕES AGORA!`,
      };

      toast.error(messages[level.level_name], {
        duration: level.level_name === 'emergency' ? Infinity : 10000,
      });
    }

    // Som de alarme
    if (level.sound_enabled) {
      await playAlarmForLevel(level.level_name);
    }

    // Registrar no histórico
    try {
      const { data: riskSettings } = await supabase
        .from('risk_settings')
        .select('siren_type')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.from('loss_alert_history').insert({
        user_id: user.id,
        level_name: level.level_name,
        loss_percentage: lossPercent,
        loss_amount: lossAmount,
        balance_at_alert: currentBalance,
        initial_balance: initialBalance,
        alert_message: `Perda de ${lossPercent.toFixed(2)}% (${lossAmount.toFixed(2)} USDT) detectada`,
      });
    } catch (error) {
      console.error('Error saving loss alert history:', error);
    }
  };

  const playAlarmForLevel = async (level: 'warning' | 'danger' | 'critical' | 'emergency') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const duration = level === 'emergency' ? 5 : level === 'critical' ? 4 : 3;
    const startTime = audioContext.currentTime;

    // Intensidade aumenta com o nível
    const frequencies = {
      warning: [600, 800],
      danger: [700, 1000],
      critical: [800, 1200],
      emergency: [900, 1400],
    };

    const [freq1, freq2] = frequencies[level];

    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.frequency.setValueAtTime(freq1, startTime);
    oscillator2.frequency.setValueAtTime(freq2, startTime);

    const volume = level === 'emergency' ? 0.9 : level === 'critical' ? 0.8 : level === 'danger' ? 0.7 : 0.5;
    gainNode.gain.setValueAtTime(volume, startTime);

    // Padrão de alternância mais rápido para níveis mais graves
    const switchSpeed = level === 'emergency' ? 0.2 : level === 'critical' ? 0.3 : 0.5;
    const cycles = duration / switchSpeed;

    for (let i = 0; i < cycles; i++) {
      const time = startTime + (i * switchSpeed);
      if (i % 2 === 0) {
        oscillator1.frequency.linearRampToValueAtTime(freq1, time);
        oscillator2.frequency.linearRampToValueAtTime(freq2, time);
      } else {
        oscillator1.frequency.linearRampToValueAtTime(freq2, time);
        oscillator2.frequency.linearRampToValueAtTime(freq1, time);
      }
    }

    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator1.start(startTime);
    oscillator2.start(startTime);
    oscillator1.stop(startTime + duration);
    oscillator2.stop(startTime + duration);
  };

  // Limpar audioContext ao desmontar
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    lossStatus,
    alertLevels: alertLevels || [],
  };
};
