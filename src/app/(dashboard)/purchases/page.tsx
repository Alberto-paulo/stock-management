"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  buyPrice: number;
}

interface PurchaseItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: { name: string };
  total: number;
}

interface Purchase {
  id: string;
  total: number;
  notes: string | null;
  createdAt: string;
  user: { name: string };
  items: PurchaseItem[];
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [items, setItems] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const query = dateFilter ? `?date=${dateFilter}` : "";
      const [purchasesRes, productsRes] = await Promise.all([
        fetch(`/api/purchases${query}`),
        fetch("/api/products"),
      ]);
      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = () => {
    setItems([...items, { productId: "", quantity: "1", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unitPrice = product.buyPrice.toString();
      }
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: parseInt(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Compra registrada!", type: "success" });
        setDialogOpen(false);
        setItems([]);
        setNotes("");
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao registrar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao registrar compra", type: "error" });
    }
  };

  const totalToday = purchases.reduce((sum, p) => sum + p.total, 0);

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
          <h1 className="text-3xl font-bold">Compras Diárias</h1>
          <p className="text-slate-500">Registre as compras da empresa</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setItems([{ productId: "", quantity: "1", unitPrice: "" }]); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Compra</DialogTitle>
              <DialogDescription>Adicione os itens da compra</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Produto</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={item.productId}
                        onChange={(e) => updateItem(index, "productId", e.target.value)}
                        required
                      >
                        <option value="">Selecione...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} required />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs">Preço Unit.</Label>
                      <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} required />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" />
                Adicionar Item
              </Button>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas opcionais..." />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  Total: {formatCurrency(items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0))}
                </span>
                <Button type="submit">Registrar Compra</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total do Período</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalToday)}</div>
            <p className="text-xs text-slate-500">{purchases.length} compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtrar por Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>{formatDateTime(purchase.createdAt)}</TableCell>
                  <TableCell>{purchase.user.name}</TableCell>
                  <TableCell>
                    {purchase.items.map((item) => (
                      <div key={item.productId} className="text-xs">
                        {item.product?.name} x{item.quantity}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(purchase.total)}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-slate-500">{purchase.notes || "-"}</TableCell>
                </TableRow>
              ))}
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    Nenhuma compra encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
