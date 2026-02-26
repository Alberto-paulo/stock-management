"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  TrendingUp,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  AlertTriangle,
  DollarSign,
  BarChart3,
} from "lucide-react";

interface ReportData {
  stock: {
    totalProducts: number;
    totalInvested: number;
    totalPotentialSale: number;
    lowStockCount: number;
    lowStockProducts: Array<{ name: string; quantity: number; minQuantity: number }>;
  };
  sales: {
    dailyTotal: number;
    dailyProfit: number;
    dailyCount: number;
    monthlyTotal: number;
    monthlyProfit: number;
    monthlyCount: number;
  };
  purchases: {
    dailyTotal: number;
    dailyCount: number;
  };
  orders: {
    total: number;
    pendente: number;
    emAndamento: number;
    completa: number;
    concluida: number;
    cancelada: number;
    totalValue: number;
  };
  debts: {
    totalDebt: number;
    totalPaid: number;
    totalRemaining: number;
    activeDebts: number;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) setReports(await res.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  if (!reports) {
    return <div className="text-center text-slate-500">Erro ao carregar relatórios</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-slate-500">Visão geral de todas as operações</p>
      </div>

      {/* Stock Report */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Package className="h-5 w-5" />
          Relatório de Stock
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.stock.totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor Investido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reports.stock.totalInvested)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Potencial de Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(reports.stock.totalPotentialSale)}</div>
            </CardContent>
          </Card>
          <Card className={reports.stock.lowStockCount > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Produtos em Alerta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{reports.stock.lowStockCount}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Report */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <TrendingUp className="h-5 w-5" />
          Relatório de Vendas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reports.sales.dailyTotal)}</div>
              <p className="text-xs text-slate-500">{reports.sales.dailyCount} vendas hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reports.sales.monthlyTotal)}</div>
              <p className="text-xs text-slate-500">{reports.sales.monthlyCount} vendas este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(reports.sales.monthlyProfit)}</div>
              <p className="text-xs text-slate-500">Diário: {formatCurrency(reports.sales.dailyProfit)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Purchases Report */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <ShoppingCart className="h-5 w-5" />
          Relatório de Compras
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Gasto Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reports.purchases.dailyTotal)}</div>
              <p className="text-xs text-slate-500">{reports.purchases.dailyCount} compras</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${reports.sales.dailyTotal - reports.purchases.dailyTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(reports.sales.dailyTotal - reports.purchases.dailyTotal)}
              </div>
              <p className="text-xs text-slate-500">Vendas - Compras</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders Report */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <ClipboardList className="h-5 w-5" />
          Relatório de Encomendas
        </h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.orders.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="warning" className="text-lg">{reports.orders.pendente}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="info" className="text-lg">{reports.orders.emAndamento}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completas</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-lg">{reports.orders.completa}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="success" className="text-lg">{reports.orders.concluida}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="destructive" className="text-lg">{reports.orders.cancelada}</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Debts Report */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <CreditCard className="h-5 w-5" />
          Relatório de Dívidas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total em Dívidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reports.debts.totalDebt)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Recuperado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(reports.debts.totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                Total Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(reports.debts.totalRemaining)}</div>
              <p className="text-xs text-slate-500">{reports.debts.activeDebts} dívidas ativas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
