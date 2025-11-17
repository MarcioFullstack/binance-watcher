import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

export const AlertsConfig = () => {
  const [loading, setLoading] = useState(false);
  const [lossPercent, setLossPercent] = useState("3");
  const [gainPercent, setGainPercent] = useState("5");
  const [lossEnabled, setLossEnabled] = useState(true);
  const [gainEnabled, setGainEnabled] = useState(true);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [pendingLossEnabled, setPendingLossEnabled] = useState(true);

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
        setLossEnabled(data.risk_active || true);
        setPendingLossEnabled(data.risk_active || true);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleLossEnabledChange = (checked: boolean) => {
    if (!checked && lossEnabled) {
      // Tentar desabilitar alerta crítico - mostrar confirmação
      setPendingLossEnabled(false);
      setShowDisableDialog(true);
    } else {
      // Habilitar alerta - não precisa confirmação
      setLossEnabled(checked);
      setPendingLossEnabled(checked);
    }
  };

  const confirmDisableLossAlert = () => {
    setLossEnabled(false);
    setShowDisableDialog(false);
    toast.warning("Alerta de perda desabilitado. Seu capital não está mais protegido!");
  };

  const cancelDisableLossAlert = () => {
    setPendingLossEnabled(true);
    setShowDisableDialog(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-alert-config', {
        body: {
          risk_percent: lossPercent,
          risk_active: lossEnabled,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`p-6 border-2 bg-card transition-all duration-300 ${loading ? 'border-primary/50 opacity-80' : 'border-primary'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-primary">Configurar Alertas</h3>
          <p className="text-xs text-muted-foreground">Defina limites de perda e ganho</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Salvando...</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card className={`p-4 border-destructive bg-destructive/10 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Checkbox 
              id="loss-alert" 
              checked={lossEnabled}
              onCheckedChange={handleLossEnabledChange}
              disabled={loading}
            />
            <Label htmlFor="loss-alert" className="text-destructive font-semibold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Alerta de Perda (Crítico)
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
            disabled={!lossEnabled || loading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Será alertado quando sua perda atingir este percentual
          </p>
        </Card>

        <Card className={`p-4 border-success bg-success/10 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Checkbox 
              id="gain-alert"
              checked={gainEnabled}
              onCheckedChange={(checked) => setGainEnabled(checked as boolean)}
              disabled={loading}
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
            disabled={!gainEnabled || loading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            🎯 Será alertado quando seu ganho atingir este percentual
          </p>
        </Card>

        <Button 
          onClick={handleSave} 
          className="w-full bg-primary hover:bg-primary/90 relative overflow-hidden"
          disabled={loading}
        >
          {loading && (
            <div className="absolute inset-0 bg-primary/20 animate-pulse" />
          )}
          <span className="relative z-10 flex items-center justify-center">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando configurações...
              </>
            ) : (
              <>💾 Salvar Configurações de Alertas</>
            )}
          </span>
        </Button>
      </div>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Desabilitar Alerta de Perda?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">
                ⚠️ ATENÇÃO: Você está prestes a desabilitar um alerta crítico de proteção!
              </p>
              <p>
                Ao desabilitar o alerta de perda, você não receberá notificações quando suas perdas atingirem o limite configurado. Isso pode resultar em:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Perda de capital significativa sem aviso prévio</li>
                <li>Dificuldade em controlar o risco das operações</li>
                <li>Possibilidade de liquidação de posições</li>
              </ul>
              <p className="font-semibold text-destructive">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDisableLossAlert}>
              Cancelar (Recomendado)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisableLossAlert}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Desabilitar Alerta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
