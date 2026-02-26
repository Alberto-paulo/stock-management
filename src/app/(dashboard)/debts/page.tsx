"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, CreditCard, DollarSign, AlertTriangle } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

interface Debt {
  id: string;
  clientName: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  description: string | null;
  createdAt: string;
  payments: Payment[];
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [debtForm, setDebtForm] = useState({ clientName: "", totalAmount: "", description: "" });
  const [payForm, setPayForm] = useState({ amount: "", notes: "" });

  const fetchDebts = useCallback(async () => {
    try {
      const res = await fetch("/api/debts");
      if (res.ok) setDebts(await res.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: debtForm.clientName,
          totalAmount: parseFloat(debtForm.totalAmount),
          description: debtForm.description || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Dívida registrada!", type: "success" });
        setDebtDialogOpen(false);
        setDebtForm({ clientName: "", totalAmount: "", description: "" });
        fetchDebts();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao registrar dívida", type: "error" });
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: selectedDebt.id,
          amount: parseFloat(payForm.amount),
          notes: payForm.notes || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Pagamento registrado!", type: "success" });
        setPayDialogOpen(false);
        setPayForm({ amount: "", notes: "" });
        setSelectedDebt(null);
        fetchDebts();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao registrar pagamento", type: "error" });
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Dívidas</h1>
          <p className="text-slate-500">Controle de dívidas e pagamentos</p>
        </div>
        <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Dívida
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Dívida</DialogTitle>
              <DialogDescription>Insira os dados da nova dívida</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input value={debtForm.clientName} onChange={(e) => setDebtForm({ ...debtForm, clientName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <Input type="number" step="0.01" value={debtForm.totalAmount} onChange={(e) => setDebtForm({ ...debtForm, totalAmount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={debtForm.description} onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })} placeholder="Descrição opcional..." />
              </div>
              <Button type="submit" className="w-full">Registrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total em Dívidas</CardTitle>
            <CreditCard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDebt)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Restante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">{debt.clientName}</TableCell>
                  <TableCell>{formatCurrency(debt.totalAmount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(debt.paidAmount)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(debt.remaining)}</TableCell>
                  <TableCell>
                    {debt.remaining === 0 ? (
                      <Badge variant="success">Pago</Badge>
                    ) : (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{formatDateTime(debt.createdAt)}</TableCell>
                  <TableCell>
                    {debt.remaining > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDebt(debt);
                          setPayForm({ amount: "", notes: "" });
                          setPayDialogOpen(true);
                        }}
                      >
                        <DollarSign className="mr-1 h-3 w-3" />
                        Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {debts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    Nenhuma dívida registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              {selectedDebt && `${selectedDebt.clientName} - Saldo: ${formatCurrency(selectedDebt.remaining)}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Valor do Pagamento</Label>
              <Input
                type="number"
                step="0.01"
                max={selectedDebt?.remaining}
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">Registrar Pagamento</Button>
          </form>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
