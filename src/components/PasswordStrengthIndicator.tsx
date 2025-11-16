import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const calculateStrength = (pwd: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 10;
    if (/[a-z]/.test(pwd)) strength += 20;
    if (/[A-Z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 10;

    if (strength < 40) return { strength, label: "Fraca", color: "text-destructive" };
    if (strength < 70) return { strength, label: "Média", color: "text-yellow-500" };
    return { strength, label: "Forte", color: "text-green-500" };
  };

  const getCriteria = (pwd: string): PasswordCriteria[] => [
    { label: "Mínimo de 8 caracteres", met: pwd.length >= 8 },
    { label: "Pelo menos uma letra maiúscula", met: /[A-Z]/.test(pwd) },
    { label: "Pelo menos uma letra minúscula", met: /[a-z]/.test(pwd) },
    { label: "Pelo menos um número", met: /[0-9]/.test(pwd) },
    { label: "Pelo menos um caractere especial", met: /[^a-zA-Z0-9]/.test(pwd) },
  ];

  if (!password) return null;

  const { strength, label, color } = calculateStrength(password);
  const criteria = getCriteria(password);

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Força da senha:</span>
          <span className={`font-medium ${color}`}>{label}</span>
        </div>
        <Progress value={strength} className="h-2" />
      </div>
      
      <div className="space-y-1">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {criterion.met ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={criterion.met ? "text-foreground" : "text-muted-foreground"}>
              {criterion.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
