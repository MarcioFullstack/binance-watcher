import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import nottifyLogo from "@/assets/nottify-logo.png";
import { useTranslation } from "react-i18next";
import { authenticator } from "otplib";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email");

const Login = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: email/senha, 2: 2FA
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailError, setResetEmailError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const navigate = useNavigate();

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setEmailError("");
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
      return false;
    }
  };

  const validateResetEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setResetEmailError("");
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setResetEmailError(error.errors[0].message);
      }
      return false;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value) {
      validateEmail(value);
    } else {
      setEmailError("");
    }
  };

  const handleResetEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setResetEmail(value);
    if (value) {
      validateResetEmail(value);
    } else {
      setResetEmailError("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!validateEmail(email)) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (!data.user) throw new Error("User not found");

      // Check if user has 2FA enabled
      const { data: twoFAData, error: twoFAError } = await supabase
        .from("user_2fa")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (twoFAError && twoFAError.code !== "PGRST116") {
        console.error("Error checking 2FA:", twoFAError);
      }

      if (twoFAData && twoFAData.is_enabled) {
        // User has 2FA enabled - logout and show 2FA verification
        setUserId(data.user.id);
        setTotpSecret(twoFAData.totp_secret);
        await supabase.auth.signOut();
        setStep(2);
        toast.info("Digite o código de autenticação");
      } else {
        // No 2FA - proceed to dashboard
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Error logging in");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let isValid = false;

      // Try TOTP code first
      if (totpCode.length === 6) {
        isValid = authenticator.verify({
          token: totpCode,
          secret: totpSecret
        });
      }

      // If TOTP is invalid and backup code is provided, try backup code
      if (!isValid && backupCode) {
        const { data: backupData, error: backupError } = await supabase
          .from("backup_codes")
          .select("*")
          .eq("user_id", userId)
          .eq("code", backupCode.toUpperCase())
          .eq("is_used", false)
          .maybeSingle();

        if (backupError && backupError.code !== "PGRST116") {
          console.error("Error checking backup code:", backupError);
        }

        if (backupData) {
          isValid = true;
          
          // Mark backup code as used
          await supabase
            .from("backup_codes")
            .update({ 
              is_used: true,
              used_at: new Date().toISOString()
            })
            .eq("id", backupData.id);
        }
      }

      if (!isValid) {
        toast.error("Código inválido. Tente novamente.");
        setLoading(false);
        return;
      }

      // Login again after successful 2FA verification
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Google");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Por favor, informe seu email");
      return;
    }

    if (!validateResetEmail(resetEmail)) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4">
          <Button
            variant="ghost"
            onClick={() => {
              setStep(1);
              setTotpCode("");
              setBackupCode("");
            }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Card className="w-full border-border">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-12 h-12 text-primary" />
                <CardTitle className="text-2xl">Verificação 2FA</CardTitle>
              </div>
              <CardDescription>Digite o código de autenticação</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="totp" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="totp">Authenticator</TabsTrigger>
                  <TabsTrigger value="backup">Código de Backup</TabsTrigger>
                </TabsList>
                
                <TabsContent value="totp" className="space-y-4">
                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Código do Google Authenticator</Label>
                      <InputOTP
                        maxLength={6}
                        value={totpCode}
                        onChange={setTotpCode}
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

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || totpCode.length !== 6}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        "Verificar"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="backup" className="space-y-4">
                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="backup-code">Código de Backup</Label>
                      <Input
                        id="backup-code"
                        type="text"
                        placeholder="XXXXXXXX"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                        disabled={loading}
                        className="font-mono text-center text-lg"
                        maxLength={8}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use um dos códigos de backup gerados nas configurações
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || !backupCode}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        "Verificar"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para página inicial</span>
        </Link>
        <Card className="w-full border-border">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
              <CardTitle className="text-2xl">NOTTIFY</CardTitle>
            </div>
            <CardDescription>Entre com sua conta para acessar o dashboard</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={loading}
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline text-center w-full"
                >
                  Esqueceu sua senha?
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recuperar Senha</DialogTitle>
                  <DialogDescription>
                    Digite seu email para receber um link de recuperação de senha.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={handleResetEmailChange}
                      required
                      disabled={resetLoading}
                      className={resetEmailError ? "border-destructive" : ""}
                    />
                    {resetEmailError && (
                      <p className="text-sm text-destructive">{resetEmailError}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Link de Recuperação"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
