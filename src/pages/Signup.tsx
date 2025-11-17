import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, Shield, Copy, Check, Sparkles } from "lucide-react";
import nottifyLogo from "@/assets/nottify-logo.png";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { z } from "zod";
import { authenticator } from "otplib";
import { QRCodeSVG } from "qrcode.react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

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

    // Validate email
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
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.user) {
        setUserId(data.user.id);
        
        setLoadingMessage("Setting up your profile...");
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{ id: data.user.id, email }]);

        if (profileError) console.error("Error creating profile:", profileError);

        setLoadingMessage("Setting up risk alerts...");
        const { error: riskError } = await supabase
          .from("risk_settings")
          .insert([{ user_id: data.user.id }]);

        if (riskError) console.error("Error creating risk settings:", riskError);

        setLoadingMessage("Activating subscription...");
        const { error: subError } = await supabase
          .from("subscriptions")
          .insert([{ user_id: data.user.id, status: "inactive" }]);

        if (subError) console.error("Error creating subscription:", subError);

        // Generate TOTP secret
        const secret = authenticator.generateSecret();
        setTotpSecret(secret);
        
        const otpauth = authenticator.keyuri(email, "NOTTIFY", secret);
        setQrCodeUrl(otpauth);

        toast.success("Account created! Now set up two-factor authentication.");
        setStep(2);
      }
    } catch (error: any) {
      if (error.message?.includes("already registered") || error.code === "user_already_exists") {
        toast.error("This email is already registered. Login to continue.", {
          action: {
            label: "Login",
            onClick: () => navigate("/login")
          }
        });
      } else {
        toast.error(error.message || "Error creating account");
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totpCode.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }

    setLoading(true);
    setLoadingMessage("Verifying code...");

    try {
      const isValid = authenticator.verify({
        token: totpCode,
        secret: totpSecret
      });

      if (!isValid) {
        toast.error("Invalid code. Try again.");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      // Save 2FA secret to database
      const { error: twoFAError } = await supabase
        .from("user_2fa")
        .insert([{
          user_id: userId,
          totp_secret: totpSecret,
          is_enabled: true
        }]);

      if (twoFAError) {
        console.error("Error saving 2FA:", twoFAError);
        toast.error("Error saving 2FA settings");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      toast.success("Two-factor authentication configured successfully!");
      setLoadingMessage("Redirecting to dashboard...");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Error verifying code");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        if (error.message?.includes("already registered")) {
          toast.info("Redirecting to Google login...");
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Error signing up with Google");
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    toast.success("Chave copiada para a área de transferência");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateStrongPassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charPool = '';
    let password = '';
    
    // Verificar se pelo menos um tipo está selecionado
    if (!includeLowercase && !includeUppercase && !includeNumbers && !includeSpecial) {
      toast.error("Selecione pelo menos um tipo de caractere");
      return;
    }
    
    // Garantir pelo menos um de cada tipo selecionado
    if (includeLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      charPool += lowercase;
    }
    if (includeUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      charPool += uppercase;
    }
    if (includeNumbers) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
      charPool += numbers;
    }
    if (includeSpecial) {
      password += special[Math.floor(Math.random() * special.length)];
      charPool += special;
    }
    
    // Preencher o resto aleatoriamente
    for (let i = password.length; i < passwordLength; i++) {
      password += charPool[Math.floor(Math.random() * charPool.length)];
    }
    
    // Embaralhar a senha
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setPassword(password);
    setConfirmPassword(password);
    setShowPassword(true);
    setShowPasswordGenerator(false);
    
    // Copiar automaticamente para área de transferência
    navigator.clipboard.writeText(password);
    toast.success("Senha forte gerada e copiada! Guarde em um local seguro.", {
      duration: 5000,
    });
  };

  if (step === 2) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="w-full border-border">
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
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG value={qrCodeUrl} size={200} />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <Label className="text-sm font-medium">Ou digite a chave manualmente:</Label>
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
                          onClick={copySecret}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totp" className="text-sm font-medium">
                      Instruções:
                    </Label>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Abra o Google Authenticator no seu celular</li>
                      <li>Escaneie o QR Code ou digite a chave manualmente</li>
                      <li>Digite o código de 6 dígitos gerado</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totp">Código de Verificação</Label>
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
                </div>

                <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingMessage || "Verificando..."}
                    </>
                  ) : (
                    "Verificar e Ativar 2FA"
                  )}
                </Button>
              </form>
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
                      Gerar senha forte
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Gerar senha forte</DialogTitle>
                      <DialogDescription>
                        Customize as opções para gerar uma senha segura
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Comprimento: {passwordLength} caracteres</Label>
                          </div>
                          <Slider
                            value={[passwordLength]}
                            onValueChange={(value) => setPasswordLength(value[0])}
                            min={8}
                            max={32}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Tipos de caracteres:</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="lowercase"
                                checked={includeLowercase}
                                onCheckedChange={(checked) => setIncludeLowercase(checked as boolean)}
                              />
                              <label
                                htmlFor="lowercase"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Letras minúsculas (a-z)
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="uppercase"
                                checked={includeUppercase}
                                onCheckedChange={(checked) => setIncludeUppercase(checked as boolean)}
                              />
                              <label
                                htmlFor="uppercase"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Letras maiúsculas (A-Z)
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="numbers"
                                checked={includeNumbers}
                                onCheckedChange={(checked) => setIncludeNumbers(checked as boolean)}
                              />
                              <label
                                htmlFor="numbers"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Números (0-9)
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="special"
                                checked={includeSpecial}
                                onCheckedChange={(checked) => setIncludeSpecial(checked as boolean)}
                              />
                              <label
                                htmlFor="special"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Caracteres especiais (!@#$%...)
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={generateStrongPassword}
                        className="w-full gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Gerar senha
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
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
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingMessage || "Criando conta..."}
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>
            
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
              onClick={handleGoogleSignup}
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
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Entre aqui
              </Link>
            </p>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
