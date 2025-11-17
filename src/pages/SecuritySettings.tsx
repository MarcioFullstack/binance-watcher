import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield, Key, AlertTriangle, Copy, Check, RefreshCw, ShieldOff } from "lucide-react";
import { authenticator } from "otplib";
import { QRCodeSVG } from "qrcode.react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

interface BackupCode {
  id: string;
  code: string;
  is_used: boolean;
  used_at: string | null;
}

const SecuritySettings = () => {
  const [loading, setLoading] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [userId, setUserId] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showEnableForm, setShowEnableForm] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [copiedCode, setCopiedCode] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");
    await check2FAStatus(user.id);
    await loadBackupCodes(user.id);
  };

  const check2FAStatus = async (uid: string) => {
    const { data, error } = await supabase
      .from("user_2fa")
      .select("*")
      .eq("user_id", uid)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking 2FA:", error);
      return;
    }

    if (data) {
      setHas2FA(true);
      setTwoFAEnabled(data.is_enabled);
    }
  };

  const loadBackupCodes = async (uid: string) => {
    const { data, error } = await supabase
      .from("backup_codes")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading backup codes:", error);
      return;
    }

    setBackupCodes(data || []);
  };

  const handleEnable2FA = () => {
    const secret = authenticator.generateSecret();
    setTotpSecret(secret);
    const otpauth = authenticator.keyuri(email, "NOTTIFY Security", secret);
    setQrCodeUrl(otpauth);
    setShowEnableForm(true);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      const isValid = authenticator.verify({
        token: verificationCode,
        secret: totpSecret
      });

      if (!isValid) {
        toast.error("Invalid code. Try again.");
        setLoading(false);
        return;
      }

      if (has2FA) {
        // Update existing 2FA
        const { error } = await supabase
          .from("user_2fa")
          .update({
            totp_secret: totpSecret,
            is_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new 2FA
        const { error } = await supabase
          .from("user_2fa")
          .insert({
            user_id: userId,
            totp_secret: totpSecret,
            is_enabled: true
          });

        if (error) throw error;
      }

      toast.success("2FA ativado com sucesso!");
      setHas2FA(true);
      setTwoFAEnabled(true);
      setShowEnableForm(false);
      setVerificationCode("");
    } catch (error: any) {
      toast.error(error.message || "Error enabling 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("user_2fa")
        .update({ is_enabled: false })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("2FA desativado com sucesso!");
      setTwoFAEnabled(false);
      setShowDisableDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Error disabling 2FA");
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);

    try {
      // Delete old unused codes
      await supabase
        .from("backup_codes")
        .delete()
        .eq("user_id", userId)
        .eq("is_used", false);

      // Generate 10 new backup codes
      const codes = Array.from({ length: 10 }, () => {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        return {
          user_id: userId,
          code: code,
          is_used: false
        };
      });

      const { error } = await supabase
        .from("backup_codes")
        .insert(codes);

      if (error) throw error;

      toast.success("10 new backup codes generated!");
      await loadBackupCodes(userId);
    } catch (error: any) {
      toast.error(error.message || "Error generating backup codes");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied!");
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const unusedCodes = backupCodes.filter(c => !c.is_used);
  const usedCodes = backupCodes.filter(c => c.is_used);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        onLogout={async () => {
          await supabase.auth.signOut();
          navigate("/login");
        }}
        userId={userId}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Security Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage two-factor authentication and backup codes
            </p>
          </div>

          {/* 2FA Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                    <CardDescription>
                      Protect your account with an extra layer of security
                    </CardDescription>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  twoFAEnabled 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {twoFAEnabled ? "Active" : "Inactive"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showEnableForm ? (
                <>
                  {twoFAEnabled ? (
                    <div className="space-y-4">
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Your account is protected with two-factor authentication.
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowDisableDialog(true)}
                        >
                          <ShieldOff className="w-4 h-4 mr-2" />
                          Disable 2FA
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleEnable2FA}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reconfigure 2FA
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Your account is not protected with 2FA. We recommend enabling it for better security.
                        </AlertDescription>
                      </Alert>
                      <Button onClick={handleEnable2FA}>
                        <Shield className="w-4 h-4 mr-2" />
                        Enable 2FA
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleVerifyAndEnable} className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={qrCodeUrl} size={200} />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <Label className="text-sm font-medium">Chave manual:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={totpSecret}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyCode(totpSecret)}
                        >
                          {copiedCode === totpSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Código de Verificação</Label>
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                      disabled={loading}
                    >
                      <InputOTPGroup className="gap-2 justify-center w-full">
                        <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={loading || verificationCode.length !== 6}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        "Verify and Enable"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEnableForm(false);
                        setVerificationCode("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Backup Codes Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Códigos de Backup</CardTitle>
                    <CardDescription>
                      Use estes códigos se perder acesso ao Google Authenticator
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={generateBackupCodes}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate New
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {unusedCodes.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Você não possui códigos de backup. Gere alguns para ter uma forma alternativa de acessar sua conta.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Guarde estes códigos em um local seguro. Cada código pode ser usado apenas uma vez.
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h4 className="font-medium mb-2">Códigos Disponíveis ({unusedCodes.length})</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {unusedCodes.map((backup) => (
                        <div
                          key={backup.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <code className="font-mono font-semibold">{backup.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(backup.code)}
                          >
                            {copiedCode === backup.code ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {usedCodes.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-muted-foreground">Códigos Usados ({usedCodes.length})</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {usedCodes.map((backup) => (
                          <div
                            key={backup.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 opacity-60"
                          >
                            <code className="font-mono line-through">{backup.code}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Disable 2FA Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Autenticação de Dois Fatores?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso tornará sua conta menos segura. Você terá que configurar novamente o 2FA se quiser reativá-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desativando...
                </>
              ) : (
                "Desativar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SecuritySettings;
