import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Rocket, Key } from "lucide-react";

export const BinanceSetupPrompt = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Binance Account</CardTitle>
          <CardDescription className="text-base">
            To start using the dashboard and view your trading data, you need to configure your Binance API keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Key className="h-4 w-4" />
              What you'll need:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground ml-6">
              <li className="list-disc">Binance Futures API Key</li>
              <li className="list-disc">Binance Futures API Secret</li>
              <li className="list-disc">Read-only permissions are sufficient</li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Security Note:</strong> Your API keys are encrypted using AES-256-GCM encryption before being stored. 
              We recommend using read-only API keys with no withdrawal permissions.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate("/setup-binance")}
              size="lg"
              className="w-full"
            >
              Configure Binance Account
            </Button>
            
            <Button 
              onClick={() => window.open('https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072', '_blank')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              How to create API keys on Binance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
