import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SirenType = 'police' | 'ambulance' | 'fire' | 'air_raid' | 'car_alarm' | 'buzzer';

export const useAlertSounds = (userId: string | undefined) => {
  const lastNotificationId = useRef<string | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<{
    type: 'loss' | 'gain';
    intervalId: number | null;
  } | null>(null);
  const [userSirenType, setUserSirenType] = useState<SirenType>('police');

  const playCoinsSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 2;
    const startTime = audioContext.currentTime;
    
    // Criar múltiplos tons para simular moedas caindo
    const frequencies = [800, 1000, 1200, 900, 1100, 950];
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Envelope de volume para cada "moeda"
      const coinStart = startTime + (index * 0.15);
      gainNode.gain.setValueAtTime(0, coinStart);
      gainNode.gain.linearRampToValueAtTime(0.3, coinStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, coinStart + 0.3);
      
      oscillator.start(coinStart);
      oscillator.stop(coinStart + 0.3);
    });
    
    // Som adicional de "tinir" usando ruído branco
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * 0.1));
    }
    
    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, startTime);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    
    noiseGain.gain.setValueAtTime(0.1, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    noise.start(startTime);
    noise.stop(startTime + 0.5);
  };

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

  const playAmbulanceSiren = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 2;
    const startTime = audioContext.currentTime;
    
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.4, startTime);
    
    // Ambulance: fast alternating high-pitched tones
    for (let i = 0; i < 8; i++) {
      const time = startTime + i * 0.25;
      const freq = i % 2 === 0 ? 800 : 950;
      oscillator1.frequency.setValueAtTime(freq, time);
      oscillator2.frequency.setValueAtTime(freq + 5, time);
    }
    
    oscillator1.start(startTime);
    oscillator2.start(startTime);
    oscillator1.stop(startTime + duration);
    oscillator2.stop(startTime + duration);
  };

  const playFireSiren = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 3;
    const startTime = audioContext.currentTime;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.4, startTime);
    
    // Fire truck: slow rising and falling tone
    oscillator.frequency.setValueAtTime(400, startTime);
    oscillator.frequency.linearRampToValueAtTime(800, startTime + 1);
    oscillator.frequency.linearRampToValueAtTime(400, startTime + 2);
    oscillator.frequency.linearRampToValueAtTime(800, startTime + 3);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const playAirRaidSiren = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 5;
    const startTime = audioContext.currentTime;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    
    // Air raid: very slow, ominous rise and fall
    oscillator.frequency.setValueAtTime(200, startTime);
    oscillator.frequency.linearRampToValueAtTime(800, startTime + 2.5);
    oscillator.frequency.linearRampToValueAtTime(200, startTime + 5);
    
    gainNode.gain.setValueAtTime(0.5, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 5);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const playCarAlarm = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 2.4;
    const startTime = audioContext.currentTime;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    
    // Car alarm: rapid beeping pattern
    for (let i = 0; i < 6; i++) {
      const time = startTime + i * 0.4;
      gainNode.gain.setValueAtTime(0.4, time);
      gainNode.gain.setValueAtTime(0, time + 0.15);
      oscillator.frequency.setValueAtTime(1000, time);
    }
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const playBuzzer = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.5;
    const startTime = audioContext.currentTime;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, startTime);
    
    gainNode.gain.setValueAtTime(0.4, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const playSiren = (type: SirenType) => {
    switch (type) {
      case 'police':
        playPoliceSiren();
        break;
      case 'ambulance':
        playAmbulanceSiren();
        break;
      case 'fire':
        playFireSiren();
        break;
      case 'air_raid':
        playAirRaidSiren();
        break;
      case 'car_alarm':
        playCarAlarm();
        break;
      case 'buzzer':
        playBuzzer();
        break;
    }
  };

  const startContinuousAlarm = (type: 'loss' | 'gain', sirenType?: SirenType) => {
    // Para qualquer alarme anterior
    stopAlarm();

    const playSound = () => {
      if (type === 'gain') {
        playCoinsSound();
      } else {
        playSiren(sirenType || 'police');
      }
    };

    // Toca imediatamente
    playSound();

    // Define intervalo para repetir - 3.5 segundos para loss (após sirene), 2.5 para gain (após moedas)
    const interval = type === 'loss' ? 3500 : 2500;
    const intervalId = window.setInterval(playSound, interval);

    setActiveAlarm({ type, intervalId });
  };

  const stopAlarm = () => {
    if (activeAlarm?.intervalId) {
      clearInterval(activeAlarm.intervalId);
      setActiveAlarm(null);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const showPushNotification = (title: string, body: string, type: 'gain' | 'loss') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const options: any = {
        body,
        icon: '/nottify-logo.png',
        badge: '/nottify-logo.png',
        tag: type,
        requireInteraction: type === 'loss',
      };

      if (navigator.vibrate) {
        options.vibrate = type === 'loss' ? [200, 100, 200, 100, 200] : [100, 50, 100];
      }

      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Buscar o tipo de sirene do usuário
  useEffect(() => {
    if (!userId) return;

    const fetchSirenType = async () => {
      const { data } = await supabase
        .from('risk_settings')
        .select('siren_type')
        .eq('user_id', userId)
        .single();
      
      if (data?.siren_type) {
        setUserSirenType(data.siren_type as SirenType);
      }
    };

    fetchSirenType();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    console.log('Setting up realtime alert sounds for user:', userId);

    const channel = supabase
      .channel('notification_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_history',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          const notification = payload.new as any;
          
          // Evitar tocar o som múltiplas vezes para a mesma notificação
          if (lastNotificationId.current === notification.id) {
            return;
          }
          
          lastNotificationId.current = notification.id;
          
          if (notification.type === 'gain') {
            startContinuousAlarm('gain');
            showPushNotification(
              notification.title, 
              notification.description, 
              'gain'
            );
            toast.success(notification.title, {
              description: notification.description,
              duration: 10000,
              icon: '🎉',
              action: {
                label: 'Parar Som',
                onClick: stopAlarm,
              },
            });
          } else if (notification.type === 'critical_loss') {
            startContinuousAlarm('loss', userSirenType);
            showPushNotification(
              notification.title, 
              notification.description, 
              'loss'
            );
            toast.error(notification.title, {
              description: notification.description,
              duration: 10000,
              icon: '🚨',
              action: {
                label: 'Parar Alarme',
                onClick: stopAlarm,
              },
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification alerts channel status:', status);
      });

    return () => {
      console.log('Cleaning up notification alerts channel');
      stopAlarm();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    playCoinsSound,
    playPoliceSiren,
    playAmbulanceSiren,
    playFireSiren,
    playAirRaidSiren,
    playCarAlarm,
    playBuzzer,
    playSiren,
    startContinuousAlarm,
    stopAlarm,
    activeAlarm,
  };
};
