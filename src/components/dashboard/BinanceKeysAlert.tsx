import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const BinanceKeysAlert = () => {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro nas Chaves da Binance</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          As chaves da API da Binance não puderam ser descriptografadas. Isso geralmente acontece após uma atualização de segurança ou mudança na chave de criptografia.
        </p>
        <p className="mb-4">
          <strong>Solução:</strong> Você precisa reconfigurar sua conta Binance com novas chaves de API para continuar usando o dashboard.
        </p>
        <Button 
          onClick={() => navigate("/setup-binance")}
          variant="outline"
          size="sm"
        >
          Reconfigurar Conta Binance
        </Button>
      </AlertDescription>
    </Alert>
  );
};
