import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Shield, Copy, Check, Sparkles, RefreshCw, Smartphone, Download, QrCode } from "lucide-react";
import nottifyLogo from "@/assets/nottify-logo.png";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { encrypt } from "@/utils/encryption";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

const emailSchema = z.string().email("Invalid email");

const Signup = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordLength, setPasswordLength] = useState(16);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value) {
      validateEmail(value);
    } else {
      setEmailError("");
    }
  };


  const handleInitialSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    setLoadingMessage("Creating your account...");

    try {
      const redirectUrl = `${window.location.origin}/payment`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      if (data.user) {
        setUserId(data.user.id);
        setLoadingMessage("Generating your 2FA secret...");

        const { data: totpData, error: totpError } = await supabase.functions.invoke(
          "generate-totp-secret",
          {
            body: { userId: data.user.id, email },
          }
        );

        if (totpError) throw totpError;

        const encryptedSecret = await encrypt(totpData.secret);

        await supabase.from("user_2fa").insert({
          user_id: data.user.id,
          totp_secret: encryptedSecret,
          is_enabled: false,
        });

        setTotpSecret(totpData.secret);
        // Generate proper TOTP URI for QR code
        const issuer = "ChartGuard Pro";
        const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${totpData.secret}&issuer=${encodeURIComponent(issuer)}`;
        setQrCodeUrl(totpUri);
        setStep(2);
        toast.success("Account created! Please configure your 2FA");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Check if user already exists
      if (error.message?.includes("User already registered") || error.message?.includes("already registered")) {
        try {
          setLoadingMessage("Verificando autenticação de dois fatores...");
          
          // Try to sign in to get user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            toast.error("Email já cadastrado. Por favor, faça login.");
            setLoading(false);
            return;
          }

          if (signInData.user) {
            // Check if user has 2FA configured
            const { data: twoFAData, error: twoFAError } = await supabase
              .from("user_2fa")
              .select("is_enabled, totp_secret")
              .eq("user_id", signInData.user.id)
              .maybeSingle();

            if (twoFAError) {
              console.error("Error checking 2FA:", twoFAError);
            }

            // If user doesn't have 2FA configured, set it up
            if (!twoFAData || !twoFAData.is_enabled) {
              setUserId(signInData.user.id);
              setLoadingMessage("Configurando autenticação de dois fatores...");

              // Generate new TOTP secret
              const { data: totpData, error: totpError } = await supabase.functions.invoke(
                "generate-totp-secret",
                {
                  body: { userId: signInData.user.id, email },
                }
              );

              if (totpError) throw totpError;

              const encryptedSecret = await encrypt(totpData.secret);

              // Update or insert 2FA record
              if (twoFAData) {
                await supabase
                  .from("user_2fa")
                  .update({
                    totp_secret: encryptedSecret,
                    is_enabled: false,
                  })
                  .eq("user_id", signInData.user.id);
              } else {
                await supabase.from("user_2fa").insert({
                  user_id: signInData.user.id,
                  totp_secret: encryptedSecret,
                  is_enabled: false,
                });
              }

              setTotpSecret(totpData.secret);
              const issuer = "ChartGuard Pro";
              const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${totpData.secret}&issuer=${encodeURIComponent(issuer)}`;
              setQrCodeUrl(totpUri);
              setStep(2);
              toast.success("Configure o Google Authenticator para continuar");
              return;
            } else {
              // User already has 2FA configured
              await supabase.auth.signOut();
              toast.error("Email já cadastrado com 2FA configurado. Por favor, faça login.");
            }
          }
        } catch (verifyError: any) {
          console.error("Error verifying user:", verifyError);
          toast.error("Email já cadastrado. Por favor, faça login.");
        }
      } else {
        toast.error(error.message || "Error creating account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totpCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setLoadingMessage("Verifying your 2FA code...");

    try {
      // Buscar o secret do usuário
      const { data: user2FAData, error: user2FAError } = await supabase
        .from("user_2fa")
        .select("totp_secret")
        .eq("user_id", userId)
        .single();

      if (user2FAError || !user2FAData) {
        throw new Error("2FA configuration not found");
      }

      // Descriptografar o secret
      const { decrypt } = await import("@/utils/encryption");
      const decryptedSecret = await decrypt(user2FAData.totp_secret);

      // Verificar o código TOTP
      const { data, error } = await supabase.functions.invoke("verify-totp", {
        body: {
          token: totpCode,
          secret: decryptedSecret,
          identifier: email,
        },
      });

      if (error) throw error;

      if (data.isValid) {
        await supabase.from("user_2fa").update({ is_enabled: true }).eq("user_id", userId);

        toast.success("2FA configured successfully!");
        navigate("/payment");
      } else {
        toast.error("Invalid code. Please try again.");
      }
    } catch (error: any) {
      console.error("2FA verification error:", error);
      toast.error(error.message || "Error verifying code");
    } finally {
      setLoading(false);
      setTotpCode("");
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    toast.success("Secret copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate2FA = async () => {
    if (!userId) {
      toast.error("Erro ao regenerar código");
      return;
    }

    setLoading(true);
    setLoadingMessage("Gerando novo código 2FA...");

    try {
      // Generate new TOTP secret
      const { data: totpData, error: totpError } = await supabase.functions.invoke(
        "generate-totp-secret",
        {
          body: { userId, email },
        }
      );

      if (totpError) throw totpError;

      const encryptedSecret = await encrypt(totpData.secret);

      // Update the existing 2FA record with new secret
      const { error: updateError } = await supabase
        .from("user_2fa")
        .update({
          totp_secret: encryptedSecret,
          is_enabled: false,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Update state with new secret and QR code
      setTotpSecret(totpData.secret);
      const issuer = "ChartGuard Pro";
      const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${totpData.secret}&issuer=${encodeURIComponent(issuer)}`;
      setQrCodeUrl(totpUri);
      setTotpCode(""); // Clear any entered code

      toast.success("Novo código 2FA gerado! Escaneie o novo QR code.");
    } catch (error: any) {
      console.error("Error regenerating 2FA:", error);
      toast.error(error.message || "Erro ao regenerar código 2FA");
    } finally {
      setLoading(false);
    }
  };

  const generateStrongPassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charPool = '';
    let password = '';
    
    if (includeLowercase) {
      charPool += lowercase;
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (includeUppercase) {
      charPool += uppercase;
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (includeNumbers) {
      charPool += numbers;
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (includeSpecial) {
      charPool += special;
      password += special[Math.floor(Math.random() * special.length)];
    }
    
    if (!charPool) {
      toast.error("Select at least one character type");
      return;
    }
    
    for (let i = password.length; i < passwordLength; i++) {
      password += charPool[Math.floor(Math.random() * charPool.length)];
    }
    
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setPassword(password);
    setConfirmPassword(password);
    setShowPassword(true);
    setShowPasswordGenerator(false);
    
    navigator.clipboard.writeText(password);
    toast.success("Senha forte gerada e copiada! Guarde em um local seguro.", {
      duration: 5000,
    });
  };

  if (step === 2) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-4xl space-y-6">
          <OnboardingProgress currentStep={1} />
          <div className="space-y-4 text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Configuração Obrigatória</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A autenticação de dois fatores é obrigatória para sua segurança. Complete a configuração para continuar.
            </p>
          </div>
          <div className="flex justify-center">
            <Card className="w-full max-w-md border-border">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-12 h-12 text-primary" />
                <CardTitle className="text-2xl">Autenticação de Dois Fatores</CardTitle>
              </div>
              <CardDescription>
                Configure o Google Authenticator para proteger sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2FA} className="space-y-6">
                {/* Instructions Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="instructions">
                    <AccordionTrigger className="text-sm font-medium">
                      📱 Como configurar o Google Authenticator?
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <div className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            1
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-1">Baixe o aplicativo</p>
                            <p>Instale o Google Authenticator na sua loja de aplicativos:</p>
                            <div className="flex gap-2 mt-2">
                              <a 
                                href="https://apps.apple.com/app/google-authenticator/id388497605" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                              >
                                📱 iOS
                              </a>
                              <a 
                                href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                              >
                                🤖 Android
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            2
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-1">Abra o aplicativo</p>
                            <p>No Google Authenticator, toque no botão <strong>+</strong> para adicionar uma nova conta.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            3
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-1">Escaneie o QR Code</p>
                            <p>Escolha <strong>"Escanear código QR"</strong> e aponte a câmera para o código abaixo, ou insira a chave manualmente.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            4
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-1">Digite o código</p>
                            <p>O aplicativo mostrará um código de 6 dígitos. Digite-o no campo abaixo para concluir a configuração.</p>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            💡 <strong>Dica:</strong> O código muda a cada 30 segundos. Guarde seu telefone em um local seguro, pois você precisará dele para fazer login.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={qrCodeUrl} size={200} />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <p className="text-sm text-muted-foreground text-center">
                        Escaneie o QR code com o Google Authenticator ou insira a chave manualmente:
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="flex-1 text-sm font-mono break-all">{totpSecret}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={copySecret}
                          className="shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex justify-center pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerate2FA}
                          disabled={loading}
                          className="gap-2"
                        >
                          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                          Gerar Novo Código
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="totp-code" className="text-center block">
                        Digite o código de 6 dígitos do Google Authenticator
                      </Label>
                      <div className="flex justify-center">
                        <div className={`transition-all duration-200 ${loading ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                          <InputOTP
                            maxLength={6}
                            value={totpCode}
                            onChange={setTotpCode}
                            disabled={loading}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                      {loading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Verificando código de autenticação...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full relative overflow-hidden" 
                  disabled={loading || totpCode.length !== 6}
                >
                  {loading && (
                    <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                  )}
                  <span className="relative flex items-center justify-center">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Verificando..." : "Verificar e Continuar"}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-4xl space-y-6">
        <OnboardingProgress currentStep={1} />
        <div className="flex justify-center">
          <Card className="w-full max-w-md border-border">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
              <CardTitle className="text-2xl">NOTTIFY</CardTitle>
            </div>
            <CardDescription>Crie sua conta para começar a monitorar</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleInitialSignup} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Dialog open={showPasswordGenerator} onOpenChange={setShowPasswordGenerator}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      className="h-auto py-1 px-2 text-xs gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Gerar Senha Forte
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Gerador de Senha Forte</DialogTitle>
                      <DialogDescription>
                        Personalize sua senha forte com as opções abaixo
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tamanho: {passwordLength} caracteres</Label>
                        <Slider
                          value={[passwordLength]}
                          onValueChange={(value) => setPasswordLength(value[0])}
                          min={8}
                          max={32}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="lowercase"
                            checked={includeLowercase}
                            onCheckedChange={(checked) => setIncludeLowercase(checked as boolean)}
                          />
                          <Label htmlFor="lowercase">Letras minúsculas (a-z)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="uppercase"
                            checked={includeUppercase}
                            onCheckedChange={(checked) => setIncludeUppercase(checked as boolean)}
                          />
                          <Label htmlFor="uppercase">Letras maiúsculas (A-Z)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="numbers"
                            checked={includeNumbers}
                            onCheckedChange={(checked) => setIncludeNumbers(checked as boolean)}
                          />
                          <Label htmlFor="numbers">Números (0-9)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="special"
                            checked={includeSpecial}
                            onCheckedChange={(checked) => setIncludeSpecial(checked as boolean)}
                          />
                          <Label htmlFor="special">Caracteres especiais (!@#$%...)</Label>
                        </div>
                      </div>
                      <Button onClick={generateStrongPassword} className="w-full">
                        Gerar Senha
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
    </div>
  );
};

export default Signup;
