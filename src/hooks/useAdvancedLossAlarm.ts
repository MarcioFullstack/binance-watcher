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
  alarmActive: boolean;
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
    alarmActive: false,
  });

  const lastTriggeredLevelRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

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
      alarmActive: lossStatus.alarmActive, // Mantém estado do alarme
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

    // Som de alarme contínuo com tipo de sirene configurado
    if (level.sound_enabled) {
      startContinuousAlarm(level.level_name, sirenType);
      setLossStatus(prev => ({ ...prev, alarmActive: true }));
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

  const startContinuousAlarm = (
    level: 'warning' | 'danger' | 'critical' | 'emergency',
    sirenType: string = 'police'
  ) => {
    // Para qualquer alarme existente
    stopAlarm();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    
    // Volume ALTO baseado na severidade
    const volume = level === 'emergency' ? 0.8 : level === 'critical' ? 0.7 : level === 'danger' ? 0.6 : 0.5;

    // Função para tocar um ciclo do alarme
    const playCycle = () => {
      if (!audioContextRef.current) return;

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;

      const startTime = audioContextRef.current.currentTime;
      const cycleDuration = 5; // 5 segundos por ciclo - alarme mais longo

      gainNode.gain.setValueAtTime(volume, startTime);

      // Padrões de sirene diferentes baseados no tipo selecionado - duração estendida para 5 segundos
      switch(sirenType) {
        case 'police': // Sirene de polícia - mais ciclos
          oscillator.frequency.setValueAtTime(800, startTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + 0.6);
          oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 1.2);
          oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + 1.8);
          oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 2.4);
          oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + 3);
          oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 3.6);
          oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + 4.2);
          oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 5);
          break;

        case 'ambulance': // Sirene de ambulância - mais ciclos
          oscillator.frequency.setValueAtTime(600, startTime);
          for (let i = 0; i < 12; i++) {
            const time = startTime + (i * 0.42);
            oscillator.frequency.exponentialRampToValueAtTime(
              i % 2 === 0 ? 900 : 600,
              time + 0.42
            );
          }
          break;

        case 'fire': // Sirene de bombeiros - mais lento e longo
          oscillator.frequency.setValueAtTime(500, startTime);
          oscillator.frequency.exponentialRampToValueAtTime(1500, startTime + 1.25);
          oscillator.frequency.exponentialRampToValueAtTime(500, startTime + 2.5);
          oscillator.frequency.exponentialRampToValueAtTime(1500, startTime + 3.75);
          oscillator.frequency.exponentialRampToValueAtTime(500, startTime + 5);
          break;

        case 'alarm': // Alarme de prédio - mais repetições
          oscillator.frequency.setValueAtTime(1000, startTime);
          for (let i = 0; i < 25; i++) {
            const time = startTime + (i * 0.2);
            oscillator.frequency.exponentialRampToValueAtTime(
              i % 2 === 0 ? 1500 : 1000, 
              time + 0.2
            );
          }
          break;

        case 'alert': // Alerta agudo - mais repetições
          oscillator.frequency.setValueAtTime(1500, startTime);
          for (let i = 0; i < 33; i++) {
            const time = startTime + (i * 0.15);
            oscillator.frequency.exponentialRampToValueAtTime(
              i % 2 === 0 ? 2000 : 1500, 
              time + 0.15
            );
          }
          break;

        default:
          oscillator.frequency.setValueAtTime(800, startTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + 2.5);
          oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 5);
      }

      oscillator.start(startTime);
      oscillator.stop(startTime + cycleDuration);
    };

    // Toca o primeiro ciclo imediatamente
    playCycle();

    // Configura loop contínuo a cada 5.5 segundos (um pouco mais que o ciclo)
    alarmIntervalRef.current = window.setInterval(() => {
      playCycle();
    }, 5500);
  };

  const stopAlarm = () => {
    // Para o intervalo
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    // Para o oscillador atual
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // Ignora erro se já foi parado
      }
      oscillatorRef.current = null;
    }

    // Limpa o gain node
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    setLossStatus(prev => ({ ...prev, alarmActive: false }));
  };

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      stopAlarm();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    lossStatus,
    alertLevels: alertLevels || [],
    stopAlarm,
  };
};
