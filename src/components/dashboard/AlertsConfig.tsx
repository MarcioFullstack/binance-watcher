import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const AlertsConfig = () => {
  const [loading, setLoading] = useState(false);
  const [lossPercent, setLossPercent] = useState("3");
  const [gainPercent, setGainPercent] = useState("5");
  const [lossEnabled, setLossEnabled] = useState(true);
  const [gainEnabled, setGainEnabled] = useState(true);

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
        .single();

      if (error) throw error;

      if (data) {
        setLossPercent(data.risk_percent.toString());
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("risk_settings")
        .update({
          risk_percent: parseFloat(lossPercent),
          risk_active: lossEnabled,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-2 border-primary bg-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-lg font-bold text-primary">Configurar Alertas</h3>
          <p className="text-xs text-muted-foreground">Defina limites de perda e ganho</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 mb-3">
            <Checkbox 
              id="loss-alert" 
              checked={lossEnabled}
              onCheckedChange={(checked) => setLossEnabled(checked as boolean)}
            />
            <Label htmlFor="loss-alert" className="text-destructive font-semibold">
              Alerta de Perda
            </Label>
          </div>
          <Label htmlFor="loss-percent" className="text-sm text-muted-foreground">
            Percentual de perda máximo aceito (%)
          </Label>
          <Input
            id="loss-percent"
            type="number"
            value={lossPercent}
            onChange={(e) => setLossPercent(e.target.value)}
            className="mt-2 bg-background border-destructive"
            disabled={!lossEnabled}
          />
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Será alertado quando sua perda atingir este percentual
          </p>
        </Card>

        <Card className="p-4 border-success bg-success/10">
          <div className="flex items-center gap-2 mb-3">
            <Checkbox 
              id="gain-alert"
              checked={gainEnabled}
              onCheckedChange={(checked) => setGainEnabled(checked as boolean)}
            />
            <Label htmlFor="gain-alert" className="text-success font-semibold">
              Alerta de Ganho
            </Label>
          </div>
          <Label htmlFor="gain-percent" className="text-sm text-muted-foreground">
            Percentual de ganho desejado (%)
          </Label>
          <Input
            id="gain-percent"
            type="number"
            value={gainPercent}
            onChange={(e) => setGainPercent(e.target.value)}
            className="mt-2 bg-background border-success"
            disabled={!gainEnabled}
          />
          <p className="text-xs text-muted-foreground mt-2">
            🎯 Será alertado quando seu ganho atingir este percentual
          </p>
        </Card>

        <Button 
          onClick={handleSave} 
          className="w-full bg-primary hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>💾 Salvar Configurações de Alertas</>
          )}
        </Button>
      </div>
    </Card>
  );
};
