import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";

export async function GET() {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  // Datas para filtros
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date();
  monthEnd.setHours(23, 59, 59, 999);

  const [
    products,
    dailySales,
    monthlySales,
    dailyPurchases,
    orders,
    debts,
  ] = await Promise.all([
    // Produtos do stock
    prisma.product.findMany({
      where: { active: true },
      select: {
        name: true,
        buyPrice: true,
        sellPrice: true,
        quantity: true,
        minQuantity: true,
      },
    }),

    // Vendas de hoje
    prisma.sale.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      select: { total: true, profit: true },
    }),

    // Vendas do mês
    prisma.sale.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      select: { total: true, profit: true },
    }),

    // Compras de hoje
    prisma.purchase.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      select: { total: true },
    }),

    // Encomendas
    prisma.order.findMany({
      select: { status: true, total: true },
    }),

    // Dívidas
    prisma.debt.findMany({
      select: { totalAmount: true, paidAmount: true, remaining: true },
    }),
  ]);

  // --- Stock ---
  const totalProducts = products.length;
  const totalInvested = products.reduce(
    (sum, p) => sum + p.buyPrice * p.quantity,
    0
  );
  const totalPotentialSale = products.reduce(
    (sum, p) => sum + p.sellPrice * p.quantity,
    0
  );
  const lowStockProducts = products.filter(
    (p) => p.quantity <= p.minQuantity
  );

  // --- Vendas diárias ---
  const dailyTotal = dailySales.reduce((sum, s) => sum + s.total, 0);
  const dailyProfit = dailySales.reduce((sum, s) => sum + s.profit, 0);
  const dailyCount = dailySales.length;

  // --- Vendas mensais ---
  const monthlyTotal = monthlySales.reduce((sum, s) => sum + s.total, 0);
  const monthlyProfit = monthlySales.reduce((sum, s) => sum + s.profit, 0);
  const monthlyCount = monthlySales.length;

  // --- Compras diárias ---
  const purchaseDailyTotal = dailyPurchases.reduce(
    (sum, p) => sum + p.total,
    0
  );
  const purchaseDailyCount = dailyPurchases.length;

  // --- Encomendas ---
  const ordersTotal = orders.length;
  const ordersPendente = orders.filter((o) => o.status === "PENDENTE").length;
  const ordersEmAndamento = orders.filter(
    (o) => o.status === "EM_ANDAMENTO"
  ).length;
  const ordersConcluida = orders.filter(
    (o) => o.status === "CONCLUIDA"
  ).length;
  const ordersCancelada = orders.filter(
    (o) => o.status === "CANCELADA"
  ).length;
  const ordersTotalValue = orders.reduce((sum, o) => sum + o.total, 0);

  // --- Dívidas ---
  const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = debts.reduce((sum, d) => sum + d.remaining, 0);
  const activeDebts = debts.filter((d) => d.remaining > 0).length;

  return NextResponse.json({
    stock: {
      totalProducts,
      totalInvested,
      totalPotentialSale,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        minQuantity: p.minQuantity,
      })),
    },
    sales: {
      dailyTotal,
      dailyProfit,
      dailyCount,
      monthlyTotal,
      monthlyProfit,
      monthlyCount,
    },
    purchases: {
      dailyTotal: purchaseDailyTotal,
      dailyCount: purchaseDailyCount,
    },
    orders: {
      total: ordersTotal,
      pendente: ordersPendente,
      emAndamento: ordersEmAndamento,
      concluida: ordersConcluida,
      cancelada: ordersCancelada,
      totalValue: ordersTotalValue,
    },
    debts: {
      totalDebt,
      totalPaid,
      totalRemaining,
      activeDebts,
    },
  });
}
