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

    // Buscar configurações de sirene
    const { data: riskSettings } = await supabase
      .from('risk_settings')
      .select('siren_type')
      .eq('user_id', user.id)
      .maybeSingle();

    const sirenType = riskSettings?.siren_type || 'police';

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

    // Som de alarme com tipo de sirene configurado
    if (level.sound_enabled) {
      await playAlarmForLevel(level.level_name, sirenType);
    }

    // Registrar no histórico
    try {
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

  const playAlarmForLevel = async (
    level: 'warning' | 'danger' | 'critical' | 'emergency',
    sirenType: string = 'police'
  ) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const startTime = audioContext.currentTime;
    
    // Duração baseada no nível de severidade
    const baseDuration = level === 'emergency' ? 5 : level === 'critical' ? 4 : 3;
    const duration = baseDuration;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Volume baseado na severidade
    const volume = level === 'emergency' ? 0.5 : level === 'critical' ? 0.4 : level === 'danger' ? 0.35 : 0.3;
    gainNode.gain.setValueAtTime(volume, startTime);

    // Padrões de sirene diferentes baseados no tipo selecionado
    switch(sirenType) {
      case 'police': // Sirene de polícia - padrão europeu
        oscillator.frequency.setValueAtTime(800, startTime);
        for (let i = 0; i < duration * 2; i++) {
          const time = startTime + (i * 0.5);
          oscillator.frequency.exponentialRampToValueAtTime(
            i % 2 === 0 ? 1200 : 800, 
            time + 0.5
          );
        }
        break;

      case 'ambulance': // Sirene de ambulância - Hi-Lo
        oscillator.frequency.setValueAtTime(600, startTime);
        for (let i = 0; i < duration * 3; i++) {
          const time = startTime + (i * 0.33);
          oscillator.frequency.exponentialRampToValueAtTime(
            i % 2 === 0 ? 900 : 600, 
            time + 0.33
          );
        }
        break;

      case 'fire': // Sirene de bombeiros - Wail rápido
        oscillator.frequency.setValueAtTime(500, startTime);
        for (let i = 0; i < duration * 2.5; i++) {
          const time = startTime + (i * 0.4);
          oscillator.frequency.exponentialRampToValueAtTime(
            i % 2 === 0 ? 1500 : 500, 
            time + 0.4
          );
        }
        break;

      case 'alarm': // Alarme de prédio - Pulsante rápido
        oscillator.frequency.setValueAtTime(1000, startTime);
        for (let i = 0; i < duration * 5; i++) {
          const time = startTime + (i * 0.2);
          oscillator.frequency.exponentialRampToValueAtTime(
            i % 2 === 0 ? 1500 : 1000, 
            time + 0.2
          );
        }
        break;

      case 'alert': // Alerta agudo - Tom contínuo agudo
        oscillator.frequency.setValueAtTime(1500, startTime);
        for (let i = 0; i < duration * 6; i++) {
          const time = startTime + (i * 0.15);
          oscillator.frequency.exponentialRampToValueAtTime(
            i % 2 === 0 ? 2000 : 1500, 
            time + 0.15
          );
        }
        break;

      default: // Fallback para police
        oscillator.frequency.setValueAtTime(800, startTime);
        for (let i = 0; i < duration * 2; i++) {
          const time = startTime + (i * 0.5);
          oscillator.frequency.exponentialRampToValueAtTime(
            i % 2 === 0 ? 1200 : 800, 
            time + 0.5
          );
        }
    }

    // Fade out no final
    gainNode.gain.linearRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
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
