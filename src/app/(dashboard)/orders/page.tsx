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
import { Plus, Trash2, ClipboardList, ImageIcon, Upload, X, Eye, AlertTriangle } from "lucide-react";

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

function extractImageUrl(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[imagem: (https?:\/\/[^\]]+)\]/);
  return match ? match[1] : null;
}

function extractCustomItem(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[Item extra: ([^\]]+)\]/);
  return match ? match[1] : null;
}

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
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [items, setItems] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "GERENTE";
  const isAdmin = role === "ADMIN";

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

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Apenas ficheiros de imagem são permitidos", type: "error" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: "Imagem muito grande. Máximo 10MB", type: "error" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append(
        "items",
        JSON.stringify(
          items.map((i) => ({
            productId: i.productId,
            quantity: parseInt(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          }))
        )
      );
      if (notes) formData.append("notes", notes);
      if (customItemName) formData.append("customItemName", customItemName);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setToast({ message: "Encomenda criada com sucesso!", type: "success" });
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

  const handleDelete = async () => {
    if (!deleteOrderId) return;
    try {
      const res = await fetch(`/api/orders?id=${deleteOrderId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToast({ message: "Encomenda apagada com sucesso!", type: "success" });
        setDeleteOrderId(null);
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao apagar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao apagar encomenda", type: "error" });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Encomendas</h1>
          <p className="text-slate-500">Gerir encomendas e acompanhar status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setItems([{ productId: "", quantity: "1", unitPrice: "" }]);
                setCustomItemName("");
                setImageFile(null);
                setImagePreview(null);
                setNotes("");
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Encomenda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Encomenda</DialogTitle>
              <DialogDescription>Adicione os itens da encomenda</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Itens do stock */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Produtos do Stock</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-end gap-2 rounded-lg bg-slate-50 p-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-slate-500">Produto</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                      <div className="w-20 space-y-1">
                        <Label className="text-xs text-slate-500">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs text-slate-500">Preço Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          required
                          className="h-9"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="mb-0.5 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar Item do Stock
                </Button>
              </div>

              {/* Item personalizado */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <Label className="text-sm font-semibold text-amber-800">
                  Item personalizado do cliente
                </Label>
                <Input
                  placeholder="Ex: Camisola azul tamanho M, Cadeira específica..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="border-amber-200 bg-white"
                />
                <p className="text-xs text-amber-600">
                  Descreve o item que o cliente deseja e que não está no stock
                </p>
              </div>

              {/* Upload de fotografia */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                  Fotografia do item
                </Label>
                {!imagePreview ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer
                      ${isDragging
                        ? "border-blue-400 bg-blue-50 scale-[1.01]"
                        : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                      }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                        <Upload className="h-6 w-6 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Arrasta uma imagem ou clica para selecionar
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG, WEBP até 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
                      <p className="text-xs text-white truncate">{imageFile?.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas opcionais sobre a encomenda..."
                  className="resize-none"
                  rows={3}
                />
              </div>

              {/* Total + Submit */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Total estimado</p>
                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(
                      items.reduce(
                        (sum, i) =>
                          sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Criar Encomenda
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats + Filtro */}
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
                <TableHead>Detalhes</TableHead>
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
                    <TableCell className="text-sm">{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell className="text-sm">{order.user.name}</TableCell>
                    <TableCell>
                      {order.items.map((item, i) => (
                        <div key={i} className="text-xs text-slate-600">
                          {item.product?.name} x{item.quantity}
                        </div>
                      ))}
                      {cleanedNotes && (
                        <div className="text-xs text-slate-400 mt-1 italic">{cleanedNotes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {customItem ? (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                          {customItem}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <button
                          onClick={() => setImageViewUrl(imageUrl)}
                          className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Ver foto
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[order.status] || "secondary"}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setDetailOrder(order)}
                        className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Ver
                      </button>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                          >
                            <option value="PENDENTE">Pendente</option>
                            <option value="EM_ANDAMENTO">Em Andamento</option>
                            <option value="COMPLETA">Completa</option>
                            <option value="CONCLUIDA">Concluída</option>
                            <option value="CANCELADA">Cancelada</option>
                          </select>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteOrderId(order.id)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Apagar encomenda"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 9 : 8}
                    className="py-12 text-center text-slate-400"
                  >
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    Nenhuma encomenda encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal — Detalhes da Encomenda */}
      {detailOrder && (
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Encomenda</DialogTitle>
              <DialogDescription>
                Criada por {detailOrder.user.name} em {formatDateTime(detailOrder.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Status</span>
                <Badge variant={statusVariants[detailOrder.status] || "secondary"}>
                  {statusLabels[detailOrder.status] || detailOrder.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Itens do Stock</p>
                <div className="rounded-lg border border-slate-100 divide-y divide-slate-100">
                  {detailOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{item.product?.name}</p>
                        <p className="text-xs text-slate-400">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {extractCustomItem(detailOrder.notes) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Item Personalizado</p>
                  <p className="text-sm text-amber-900">{extractCustomItem(detailOrder.notes)}</p>
                </div>
              )}
              {extractImageUrl(detailOrder.notes) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Fotografia do Item</p>
                  <div
                    className="relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group"
                    onClick={() => setImageViewUrl(extractImageUrl(detailOrder.notes))}
                  >
                    <img
                      src={extractImageUrl(detailOrder.notes)!}
                      alt="Item da encomenda"
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <div className="rounded-full bg-white/90 p-2">
                        <Eye className="h-5 w-5 text-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {cleanNotes(detailOrder.notes) && (
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
                  <p className="text-sm text-slate-700">{cleanNotes(detailOrder.notes)}</p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3">
                <span className="text-sm font-medium text-slate-300">Total</span>
                <span className="text-lg font-bold text-white">{formatCurrency(detailOrder.total)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setDetailOrder(null)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal — Ver Fotografia */}
      {imageViewUrl && (
        <Dialog open={!!imageViewUrl} onOpenChange={() => setImageViewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fotografia do Item</DialogTitle>
              <DialogDescription>Imagem enviada com a encomenda</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center rounded-lg overflow-hidden bg-slate-100">
              <img
                src={imageViewUrl}
                alt="Item da encomenda"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={imageViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <Eye className="h-3 w-3" />
                Abrir em nova aba
              </a>
              <Button variant="outline" onClick={() => setImageViewUrl(null)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal — Confirmar apagar (só Admin) */}
      {deleteOrderId && (
        <Dialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Apagar Encomenda
              </DialogTitle>
              <DialogDescription>
                Esta ação é irreversível. Tens a certeza que queres apagar esta encomenda?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteOrderId(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Sim, apagar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
