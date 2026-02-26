import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";

export async function GET() {
  const { authorized, response, session } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized || !session) return response;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    products,
    dailySales,
    monthlySales,
    dailyPurchases,
    orders,
    debts,
  ] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    prisma.sale.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.purchase.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.order.findMany(),
    prisma.debt.findMany(),
  ]);

  const stockReport = {
    totalProducts: products.length,
    totalInvested: products.reduce((sum, p) => sum + p.buyPrice * p.quantity, 0),
    totalPotentialSale: products.reduce((sum, p) => sum + p.sellPrice * p.quantity, 0),
    lowStockProducts: products.filter((p) => p.quantity <= p.minQuantity),
    lowStockCount: products.filter((p) => p.quantity <= p.minQuantity).length,
  };

  const salesReport = {
    dailyTotal: dailySales.reduce((sum, s) => sum + s.total, 0),
    dailyProfit: dailySales.reduce((sum, s) => sum + s.profit, 0),
    dailyCount: dailySales.length,
    monthlyTotal: monthlySales.reduce((sum, s) => sum + s.total, 0),
    monthlyProfit: monthlySales.reduce((sum, s) => sum + s.profit, 0),
    monthlyCount: monthlySales.length,
  };

  const purchasesReport = {
    dailyTotal: dailyPurchases.reduce((sum, p) => sum + p.total, 0),
    dailyCount: dailyPurchases.length,
  };

  const ordersReport = {
    total: orders.length,
    pendente: orders.filter((o) => o.status === "PENDENTE").length,
    emAndamento: orders.filter((o) => o.status === "EM_ANDAMENTO").length,
    completa: orders.filter((o) => o.status === "COMPLETA").length,
    concluida: orders.filter((o) => o.status === "CONCLUIDA").length,
    cancelada: orders.filter((o) => o.status === "CANCELADA").length,
    totalValue: orders.reduce((sum, o) => sum + o.total, 0),
  };

  const debtsReport = {
    totalDebt: debts.reduce((sum, d) => sum + d.totalAmount, 0),
    totalPaid: debts.reduce((sum, d) => sum + d.paidAmount, 0),
    totalRemaining: debts.reduce((sum, d) => sum + d.remaining, 0),
    activeDebts: debts.filter((d) => d.remaining > 0).length,
  };

  return NextResponse.json({
    stock: stockReport,
    sales: salesReport,
    purchases: purchasesReport,
    orders: ordersReport,
    debts: debtsReport,
  });
}
