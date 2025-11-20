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
  const [challengeToken, setChallengeToken] = useState("");
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
      // Phase 1: Email/password verification using secure-2fa-login
      const { data, error } = await supabase.functions.invoke('secure-2fa-login', {
        body: { email, password }
      });

      if (error) throw error;

      if (data.requires2FA) {
        // User has 2FA enabled - store challenge token and show 2FA screen
        setChallengeToken(data.challengeToken);
        setStep(2);
        toast.info("Enter your authentication code");
      } else {
        // No 2FA required – complete login directly with returned session
        if (!data.session) {
          throw new Error(data.error || "Login failed");
        }

        await supabase.auth.setSession(data.session);
        toast.success("Login successful!");

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          let redirectUrl = '/payment';

          if (subscription) {
            const expiresAt = new Date(subscription.expires_at);
            const now = new Date();

            if (expiresAt >= now) {
              const { data: accounts } = await supabase
                .from('binance_accounts')
                .select('id, is_active')
                .eq('user_id', user.id)
                .eq('is_active', true);

              redirectUrl = (accounts && accounts.length > 0)
                ? '/dashboard'
                : '/setup-binance';
            }
          }

          navigate(redirectUrl);
        }
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
      // Determine which code to use (TOTP or backup code)
      const codeToVerify = totpCode.length === 6 ? totpCode : backupCode;

      if (!codeToVerify) {
        toast.error("Please enter a code");
        setLoading(false);
        return;
      }

      console.log('Verifying 2FA with challenge token:', challengeToken);

      // Phase 2: Verify 2FA code using secure-2fa-login
      const { data, error } = await supabase.functions.invoke('secure-2fa-login', {
        body: { 
          challengeToken,
          totpCode: codeToVerify,
          password // Need to pass password to create session
        }
      });

      console.log('2FA verification response:', { data, error });

      if (error) throw error;

      if (!data.session) {
        throw new Error(data.error || "Invalid code. Try again.");
      }

      // Set the session in Supabase client
      await supabase.auth.setSession(data.session);

      toast.success("Login successful!");

      // Check subscription and Binance configuration before redirecting
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // First check if has active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        let redirectUrl = '/payment'; // Default to payment if no subscription

        if (subscription) {
          const expiresAt = new Date(subscription.expires_at);
          const now = new Date();
          
          // If subscription is valid, check Binance configuration
          if (expiresAt >= now) {
            const { data: accounts } = await supabase
              .from('binance_accounts')
              .select('id, is_active')
              .eq('user_id', user.id)
              .eq('is_active', true);

            redirectUrl = (accounts && accounts.length > 0) 
              ? '/dashboard' 
              : '/setup-binance';
          }
        }

        navigate(redirectUrl);
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      toast.error(error.message || "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }

    if (!validateResetEmail(resetEmail)) {
      toast.error("Please enter a valid email");
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
      toast.error(error.message || "Error sending recovery email");
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
              <CardDescription>Enter the authentication code</CardDescription>
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
                    Enter your email to receive a password recovery link.
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
