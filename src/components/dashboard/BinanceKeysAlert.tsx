import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const BinanceKeysAlert = () => {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Binance Keys Invalid</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Your Binance API keys could not be decrypted. This usually happens after a security update or encryption key change.
        </p>
        <p className="mb-4">
          Please reconfigure your Binance account to continue using the dashboard features.
        </p>
        <Button 
          onClick={() => navigate("/setup-binance")}
          variant="outline"
          size="sm"
        >
          Reconfigure Binance Account
        </Button>
      </AlertDescription>
    </Alert>
  );
};
