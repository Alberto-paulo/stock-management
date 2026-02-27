"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, Trash2, ShoppingCart, Package, FileText } from "lucide-react";

interface Product {
  id: string;
  name: string;
  buyPrice: number;
}

interface PurchaseItem {
  id: string;
  productId: string | null;
  description: string | null;
  itemType: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product?: { name: string } | null;
}

interface Purchase {
  id: string;
  total: number;
  notes: string | null;
  createdAt: string;
  user: { name: string };
  items: PurchaseItem[];
}

interface StockItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface FreeItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [freeItems, setFreeItems] = useState<FreeItem[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);
  const [notes, setNotes] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

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

  const resetForm = () => {
    setStockItems([]);
    setFreeItems([{ description: "", quantity: "1", unitPrice: "" }]);
    setNotes("");
  };

  // Stock items
  const addStockItem = () =>
    setStockItems([...stockItems, { productId: "", quantity: "1", unitPrice: "" }]);

  const removeStockItem = (index: number) =>
    setStockItems(stockItems.filter((_: StockItem, i: number) => i !== index));

  const updateStockItem = (index: number, field: string, value: string) => {
    const updated: StockItem[] = [...stockItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "productId") {
      const product = products.find((p: Product) => p.id === value);
      if (product) updated[index].unitPrice = product.buyPrice.toString();
    }
    setStockItems(updated);
  };

  // Free items
  const addFreeItem = () =>
    setFreeItems([...freeItems, { description: "", quantity: "1", unitPrice: "" }]);

  const removeFreeItem = (index: number) =>
    setFreeItems(freeItems.filter((_: FreeItem, i: number) => i !== index));

  const updateFreeItem = (index: number, field: string, value: string) => {
    const updated: FreeItem[] = [...freeItems];
    updated[index] = { ...updated[index], [field]: value };
    setFreeItems(updated);
  };

  // Totais
  const stockTotal = stockItems.reduce(
    (sum: number, i: StockItem) =>
      sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
    0
  );

  const freeTotal = freeItems.reduce(
    (sum: number, i: FreeItem) =>
      sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
    0
  );

  const grandTotal = stockTotal + freeTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validStockItems = stockItems.filter((i: StockItem) => i.productId);
    const validFreeItems = freeItems.filter((i: FreeItem) =>
      i.description.trim() && parseFloat(i.unitPrice) > 0
    );

    if (validStockItems.length === 0 && validFreeItems.length === 0) {
      setToast({ message: "Adicione pelo menos um item", type: "error" });
      return;
    }

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validStockItems.map((i: StockItem) => ({
            productId: i.productId,
            quantity: parseInt(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
          freeItems: validFreeItems.map((i: FreeItem) => ({
            description: i.description,
            quantity: parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Compra registada!", type: "success" });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao registar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao registar compra", type: "error" });
    }
  };

  const totalPeriod = purchases.reduce(
    (sum: number, p: Purchase) => sum + p.total,
    0
  );

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
          <h1 className="text-3xl font-bold">Compras Diarias</h1>
          <p className="text-slate-500">Registe as compras da empresa</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open: boolean) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registar Compra</DialogTitle>
              <DialogDescription>Adicione os itens comprados</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Itens livres — o que foi comprado */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <Label className="text-sm font-semibold text-slate-700">
                    O que foi comprado
                  </Label>
                </div>
                <div className="space-y-2">
                  {freeItems.map((item: FreeItem, index: number) => (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-slate-500">
                            Descricao do item
                          </Label>
                          <Input
                            placeholder="Ex: Sabao em po marca X, Sacos plasticos, Gasolina..."
                            value={item.description}
                            onChange={(e) =>
                              updateFreeItem(index, "description", e.target.value)
                            }
                          />
                        </div>
                        {freeItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFreeItem(index)}
                            className="mt-5 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">
                            Quantidade
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateFreeItem(index, "quantity", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">
                            Preco Unitario
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateFreeItem(index, "unitPrice", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {item.unitPrice && parseFloat(item.unitPrice) > 0 && (
                        <div className="flex justify-end">
                          <span className="text-xs text-slate-500">
                            Subtotal:{" "}
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(
                                (parseFloat(item.quantity) || 0) *
                                  (parseFloat(item.unitPrice) || 0)
                              )}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFreeItem}
                  className="w-full"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar outro item
                </Button>
              </div>

              {/* Produtos do stock (opcional) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  <Label className="text-sm font-semibold text-slate-700">
                    Produtos do Stock{" "}
                    <span className="text-xs font-normal text-slate-400">
                      (opcional)
                    </span>
                  </Label>
                </div>
                {stockItems.length > 0 && (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {stockItems.map((item: StockItem, index: number) => (
                      <div
                        key={index}
                        className="flex items-end gap-2 rounded-lg bg-slate-50 p-2"
                      >
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-slate-500">
                            Produto
                          </Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={item.productId}
                            onChange={(e) =>
                              updateStockItem(index, "productId", e.target.value)
                            }
                            required
                          >
                            <option value="">Selecione...</option>
                            {products.map((p: Product) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-xs text-slate-500">Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateStockItem(index, "quantity", e.target.value)
                            }
                            className="h-9"
                            required
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs text-slate-500">
                            Preco Unit.
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateStockItem(index, "unitPrice", e.target.value)
                            }
                            className="h-9"
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStockItem(index)}
                          className="mb-0.5 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStockItem}
                  className="w-full"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Associar produto do stock
                </Button>
              </div>

              {/* Observacoes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Observacoes adicionais
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outras notas sobre a compra..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Resumo dos totais */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                {freeTotal > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                    <span className="text-sm text-slate-500">
                      Itens comprados
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(freeTotal)}
                    </span>
                  </div>
                )}
                {stockTotal > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                    <span className="text-sm text-slate-500">
                      Produtos do stock
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(stockTotal)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
                  <span className="text-sm font-medium text-slate-300">
                    Total da compra
                  </span>
                  <span className="text-xl font-bold text-white">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Registar Compra</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total do Periodo
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPeriod)}
            </div>
            <p className="text-xs text-slate-500">{purchases.length} compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Filtrar por Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Responsavel</TableHead>
                <TableHead>Itens do Stock</TableHead>
                <TableHead>Itens Livres</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase: Purchase) => {
                const stockPurchaseItems = purchase.items.filter(
                  (i: PurchaseItem) => i.itemType === "STOCK"
                );
                const freePurchaseItems = purchase.items.filter(
                  (i: PurchaseItem) => i.itemType === "FREE"
                );

                return (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(purchase.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {purchase.user.name}
                    </TableCell>
                    <TableCell>
                      {stockPurchaseItems.length > 0 ? (
                        stockPurchaseItems.map((item: PurchaseItem) => (
                          <div
                            key={item.id}
                            className="text-xs text-slate-600"
                          >
                            {item.product?.name} x{item.quantity} —{" "}
                            {formatCurrency(item.total)}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {freePurchaseItems.length > 0 ? (
                        freePurchaseItems.map((item: PurchaseItem) => (
                          <div
                            key={item.id}
                            className="text-xs text-slate-600"
                          >
                            {item.description} x{item.quantity} —{" "}
                            {formatCurrency(item.total)}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(purchase.total)}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-slate-500">
                      {purchase.notes ? (
                        <pre className="whitespace-pre-wrap font-sans">
                          {purchase.notes}
                        </pre>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-slate-400"
                  >
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    Nenhuma compra encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
