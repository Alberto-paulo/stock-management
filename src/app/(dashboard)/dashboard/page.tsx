"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  ClipboardList,
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const role = session?.user?.role;

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "ADMIN" || role === "GERENTE") {
      fetchReports();
    } else {
      setLoading(false);
    }
  }, [role, fetchReports]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-500">
          Bem-vindo, {session?.user?.name}!
        </p>
      </div>

      {(role === "ADMIN" || role === "GERENTE") && reports ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
                <Package className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.stock.totalProducts}</div>
                {reports.stock.lowStockCount > 0 && (
                  <Badge variant="destructive" className="mt-1">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {reports.stock.lowStockCount} em alerta
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reports.sales.dailyTotal)}</div>
                <p className="text-xs text-slate-500">
                  Lucro: {formatCurrency(reports.sales.dailyProfit)} ({reports.sales.dailyCount} vendas)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Compras Hoje</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reports.purchases.dailyTotal)}</div>
                <p className="text-xs text-slate-500">{reports.purchases.dailyCount} compras</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Dívidas Pendentes</CardTitle>
                <CreditCard className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reports.debts.totalRemaining)}</div>
                <p className="text-xs text-slate-500">{reports.debts.activeDebts} dívidas ativas</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo de Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Valor investido</span>
                  <span className="font-medium">{formatCurrency(reports.stock.totalInvested)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Potencial de venda</span>
                  <span className="font-medium">{formatCurrency(reports.stock.totalPotentialSale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Vendas do mês</span>
                  <span className="font-medium">{formatCurrency(reports.sales.monthlyTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Lucro do mês</span>
                  <span className="font-medium text-green-600">{formatCurrency(reports.sales.monthlyProfit)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" />
                  Encomendas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="font-medium">{reports.orders.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Pendentes</span>
                  <Badge variant="warning">{reports.orders.pendente}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Em andamento</span>
                  <Badge variant="info">{reports.orders.emAndamento}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Concluídas</span>
                  <Badge variant="success">{reports.orders.concluida}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {reports.stock.lowStockProducts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas de Stock Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reports.stock.lowStockProducts.map((product) => (
                    <div key={product.name} className="flex items-center justify-between rounded-md bg-white p-3">
                      <span className="font-medium">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          {product.quantity} / {product.minQuantity} min
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo ao StockPro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">
                Use o menu lateral para acessar as funcionalidades disponíveis para o seu perfil.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
