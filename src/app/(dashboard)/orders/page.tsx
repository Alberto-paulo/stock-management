"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { Plus, Trash2, ClipboardList, ImageIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sellPrice: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product?: { name: string };
}

interface Order {
  id: string;
  status: string;
  total: number;
  notes: string | null;
  createdAt: string;
  user: { name: string };
  items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em Andamento",
  COMPLETA: "Completa",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const statusVariants: Record<string, "warning" | "info" | "secondary" | "success" | "destructive"> = {
  PENDENTE: "warning",
  EM_ANDAMENTO: "info",
  COMPLETA: "secondary",
  CONCLUIDA: "success",
  CANCELADA: "destructive",
};

// Extrai URL de imagem das notas
function extractImageUrl(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[imagem: (https?:\/\/[^\]]+)\]/);
  return match ? match[1] : null;
}

// Extrai item extra das notas
function extractCustomItem(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[Item extra: ([^\]]+)\]/);
  return match ? match[1] : null;
}

// Limpa as notas removendo os tags internos
function cleanNotes(notes: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/\[imagem: https?:\/\/[^\]]+\]/g, "")
    .replace(/\[Item extra: [^\]]+\]/g, "")
    .trim();
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageViewUrl, setImageViewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [items, setItems] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "GERENTE";

  const fetchData = useCallback(async () => {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`/api/orders${query}`),
        fetch("/api/products"),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
        newItems[index].unitPrice = product.sellPrice.toString();
      }
    }
    setItems(newItems);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(
        items.map((i) => ({
          productId: i.productId,
          quantity: parseInt(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
        }))
      ));
      if (notes) formData.append("notes", notes);
      if (customItemName) formData.append("customItemName", customItemName);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setToast({ message: "Encomenda criada!", type: "success" });
        setDialogOpen(false);
        setItems([]);
        setNotes("");
        setCustomItemName("");
        setImageFile(null);
        setImagePreview(null);
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao criar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao criar encomenda", type: "error" });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setToast({ message: "Status atualizado!", type: "success" });
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao atualizar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao atualizar status", type: "error" });
    }
  };

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
          <h1 className="text-3xl font-bold">Encomendas</h1>
          <p className="text-slate-500">Gerir encomendas e acompanhar status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setItems([{ productId: "", quantity: "1", unitPrice: "" }]);
              setCustomItemName("");
              setImageFile(null);
              setImagePreview(null);
              setNotes("");
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Encomenda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Encomenda</DialogTitle>
              <DialogDescription>Adicione os itens da encomenda</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Itens do stock */}
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
                Adicionar Item do Stock
              </Button>

              {/* Item personalizado */}
              <div className="rounded-md border border-dashed border-slate-300 p-3 space-y-2">
                <Label className="text-sm font-medium">Item personalizado do cliente</Label>
                <Input
                  placeholder="Ex: Camisola azul tamanho M, Cadeira específica..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                />
                <p className="text-xs text-slate-500">Descreve o item que o cliente deseja e não está no stock</p>
              </div>

              {/* Upload de fotografia */}
              <div className="rounded-md border border-dashed border-slate-300 p-3 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Fotografia do item
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-auto rounded-md object-cover border border-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas opcionais..." />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  Total: {formatCurrency(items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0))}
                </span>
                <Button type="submit">Criar Encomenda</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Encomendas</CardTitle>
            <ClipboardList className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtrar por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="COMPLETA">Completa</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
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
                <TableHead>Criador</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Item Extra</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const imageUrl = extractImageUrl(order.notes);
                const customItem = extractCustomItem(order.notes);
                const cleanedNotes = cleanNotes(order.notes);
                return (
                  <TableRow key={order.id}>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>{order.user.name}</TableCell>
                    <TableCell>
                      {order.items.map((item, i) => (
                        <div key={i} className="text-xs">
                          {item.product?.name} x{item.quantity}
                        </div>
                      ))}
                      {cleanedNotes && (
                        <div className="text-xs text-slate-500 mt-1">{cleanedNotes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {customItem ? (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1">
                          {customItem}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <button
                          onClick={() => setImageViewUrl(imageUrl)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Ver foto
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[order.status] || "secondary"}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <select
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="EM_ANDAMENTO">Em Andamento</option>
                          <option value="COMPLETA">Completa</option>
                          <option value="CONCLUIDA">Concluída</option>
                          <option value="CANCELADA">Cancelada</option>
                        </select>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} className="text-center text-slate-500">
                    Nenhuma encomenda encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal para ver fotografia */}
      {imageViewUrl && (
        <Dialog open={!!imageViewUrl} onOpenChange={() => setImageViewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fotografia do Item</DialogTitle>
              <DialogDescription>Imagem enviada pelo cliente</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={imageViewUrl}
                alt="Item da encomenda"
                className="max-h-[70vh] w-auto rounded-md object-contain"
              />
            </div>
            <div className="flex justify-end gap-2">
              
                href={imageViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Abrir em nova aba
              </a>
              <Button variant="outline" onClick={() => setImageViewUrl(null)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
