import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Volume2 } from "lucide-react";

export const LossAlarmSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [riskActive, setRiskActive] = useState(true);
  const [riskPercent, setRiskPercent] = useState(5);
  const [initialBalance, setInitialBalance] = useState(0);
  const [sirenType, setSirenType] = useState("police");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("risk_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading settings:", error);
        return;
      }

      if (data) {
        setRiskActive(data.risk_active ?? true);
        setRiskPercent(data.risk_percent ?? 5);
        setInitialBalance(data.initial_balance ?? 0);
        setSirenType(data.siren_type ?? "police");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const settings = {
        user_id: user.id,
        risk_active: riskActive,
        risk_percent: riskPercent,
        initial_balance: initialBalance,
        siren_type: sirenType,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("risk_settings")
        .upsert(settings, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Alarm settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const testAlarm = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 3;
    const startTime = audioContext.currentTime;
    
    if (sirenType === "police") {
      // Som de sirene de polícia
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
      
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      oscillator1.start(startTime);
      oscillator2.start(startTime);
      oscillator1.stop(startTime + duration);
      oscillator2.stop(startTime + duration);
    } else if (sirenType === "ambulance") {
      // Som de ambulância
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
    } else if (sirenType === "fire") {
      // Som de bombeiro (alternância rápida)
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
    } else if (sirenType === "air-raid") {
      // Som de ataque aéreo
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
    } else if (sirenType === "alarm-clock") {
      // Som de despertador
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
    
    toast.info(`Testando alarme: ${sirenType}`);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alarme de Perda
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure um alarme sonoro para ser ativado quando sua perda atingir uma porcentagem específica.
        </p>
      </div>

      <div className="space-y-4">
        {/* Ativar/Desativar Alarme */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-card-highlight">
          <div className="space-y-0.5">
            <Label htmlFor="risk-active" className="text-base font-medium">
              Alarme de Risco Ativo
            </Label>
            <p className="text-xs text-muted-foreground">
              Ativar monitoramento de perda
            </p>
          </div>
          <Switch
            id="risk-active"
            checked={riskActive}
            onCheckedChange={setRiskActive}
          />
        </div>

        {/* Saldo Inicial */}
        <div className="space-y-2">
          <Label htmlFor="initial-balance">Saldo Inicial (USD)</Label>
          <Input
            id="initial-balance"
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            placeholder="Ex: 1000"
            min="0"
            step="0.01"
            disabled={!riskActive}
          />
          <p className="text-xs text-muted-foreground">
            Defina seu saldo inicial para calcular a porcentagem de perda
          </p>
        </div>

        {/* Porcentagem de Perda */}
        <div className="space-y-2">
          <Label htmlFor="risk-percent">
            Porcentagem de Perda para Alarme (%)
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="risk-percent"
              type="range"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              min="0"
              max="100"
              step="1"
              disabled={!riskActive}
              className="flex-1"
            />
            <div className="text-2xl font-bold text-destructive min-w-[4rem] text-right">
              {riskPercent}%
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O alarme será acionado quando você perder {riskPercent}% do saldo inicial
            {initialBalance > 0 && (
              <span className="font-semibold text-destructive">
                {" "}(${(initialBalance * riskPercent / 100).toFixed(2)} USD)
              </span>
            )}
          </p>
        </div>

        {/* Alarm Sound Type */}
        <div className="space-y-2">
          <Label>Sound Alarm Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "police", label: "🚨 Police" },
              { value: "air-raid", label: "⚠️ Air Raid" },
              { value: "alarm-clock", label: "⏰ Alarm Clock" },
              { value: "ambulance", label: "🚑 Ambulance" },
              { value: "fire", label: "🔥 Fire" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSirenType(option.value)}
                disabled={!riskActive}
                className={`p-3 rounded-lg border-2 transition-all ${
                  sirenType === option.value
                    ? "border-primary bg-primary/10 text-primary font-semibold glow-primary"
                    : "border-border hover:border-primary/50"
                } ${!riskActive ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Test Alarm Button */}
        <Button
          variant="outline"
          onClick={testAlarm}
          disabled={!riskActive}
          className="w-full"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          Testar Alarme
        </Button>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || !riskActive}
          className="w-full"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </Card>
  );
};
