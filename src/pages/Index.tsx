import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import nottifyLogo from "@/assets/nottify-logo.png";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="flex items-center justify-center gap-4 mb-8">
          <img src={nottifyLogo} alt="NOTTIFY" className="w-20 h-20" />
          <h1 className="text-5xl font-bold text-foreground">NOTTIFY</h1>
        </div>
        
        <p className="text-xl text-muted-foreground mb-8">
          Monitor de PnL para Binance Futures
        </p>
        
        <p className="text-muted-foreground mb-8">
          Monitore seus lucros e perdas em tempo real, configure alertas inteligentes 
          e proteja sua banca com kill-switch automático.
        </p>

        <div className="flex gap-4 justify-center">
          <Button 
            size="lg"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
          <Button 
            size="lg"
            variant="outline"
            onClick={() => navigate("/signup")}
          >
            Criar Conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
