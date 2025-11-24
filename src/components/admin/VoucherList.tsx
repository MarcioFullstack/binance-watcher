import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Copy, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Voucher {
  id: string;
  code: string;
  days: number;
  is_used: boolean;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
  used_at: string | null;
  used_by: string | null;
}

export const VoucherList = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching vouchers:", error);
        toast.error("Erro ao carregar vouchers");
        return;
      }

      setVouchers(data || []);
      console.log(`✅ Carregados ${data?.length || 0} vouchers do banco`);
    } catch (error) {
      console.error("Unexpected error fetching vouchers:", error);
      toast.error("Erro ao carregar vouchers");
    } finally {
      setLoading(false);
    }
  };

  const filteredVouchers = vouchers.filter((v) =>
    v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const invalidateVoucher = async (voucherId: string, code: string) => {
    if (!confirm(`Tem certeza que deseja invalidar o voucher "${code}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("invalidate-voucher", {
        body: { voucherId },
      });

      if (error) {
        console.error("Error invalidating voucher:", error);
        toast.error("Erro ao invalidar voucher");
        return;
      }

      toast.success("Voucher invalidado com sucesso");
      fetchVouchers();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Erro ao invalidar voucher");
    }
  };

  const getStatusBadge = (voucher: Voucher) => {
    if (voucher.is_used) {
      return <Badge variant="destructive">Usado</Badge>;
    }

    if (voucher.max_uses && voucher.max_uses > 1) {
      const remaining = voucher.max_uses - voucher.current_uses;
      if (remaining === 0) {
        return <Badge variant="destructive">Esgotado</Badge>;
      }
      return (
        <Badge variant="secondary">
          {remaining}/{voucher.max_uses} usos
        </Badge>
      );
    }

    return <Badge variant="secondary">Disponível</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Vouchers</CardTitle>
        <CardDescription>
          Total: {vouchers.length} vouchers criados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchVouchers} variant="outline" size="icon">
              <Loader2 className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum voucher encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] w-full rounded-md border">
              <div className="p-4 space-y-2">
                {filteredVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold text-sm">
                          {voucher.code}
                        </p>
                        {getStatusBadge(voucher)}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>📅 {voucher.days} dias</span>
                        <span>
                          🕐 Criado em{" "}
                          {format(new Date(voucher.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      {voucher.used_at && (
                        <p className="text-xs text-muted-foreground">
                          Usado em{" "}
                          {format(new Date(voucher.used_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(voucher.code)}
                      >
                        {copiedCode === voucher.code ? "✓" : <Copy className="h-4 w-4" />}
                      </Button>
                      {!voucher.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => invalidateVoucher(voucher.id, voucher.code)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
