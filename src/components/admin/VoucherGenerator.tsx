import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const voucherSchema = z.object({
  prefix: z.string().min(2).max(10).regex(/^[A-Z0-9-]+$/, "Only uppercase letters, numbers and hyphens"),
  days: z.number().min(1).max(365),
  quantity: z.number().min(1).max(100),
  maxUses: z.number().min(0).max(10000).optional(),
});

interface GeneratedVoucher {
  code: string;
  days: number;
  created: boolean;
}

export const VoucherGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    prefix: "PROMO",
    days: 30,
    quantity: 1,
    maxUses: 0,
  });
  const [customCode, setCustomCode] = useState("");
  const [customDays, setCustomDays] = useState(30);
  const [customMaxUses, setCustomMaxUses] = useState(0);
  const [generatedVouchers, setGeneratedVouchers] = useState<GeneratedVoucher[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateRandomCode = (prefix: string) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const randomPart = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `${prefix}-${randomPart}`;
  };

  const checkVoucherExists = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("id")
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error("Error checking voucher duplicate:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Unexpected error checking voucher duplicate:", error);
      return false;
    }
  };

  const handleBatchGenerate = async () => {
    try {
      voucherSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const newVouchers: GeneratedVoucher[] = [];
    const generatedCodes = new Set<string>();

    try {
      console.log(`🚀 Iniciando geração de ${formData.quantity} vouchers em lote`);
      
      for (let i = 0; i < formData.quantity; i++) {
        // Garante códigos únicos dentro do lote
        let code = generateRandomCode(formData.prefix);
        while (generatedCodes.has(code)) {
          code = generateRandomCode(formData.prefix);
        }
        generatedCodes.add(code);

        console.log(`📝 [${i+1}/${formData.quantity}] Gerando voucher: ${code}`);

        // Verifica duplicidade no banco antes de tentar criar
        const exists = await checkVoucherExists(code);
        if (exists) {
          console.warn(`⚠️ Código duplicado no banco: ${code}`);
          newVouchers.push({ code, days: formData.days, created: false });
          continue;
        }
        
        const body: any = { code, days: formData.days };
        if (formData.maxUses && formData.maxUses > 0) {
          body.maxUses = formData.maxUses;
        }
        
        const { data, error } = await supabase.functions.invoke('create-voucher', {
          body
        });

        if (error) {
          console.error(`❌ Falha ao criar voucher ${code}:`, error);
          newVouchers.push({ code, days: formData.days, created: false });
        } else if (data?.error) {
          console.error(`❌ Erro do servidor para ${code}:`, data.error);
          newVouchers.push({ code, days: formData.days, created: false });
        } else {
          console.log(`✅ Voucher criado com sucesso: ${code}`);
          newVouchers.push({ code, days: formData.days, created: true });
        }
      }

      const successCount = newVouchers.filter(v => v.created).length;
      setGeneratedVouchers(newVouchers);
      
      console.log(`📊 Resultado: ${successCount}/${formData.quantity} vouchers criados`);
      
      if (successCount === formData.quantity) {
        toast.success(`✅ ${successCount} vouchers criados e validados com sucesso!`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ ${successCount}/${formData.quantity} vouchers criados. ${formData.quantity - successCount} falharam.`);
      } else {
        toast.error(`❌ Nenhum voucher foi criado. Verifique os logs.`);
      }
      
      // Disparar evento para atualizar a lista
      if (successCount > 0) {
        window.dispatchEvent(new CustomEvent('voucher-created'));
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado na geração em lote:', error);
      toast.error(error.message || "Erro ao gerar vouchers");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGenerate = async () => {
    if (!customCode || customCode.length < 5 || customCode.length > 30) {
      toast.error("Código deve ter entre 5-30 caracteres");
      return;
    }

    if (!/^[A-Z0-9-]+$/.test(customCode)) {
      toast.error("Apenas letras maiúsculas, números e hífens são permitidos");
      return;
    }

    if (customDays < 1 || customDays > 365) {
      toast.error("Dias deve ser entre 1-365");
      return;
    }

    setLoading(true);
    try {
      // VALIDAÇÃO CRÍTICA: Verificar se já existe no banco ANTES de criar
      console.log('🔍 Verificando se voucher já existe:', customCode);
      const exists = await checkVoucherExists(customCode);
      if (exists) {
        console.error('❌ Voucher já existe no banco:', customCode);
        toast.error("Este código de voucher já existe. Escolha outro.");
        setLoading(false);
        return;
      }
      console.log('✅ Voucher não existe, prosseguindo com criação');

      const body: any = { code: customCode, days: customDays };
      if (customMaxUses && customMaxUses > 0) {
        body.maxUses = customMaxUses;
      }
      
      console.log('📤 Enviando requisição para criar voucher:', body);
      
      const { data, error } = await supabase.functions.invoke('create-voucher', {
        body
      });

      console.log('📥 Resposta da criação do voucher:', { data, error });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        toast.error(`Erro ao criar voucher: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('❌ Erro retornado pelo servidor:', data.error);
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        console.log('✅ Voucher criado com sucesso na edge function');
        
        // VALIDAÇÃO CRÍTICA: Aguardar e verificar se foi REALMENTE salvo no banco
        console.log('⏳ Aguardando 2 segundos para verificar no banco...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 Verificando se voucher foi salvo no banco:', customCode);
        const verify = await checkVoucherExists(customCode);
        
        if (!verify) {
          console.error('❌ ERRO CRÍTICO: Voucher não encontrado no banco após criação!');
          toast.error('❌ ERRO: Voucher NÃO foi salvo no banco de dados! Entre em contato com o suporte.');
          setGeneratedVouchers([{ code: customCode, days: customDays, created: false }]);
          return;
        }
        
        console.log('✅✅✅ Voucher confirmado e validado no banco de dados');
        toast.success(`✅ Voucher "${customCode}" criado e validado com sucesso!`);
        setGeneratedVouchers([{ code: customCode, days: customDays, created: true }]);
        setCustomCode("");
        
        // Disparar evento para atualizar a lista
        window.dispatchEvent(new CustomEvent('voucher-created'));
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado ao criar voucher:', error);
      toast.error(error.message || "Erro ao criar voucher");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const exportVouchers = () => {
    const csv = [
      "Code,Days,Status",
      ...generatedVouchers.map(v => `${v.code},${v.days},${v.created ? 'Created' : 'Failed'}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Vouchers exported to CSV");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voucher Generator</CardTitle>
        <CardDescription>
          Create single or multiple vouchers with custom settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="batch" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batch">Batch Generate</TabsTrigger>
            <TabsTrigger value="custom">Custom Code</TabsTrigger>
          </TabsList>

          <TabsContent value="batch" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix</Label>
                <Input
                  id="prefix"
                  placeholder="PROMO"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Will generate: {formData.prefix}-XXXXXXXX
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Days Valid</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (0 = single use)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="0"
                  max="10000"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.maxUses === 0 ? 'Single-use voucher' : `Can be used ${formData.maxUses} times`}
                </p>
              </div>
            </div>

            <Button
              onClick={handleBatchGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Generate {formData.quantity} Voucher{formData.quantity > 1 ? 's' : ''}
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customCode">Código Personalizado</Label>
                <Input
                  id="customCode"
                  placeholder="MEU-VOUCHER-ESPECIAL"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground">
                  5-30 caracteres: letras, números e hífens
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customDays">Days Valid</Label>
                <Input
                  id="customDays"
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customMaxUses">Max Uses (0 = single use)</Label>
                <Input
                  id="customMaxUses"
                  type="number"
                  min="0"
                  max="10000"
                  value={customMaxUses}
                  onChange={(e) => setCustomMaxUses(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {customMaxUses === 0 ? 'Single-use voucher' : `Can be used ${customMaxUses} times by different users`}
                </p>
              </div>
            </div>

            <Button
              onClick={handleCustomGenerate}
              disabled={loading || !customCode}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Voucher
            </Button>
          </TabsContent>
        </Tabs>

        {generatedVouchers.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Generated Vouchers ({generatedVouchers.length})
              </h3>
              <Button onClick={exportVouchers} variant="outline" size="sm">
                Export CSV
              </Button>
            </div>

            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-2">
                {generatedVouchers.map((voucher, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      voucher.created
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-destructive/10 border border-destructive/20'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-mono font-semibold">{voucher.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {voucher.days} days • {voucher.created ? 'Created' : 'Failed'}
                      </p>
                    </div>
                    {voucher.created && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(voucher.code, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
