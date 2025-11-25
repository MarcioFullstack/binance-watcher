import { useState, useEffect } from "react";
import { X, Download, Clock, Smartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "nottify-install-prompt-dismissed";
const REMIND_LATER_KEY = "nottify-install-remind-later";
const REMIND_LATER_DAYS = 3; // Reduzido para 3 dias

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    if (standalone) {
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if permanently dismissed
    const permanentlyDismissed = localStorage.getItem(STORAGE_KEY);
    if (permanentlyDismissed === "true") {
      return;
    }

    // Check if remind later is active
    const remindLaterDate = localStorage.getItem(REMIND_LATER_KEY);
    if (remindLaterDate) {
      const reminderDate = new Date(remindLaterDate);
      if (new Date() < reminderDate) {
        return;
      }
    }

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Show prompt for mobile users after short delay
    if (isMobile) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "true");
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleRemindLater = () => {
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + REMIND_LATER_DAYS);
    localStorage.setItem(REMIND_LATER_KEY, remindDate.toISOString());
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Não mais dismiss permanente, apenas remind later
    handleRemindLater();
  };

  const handleViewInstructions = () => {
    setShowPrompt(false);
    navigate("/install");
  };

  // Não mostrar se já instalado ou não for mobile
  if (!showPrompt || isStandalone || !isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-background/95 backdrop-blur-md shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">📱 Instale o App NOTTIFY</h3>
                  <p className="text-sm text-muted-foreground">Funciona em segundo plano!</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 mb-4 border border-primary/20">
              <p className="text-sm font-medium text-foreground mb-2">
                ⚡ Benefícios do App Instalado:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Funciona em segundo plano mesmo com celular bloqueado</li>
                <li>✓ Alertas instantâneos de PnL diretamente na tela</li>
                <li>✓ Acesso rápido sem abrir navegador</li>
                <li>✓ Funciona offline e carrega mais rápido</li>
              </ul>
            </div>

            {isIOS ? (
              <div className="space-y-2">
                <Button
                  onClick={handleViewInstructions}
                  className="w-full"
                  size="sm"
                >
                  <Share className="mr-2 h-4 w-4" />
                  Como Instalar no iPhone
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Toque em <Share className="inline h-3 w-3" /> e depois "Adicionar à Tela Inicial"
                </p>
                <Button
                  onClick={handleRemindLater}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Lembrar em {REMIND_LATER_DAYS} dias
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {deferredPrompt ? (
                  <Button
                    onClick={handleInstall}
                    className="w-full"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Instalar Agora (1 Toque)
                  </Button>
                ) : (
                  <Button
                    onClick={handleViewInstructions}
                    className="w-full"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Ver Como Instalar
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleRemindLater}
                    variant="outline"
                    size="sm"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Depois
                  </Button>
                  <Button
                    onClick={handleViewInstructions}
                    variant="outline"
                    size="sm"
                  >
                    Instruções
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
