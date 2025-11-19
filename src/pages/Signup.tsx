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

  const handleGoogleSignup = async () => {
    setLoading(true);
    setLoadingMessage("Redirecting to Google...");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/payment`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast.error(error.message || "Error signing up with Google");
      setLoading(false);
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
        setQrCodeUrl(totpData.qrCodeUrl);
        setStep(2);
        toast.success("Account created! Please configure your 2FA");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Error creating account");
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
      const { data, error } = await supabase.functions.invoke("verify-totp", {
        body: {
          userId,
          code: totpCode,
        },
      });

      if (error) throw error;

      if (data.valid) {
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
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingMessage || "Verify and Continue"}
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
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
