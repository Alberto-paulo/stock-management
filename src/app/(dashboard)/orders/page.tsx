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
import { Plus, Trash2, ClipboardList, ImageIcon, Upload, X, Eye, AlertTriangle, Pencil, Phone, User, FileText } from "lucide-react";

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

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageViewUrl, setImageViewUrl] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Campos do formulário de criação
  const [items, setItems] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([]);
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  // Campos do formulário de edição
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
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
    setNotes("");
    setClientName("");
    setClientPhone("");
    setDescription("");
    setImageFiles([]);
    setImagePreviews([]);
  };

  const addItem = () => setItems([...items, { productId: "", quantity: "1", unitPrice: "" }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) newItems[index].unitPrice = product.sellPrice.toString();
    }
    setItems(newItems);
  };

  const processFiles = (
  files: File[],
  existingFiles: File[],
  existingPreviews: string[],
  setFiles: (f: File[]) => void,
  setPreviews: (p: string[]) => void,
  limit = 10
) => {
  const validFiles = files.filter(
    (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
  );
  const combined = [...existingFiles, ...validFiles].slice(0, limit);
  setFiles(combined);

  const newPreviews = [...existingPreviews];
  const newFiles = combined.slice(existingFiles.length);

  newFiles.forEach((file, idx) => {
    const i = existingFiles.length + idx;
    const reader = new FileReader();
    reader.onloadend = () => {
      newPreviews[i] = reader.result as string;
      setPreviews([...newPreviews]);
    };
    reader.readAsDataURL(file);
  });
};

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files, imageFiles, imagePreviews, setImageFiles, setImagePreviews);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const existingCount = (editOrder?.images.length || 0) - editRemoveImageIds.length;
    const limit = 10 - existingCount;
    processFiles(files, editImageFiles, editImagePreviews, setEditImageFiles, setEditImagePreviews, limit);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files, imageFiles, imagePreviews, setImageFiles, setImagePreviews);
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewEditImage = (index: number) => {
    setEditImageFiles(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRemoveExistingImage = (imageId: string) => {
    setEditRemoveImageIds(prev =>
      prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(
        items.filter(i => i.productId).map((i) => ({
          productId: i.productId,
          quantity: parseInt(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
        }))
      ));
      if (notes) formData.append("notes", notes);
      if (clientName) formData.append("clientName", clientName);
      if (clientPhone) formData.append("clientPhone", clientPhone);
      if (description) formData.append("description", description);
      imageFiles.forEach(file => formData.append("images", file));

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
      editImageFiles.forEach(file => formData.append("images", file));

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

  const ImageUploadArea = ({
    previews, onDrop, onDragOver, onDragLeave, onChange, onRemove, isDrag, accept, label
  }: {
    previews: string[];
    onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave?: () => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (i: number) => void;
    isDrag?: boolean;
    accept?: string;
    label?: string;
  }) => (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-slate-500" />
        {label || "Fotografias do item"} ({previews.length}/10)
      </Label>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square">
              <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {previews.length < 10 && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer
            ${isDrag ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"}`}
        >
          <input
            type="file"
            accept={accept || "image/*"}
            multiple
            onChange={onChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <Upload className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">Arrastar ou clicar para adicionar</p>
            <p className="text-xs text-slate-400">PNG, JPG, WEBP até 10MB cada</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Encomendas</h1>
          <p className="text-slate-500">Gerir encomendas e acompanhar status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
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
                  <User className="h-4 w-4" />
                  Dados do Cliente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nome do cliente</Label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telemóvel
                    </Label>
                    <Input
                      placeholder="Ex: +258 84 000 0000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Descrição da encomenda */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <Label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição da Encomenda
                </Label>
                <Textarea
                  placeholder="Descreve detalhadamente o que o cliente pretende encomendas. Ex: Camisola azul tamanho M com bordado no peito, tecido algodão..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none bg-white border-blue-200 min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-blue-600">
                  Inclui cor, tamanho, material, quantidade e outros detalhes relevantes
                </p>
              </div>

              {/* Produtos do stock (opcional) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">
                    Produtos do Stock <span className="text-xs font-normal text-slate-400">(opcional)</span>
                  </Label>
                </div>
                {items.length > 0 && (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-end gap-2 rounded-lg bg-slate-50 p-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-slate-500">Produto</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={item.productId}
                            onChange={(e) => updateItem(index, "productId", e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-xs text-slate-500">Qtd</Label>
                          <Input type="number" min="1" value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)} className="h-9" />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs text-slate-500">Preço Unit.</Label>
                          <Input type="number" step="0.01" value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)} className="h-9" />
                        </div>
                        <button type="button" onClick={() => removeItem(index)}
                          className="mb-0.5 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
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
              <ImageUploadArea
                previews={imagePreviews}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onChange={handleImageChange}
                onRemove={removeNewImage}
                isDrag={isDragging}
              />

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Observações adicionais</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outras notas sobre a encomenda..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Total + Submit */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Total estimado</p>
                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(items.reduce((sum, i) =>
                      sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0))}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Criar Encomenda</Button>
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
            <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Criador</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ver</TableHead>
                {canManage && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
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
                      <Eye className="h-3 w-3" />
                      Ver
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
                          <option value="CONCLUIDA">Concluída</option>
                          <option value="CANCELADA">Cancelada</option>
                        </select>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(order)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                              title="Editar encomenda"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteOrderId(order.id)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Apagar encomenda"
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

      {/* Modal — Detalhes da Encomenda */}
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
              {/* Status */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Status</span>
                <Badge variant={statusVariants[detailOrder.status] || "secondary"}>
                  {statusLabels[detailOrder.status] || detailOrder.status}
                </Badge>
              </div>

              {/* Dados do cliente */}
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

              {/* Descrição */}
              {detailOrder.description && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Descrição da Encomenda
                  </p>
                  <p className="text-sm text-blue-900">{detailOrder.description}</p>
                </div>
              )}

              {/* Itens do stock */}
              {detailOrder.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Itens do Stock</p>
                  <div className="rounded-lg border border-slate-100 divide-y divide-slate-100">
                    {detailOrder.items.map((item, i) => (
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

              {/* Fotografias */}
              {detailOrder.images && detailOrder.images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Fotografias ({detailOrder.images.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {detailOrder.images.map((img, i) => (
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

              {/* Observações */}
              {detailOrder.notes && (
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
                  <p className="text-sm text-slate-700">{detailOrder.notes}</p>
                </div>
              )}

              {/* Total */}
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

      {/* Modal — Editar Encomenda (só Admin) */}
      {editOrder && (
        <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Editar Encomenda
              </DialogTitle>
              <DialogDescription>Apenas administradores podem editar encomendas</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Dados do cliente */}
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
                    <Label className="text-xs text-slate-500">Telemóvel</Label>
                    <Input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} placeholder="+258 84 000 0000" />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <Label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Descrição da Encomenda
                </Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descrição detalhada..."
                  className="resize-none bg-white border-blue-200 min-h-[80px]"
                  rows={3}
                />
              </div>

              {/* Gerir fotografias existentes */}
              {editOrder.images && editOrder.images.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Fotografias existentes — clica para remover
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {editOrder.images.map((img) => (
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
                    <p className="text-xs text-red-500">{editRemoveImageIds.length} foto(s) marcada(s) para remoção</p>
                  )}
                </div>
              )}

              {/* Adicionar novas fotos */}
              <ImageUploadArea
                previews={editImagePreviews}
                onChange={handleEditImageChange}
                onRemove={removeNewEditImage}
                label="Adicionar novas fotografias"
              />

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Observações</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observações adicionais..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>Cancelar</Button>
                <Button type="submit">Guardar Alterações</Button>
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
              <a href={imageViewUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
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
                <AlertTriangle className="h-5 w-5" />
                Apagar Encomenda
              </DialogTitle>
              <DialogDescription>
                Esta ação é irreversível. Tens a certeza que queres apagar esta encomenda?
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
