import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Shield, Copy, Check, Sparkles } from "lucide-react";
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

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
            }
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          toast.error("Error creating profile");
          return;
        }

        const { error: settingsError } = await supabase
          .from('risk_settings')
          .insert([
            {
              user_id: data.user.id,
              risk_percent: 5,
              risk_active: true,
              initial_balance: 0,
              loss_push_notifications: true,
              gain_push_notifications: false,
              siren_type: 'siren1'
            }
          ]);

        if (settingsError) {
          console.error('Error creating settings:', settingsError);
        }

        const secret = authenticator.generateSecret();
        setTotpSecret(secret);

        const otpauthUrl = authenticator.keyuri(
          email,
          'NOTTIFY',
          secret
        );
        setQrCodeUrl(otpauthUrl);

        setLoadingMessage("");
        setStep(2);
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating account");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
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
        toast.error("Invalid code. Please try again.");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      const { error: tfaError } = await supabase
        .from('user_2fa')
        .upsert({
          user_id: userId,
          totp_secret: totpSecret,
          is_enabled: true
        });

      if (tfaError) {
        console.error('Error saving 2FA settings:', tfaError);
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
    
    if (!includeLowercase && !includeUppercase && !includeNumbers && !includeSpecial) {
      toast.error("Selecione pelo menos um tipo de caractere");
      return;
    }
    
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
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="totp-code" className="text-center block">
                        Digite o código de 6 dígitos do Google Authenticator
                      </Label>
                      <div className="flex justify-center">
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
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
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
