import { useState, useEffect } from "react";
import { X, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "nottify-install-prompt-dismissed";
const REMIND_LATER_KEY = "nottify-install-remind-later";
const REMIND_LATER_DAYS = 7;

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

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

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 seconds delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
    localStorage.setItem(STORAGE_KEY, "true");
    setShowPrompt(false);
  };

  const handleViewInstructions = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowPrompt(false);
    navigate("/install");
  };

  if (!showPrompt || !deferredPrompt) {
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
        <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Instalar NOTTIFY</h3>
                  <p className="text-sm text-muted-foreground">Acesso rápido e notificações</p>
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

            <p className="text-sm text-muted-foreground mb-4">
              Instale o app para receber alertas em tempo real sobre seus limites de PnL e acessar instantaneamente seu dashboard.
            </p>

            <div className="space-y-2">
              <Button
                onClick={handleInstall}
                className="w-full"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Instalar Agora
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleRemindLater}
                  variant="outline"
                  size="sm"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Lembrar Depois
                </Button>
                <Button
                  onClick={handleViewInstructions}
                  variant="outline"
                  size="sm"
                >
                  Ver Instruções
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
