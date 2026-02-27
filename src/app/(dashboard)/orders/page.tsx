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
import {
  Plus, Trash2, ClipboardList, ImageIcon,
  Upload, X, Eye, AlertTriangle, Pencil, Phone, User, FileText
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sellPrice: number;
}

interface OrderImage {
  id: string;
  url: string;
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
  clientName: string | null;
  clientPhone: string | null;
  description: string | null;
  createdAt: string;
  user: { name: string };
  items: OrderItem[];
  images: OrderImage[];
}

interface ItemRow {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em Andamento",
  COMPLETA: "Completa",
  CONCLUIDA: "Concluida",
  CANCELADA: "Cancelada",
};

const statusVariants: Record<string, "warning" | "info" | "secondary" | "success" | "destructive"> = {
  PENDENTE: "warning",
  EM_ANDAMENTO: "info",
  COMPLETA: "secondary",
  CONCLUIDA: "success",
  CANCELADA: "destructive",
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [imageViewUrl, setImageViewUrl] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form criar
  const [items, setItems] = useState<ItemRow[]>([]);
  const [customQuantity, setCustomQuantity] = useState<string>("1");
  const [customUnitPrice, setCustomUnitPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Form editar
  const [editClientName, setEditClientName] = useState<string>("");
  const [editClientPhone, setEditClientPhone] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [editRemoveImageIds, setEditRemoveImageIds] = useState<string[]>([]);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setItems([]);
    setCustomQuantity("1");
    setCustomUnitPrice("");
    setNotes("");
    setClientName("");
    setClientPhone("");
    setDescription("");
    setImageFiles([]);
    setImagePreviews([]);
  };

  const addItem = () => setItems([...items, { productId: "", quantity: "1", unitPrice: "" }]);

  const removeItem = (index: number) => {
    setItems(items.filter((_item: ItemRow, i: number) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems: ItemRow[] = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "productId") {
      const product = products.find((p: Product) => p.id === value);
      if (product) newItems[index].unitPrice = product.sellPrice.toString();
    }
    setItems(newItems);
  };

  const loadPreviews = (
    newFiles: File[],
    baseIndex: number,
    currentPreviews: string[],
    setPreviews: (p: string[]) => void
  ) => {
    const result: string[] = [...currentPreviews];
    let loadedCount = 0;
    if (newFiles.length === 0) return;
    newFiles.forEach((file: File, idx: number) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        result[baseIndex + idx] = reader.result as string;
        loadedCount += 1;
        if (loadedCount === newFiles.length) {
          setPreviews([...result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const processFiles = (
    incoming: File[],
    existing: File[],
    existingPreviews: string[],
    setFiles: (f: File[]) => void,
    setPreviews: (p: string[]) => void,
    limit: number
  ) => {
    const valid: File[] = incoming.filter(
      (f: File) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    const combined: File[] = [...existing, ...valid].slice(0, limit);
    setFiles(combined);
    const brandNew: File[] = combined.slice(existing.length);
    loadPreviews(brandNew, existing.length, existingPreviews, setPreviews);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    processFiles(files, imageFiles, imagePreviews, setImageFiles, setImagePreviews, 10);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    const existingCount: number = (editOrder?.images.length || 0) - editRemoveImageIds.length;
    const limit: number = 10 - existingCount;
    processFiles(files, editImageFiles, editImagePreviews, setEditImageFiles, setEditImagePreviews, Math.max(0, limit));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files: File[] = Array.from(e.dataTransfer.files);
    processFiles(files, imageFiles, imagePreviews, setImageFiles, setImagePreviews, 10);
  };

  const removeNewImage = (index: number) => {
    setImageFiles((f: File[]) => f.filter((_: File, i: number) => i !== index));
    setImagePreviews((p: string[]) => p.filter((_: string, i: number) => i !== index));
  };

  const removeNewEditImage = (index: number) => {
    setEditImageFiles((f: File[]) => f.filter((_: File, i: number) => i !== index));
    setEditImagePreviews((p: string[]) => p.filter((_: string, i: number) => i !== index));
  };

  const toggleRemoveExistingImage = (imageId: string) => {
    setEditRemoveImageIds((ids: string[]) =>
      ids.includes(imageId)
        ? ids.filter((id: string) => id !== imageId)
        : [...ids, imageId]
    );
  };

  // Calculo do total
  const stockTotal = items.reduce(
    (sum: number, i: ItemRow) =>
      sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
    0
  );
  const customTotal =
    (parseFloat(customQuantity) || 0) * (parseFloat(customUnitPrice) || 0);
  const grandTotal = stockTotal + customTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const allItems = [
        ...items
          .filter((i: ItemRow) => i.productId)
          .map((i: ItemRow) => ({
            productId: i.productId,
            quantity: parseInt(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
      ];

      const formData = new FormData();
      formData.append("items", JSON.stringify(allItems));
      if (notes) formData.append("notes", notes);
      if (clientName) formData.append("clientName", clientName);
      if (clientPhone) formData.append("clientPhone", clientPhone);
      if (description) formData.append("description", description);
      if (customQuantity) formData.append("customQuantity", customQuantity);
      if (customUnitPrice) formData.append("customUnitPrice", customUnitPrice);

      imageFiles.forEach((file: File) => formData.append("images", file));

      const res = await fetch("/api/orders", { method: "POST", body: formData });
      if (res.ok) {
        setToast({ message: "Encomenda criada com sucesso!", type: "success" });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao criar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao criar encomenda", type: "error" });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    try {
      const formData = new FormData();
      formData.append("id", editOrder.id);
      if (editClientName) formData.append("clientName", editClientName);
      if (editClientPhone) formData.append("clientPhone", editClientPhone);
      if (editDescription) formData.append("description", editDescription);
      if (editNotes) formData.append("notes", editNotes);
      formData.append("removeImageIds", JSON.stringify(editRemoveImageIds));
      editImageFiles.forEach((file: File) => formData.append("images", file));

      const res = await fetch("/api/orders", { method: "PUT", body: formData });
      if (res.ok) {
        setToast({ message: "Encomenda atualizada!", type: "success" });
        setEditOrder(null);
        fetchData();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro ao editar", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao editar encomenda", type: "error" });
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
      const res = await fetch(`/api/orders?id=${deleteOrderId}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ message: "Encomenda apagada!", type: "success" });
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

  const openEdit = (order: Order) => {
    setEditOrder(order);
    setEditClientName(order.clientName || "");
    setEditClientPhone(order.clientPhone || "");
    setEditDescription(order.description || "");
    setEditNotes(order.notes || "");
    setEditImageFiles([]);
    setEditImagePreviews([]);
    setEditRemoveImageIds([]);
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
        <Dialog open={dialogOpen} onOpenChange={(open: boolean) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Encomenda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Encomenda</DialogTitle>
              <DialogDescription>Preencha os dados da encomenda</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Dados do cliente */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4" /> Dados do Cliente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nome do cliente</Label>
                    <Input
                      placeholder="Ex: Joao Silva"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telemovel
                    </Label>
                    <Input
                      placeholder="Ex: +258 84 000 0000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Descricao */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <Label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Descricao da Encomenda
                </Label>
                <Textarea
                  placeholder="Descreve detalhadamente o que o cliente pretende. Ex: Camisola azul tamanho M com bordado no peito..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none bg-white border-blue-200 min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-blue-600">Inclui cor, tamanho, material, quantidade e outros detalhes</p>
              </div>

              {/* Quantidade e preco para encomendas sem stock */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Quantidade e Valor <span className="text-xs font-normal text-slate-400">(para itens sem stock)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Preco Unitario</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={customUnitPrice}
                      onChange={(e) => setCustomUnitPrice(e.target.value)}
                    />
                  </div>
                </div>
                {customUnitPrice && parseFloat(customUnitPrice) > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-xs text-slate-500">Subtotal deste item</span>
                    <span className="text-sm font-semibold">{formatCurrency(customTotal)}</span>
                  </div>
                )}
              </div>

              {/* Produtos do stock (opcional) */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">
                  Produtos do Stock <span className="text-xs font-normal text-slate-400">(opcional)</span>
                </Label>
                {items.length > 0 && (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {items.map((item: ItemRow, index: number) => (
                      <div key={index} className="flex items-end gap-2 rounded-lg bg-slate-50 p-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-slate-500">Produto</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={item.productId}
                            onChange={(e) => updateItem(index, "productId", e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {products.map((p: Product) => (
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
                            className="h-9"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs text-slate-500">Preco Unit.</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
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
                )}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="mr-1 h-3 w-3" />
                  Associar produto do stock
                </Button>
              </div>

              {/* Upload de fotografias */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                  Fotografias do item ({imagePreviews.length}/10)
                </Label>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((src: string, i: number) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square">
                        <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imagePreviews.length < 10 && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer
                      ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"}`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                        <Upload className="h-5 w-5 text-slate-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Arrastar ou clicar para adicionar fotos</p>
                      <p className="text-xs text-slate-400">PNG, JPG, WEBP ate 10MB cada</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Observacoes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Observacoes adicionais</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outras notas sobre a encomenda..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Total final + Submit */}
              <div className="rounded-xl bg-slate-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total da encomenda</p>
                  <span className="text-2xl font-bold text-white">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-white text-slate-900 hover:bg-slate-100">
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
              <option value="CONCLUIDA">Concluida</option>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Criador</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ver</TableHead>
                {canManage && <TableHead>Acoes</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: Order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-sm">{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell>
                    {order.clientName ? (
                      <div>
                        <p className="text-sm font-medium">{order.clientName}</p>
                        {order.clientPhone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />{order.clientPhone}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{order.user.name}</TableCell>
                  <TableCell>
                    {order.description ? (
                      <p className="text-xs text-slate-600 max-w-[150px] truncate" title={order.description}>
                        {order.description}
                      </p>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.images && order.images.length > 0 ? (
                      <button
                        onClick={() => setImageViewUrl(order.images[0].url)}
                        className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <ImageIcon className="h-3 w-3" />
                        {order.images.length} foto{order.images.length > 1 ? "s" : ""}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-sm">{formatCurrency(order.total)}</TableCell>
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
                      <Eye className="h-3 w-3" /> Ver
                    </button>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <select
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="EM_ANDAMENTO">Em Andamento</option>
                          <option value="COMPLETA">Completa</option>
                          <option value="CONCLUIDA">Concluida</option>
                          <option value="CANCELADA">Cancelada</option>
                        </select>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(order)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteOrderId(order.id)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Apagar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 9 : 8} className="py-12 text-center text-slate-400">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    Nenhuma encomenda encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal — Detalhes */}
      {detailOrder && (
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              {(detailOrder.clientName || detailOrder.clientPhone) && (
                <div className="rounded-lg border border-slate-200 px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</p>
                  {detailOrder.clientName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-medium">{detailOrder.clientName}</p>
                    </div>
                  )}
                  {detailOrder.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <p className="text-sm text-slate-600">{detailOrder.clientPhone}</p>
                    </div>
                  )}
                </div>
              )}
              {detailOrder.description && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Descricao
                  </p>
                  <p className="text-sm text-blue-900 whitespace-pre-line">{detailOrder.description}</p>
                </div>
              )}
              {detailOrder.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Itens do Stock</p>
                  <div className="rounded-lg border border-slate-100 divide-y divide-slate-100">
                    {detailOrder.items.map((item: OrderItem, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{item.product?.name}</p>
                          <p className="text-xs text-slate-400">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailOrder.images && detailOrder.images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Fotografias ({detailOrder.images.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {detailOrder.images.map((img: OrderImage, i: number) => (
                      <div
                        key={i}
                        className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square cursor-pointer group"
                        onClick={() => setImageViewUrl(img.url)}
                      >
                        <img src={img.url} alt={`foto ${i + 1}`} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="rounded-full bg-white/90 p-1.5">
                            <Eye className="h-4 w-4 text-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailOrder.notes && (
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Observacoes</p>
                  <p className="text-sm text-slate-700">{detailOrder.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3">
                <span className="text-sm font-medium text-slate-300">Total</span>
                <span className="text-lg font-bold text-white">{formatCurrency(detailOrder.total)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setDetailOrder(null)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal — Editar (Admin) */}
      {editOrder && (
        <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" /> Editar Encomenda
              </DialogTitle>
              <DialogDescription>Apenas administradores podem editar encomendas</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4" /> Dados do Cliente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nome</Label>
                    <Input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Telemovel</Label>
                    <Input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} placeholder="+258 84 000 0000" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <Label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Descricao
                </Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descricao detalhada..."
                  className="resize-none bg-white border-blue-200 min-h-[80px]"
                  rows={3}
                />
              </div>
              {editOrder.images && editOrder.images.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Fotografias existentes — clica para remover
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {editOrder.images.map((img: OrderImage) => (
                      <div
                        key={img.id}
                        onClick={() => toggleRemoveExistingImage(img.id)}
                        className={`relative rounded-lg overflow-hidden border-2 aspect-square cursor-pointer transition-all
                          ${editRemoveImageIds.includes(img.id) ? "border-red-400 opacity-50" : "border-slate-200 hover:border-red-300"}`}
                      >
                        <img src={img.url} alt="foto" className="w-full h-full object-cover" />
                        {editRemoveImageIds.includes(img.id) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                            <X className="h-6 w-6 text-red-600" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {editRemoveImageIds.length > 0 && (
                    <p className="text-xs text-red-500">{editRemoveImageIds.length} foto(s) marcada(s) para remocao</p>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                  Adicionar fotografias ({editImagePreviews.length})
                </Label>
                {editImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editImagePreviews.map((src: string, i: number) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square">
                        <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewEditImage(i)}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 cursor-pointer hover:bg-slate-100 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <p className="text-sm text-slate-500">Clicar para adicionar fotos</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Observacoes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observacoes adicionais..."
                  className="resize-none"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>Cancelar</Button>
                <Button type="submit">Guardar Alteracoes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal — Ver Fotografia */}
      {imageViewUrl && (
        <Dialog open={!!imageViewUrl} onOpenChange={() => setImageViewUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fotografia</DialogTitle>
              <DialogDescription>Imagem da encomenda</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center rounded-lg overflow-hidden bg-slate-100">
              <img src={imageViewUrl} alt="Item" className="max-h-[65vh] w-auto object-contain" />
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={imageViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <Eye className="h-3 w-3" /> Abrir em nova aba
              </a>
              <Button variant="outline" onClick={() => setImageViewUrl(null)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal — Confirmar apagar */}
      {deleteOrderId && (
        <Dialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> Apagar Encomenda
              </DialogTitle>
              <DialogDescription>
                Esta acao e irreversivel. Tens a certeza que queres apagar esta encomenda?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteOrderId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete}>Sim, apagar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
