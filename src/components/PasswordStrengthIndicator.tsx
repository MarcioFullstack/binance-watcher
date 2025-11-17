import { Progress } from "@/components/ui/progress";
import { Check, X, ShieldCheck } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const calculateStrength = (pwd: string): { strength: number; label: string; color: string; bgColor: string } => {
    let strength = 0;
    
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 10;
    if (/[a-z]/.test(pwd)) strength += 20;
    if (/[A-Z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 10;

    if (strength < 40) return { strength, label: "Weak", color: "text-destructive", bgColor: "bg-destructive" };
    if (strength < 70) return { strength, label: "Medium", color: "text-yellow-500", bgColor: "bg-yellow-500" };
    return { strength, label: "Strong", color: "text-green-500", bgColor: "bg-green-500" };
  };

  const getCriteria = (pwd: string): PasswordCriteria[] => [
    { label: "Minimum 8 characters", met: pwd.length >= 8 },
    { label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(pwd) },
    { label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(pwd) },
    { label: "At least one number (0-9)", met: /[0-9]/.test(pwd) },
    { label: "At least one special character (!@#$%)", met: /[^a-zA-Z0-9]/.test(pwd) },
  ];

  const { strength, label, color, bgColor } = calculateStrength(password);
  const criteria = getCriteria(password);
  const metCriteria = criteria.filter(c => c.met).length;
  
  // Se a senha estiver vazia, mostra estado inicial
  const isEmpty = !password || password.length === 0;

  return (
    <div className="space-y-3 mt-2 p-3 rounded-lg border bg-card animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${isEmpty ? 'text-muted-foreground' : color}`} />
            <span className="text-sm font-medium">Password strength:</span>
          </div>
          <span className={`font-semibold text-sm ${isEmpty ? 'text-muted-foreground' : color}`}>
            {isEmpty ? 'Enter a password' : label}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted animate-scale-in">
          <div 
            className={`h-full ${isEmpty ? 'bg-muted-foreground/20' : bgColor} transition-all duration-500 ease-out`}
            style={{ width: isEmpty ? '0%' : `${strength}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {metCriteria} of {criteria.length} requirements met
        </p>
      </div>
      
      <div className="space-y-1.5 pt-2 border-t animate-fade-in" style={{ animationDelay: '100ms' }}>
        <p className="text-xs font-medium text-muted-foreground mb-2">Requirements:</p>
        {criteria.map((criterion, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
              criterion.met ? 'opacity-100 translate-x-0' : 'opacity-60 translate-x-[-2px]'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`flex items-center justify-center w-4 h-4 rounded-full ${
              criterion.met ? 'bg-green-500/10' : 'bg-muted'
            }`}>
              {criterion.met ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <X className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            <span className={`${criterion.met ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
              {criterion.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
