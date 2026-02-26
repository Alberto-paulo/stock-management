import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "GERENTE", "FUNCIONARIO"]).optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  buyPrice: z.number().min(0, "Preço de compra deve ser positivo"),
  sellPrice: z.number().min(0, "Preço de venda deve ser positivo"),
  quantity: z.number().int().min(0, "Quantidade deve ser positiva"),
  minQuantity: z.number().int().min(0, "Quantidade mínima deve ser positiva"),
});

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const purchaseSchema = z.object({
  items: z.array(purchaseItemSchema).min(1, "Adicione pelo menos um item"),
  notes: z.string().optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Adicione pelo menos um item"),
  notes: z.string().optional(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item"),
  notes: z.string().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDENTE", "EM_ANDAMENTO", "COMPLETA", "CONCLUIDA", "CANCELADA"]),
});

export const debtSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  totalAmount: z.number().min(0, "Valor deve ser positivo"),
  description: z.string().optional(),
});

export const paymentSchema = z.object({
  debtId: z.string().min(1),
  amount: z.number().min(0.01, "Valor do pagamento deve ser positivo"),
  notes: z.string().optional(),
});

export const noteSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  orderId: z.string().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "GERENTE", "FUNCIONARIO"]).optional(),
  active: z.boolean().optional(),
});
