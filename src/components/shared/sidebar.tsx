"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  ClipboardList,
  CreditCard,
  StickyNote,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
  { href: "/stock", label: "Stock", icon: Package, roles: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
  { href: "/purchases", label: "Compras", icon: ShoppingCart, roles: ["ADMIN", "GERENTE"] },
  { href: "/sales", label: "Vendas", icon: TrendingUp, roles: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
  { href: "/orders", label: "Encomendas", icon: ClipboardList, roles: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
  { href: "/debts", label: "Dívidas", icon: CreditCard, roles: ["ADMIN", "GERENTE"] },
  { href: "/notes", label: "Anotações", icon: StickyNote, roles: ["ADMIN", "GERENTE", "FUNCIONARIO"] },
  { href: "/reports", label: "Relatórios", icon: BarChart3, roles: ["ADMIN", "GERENTE"] },
  { href: "/users", label: "Usuários", icon: Users, roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const userRole = session?.user?.role || "FUNCIONARIO";

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    GERENTE: "Gerente",
    FUNCIONARIO: "Funcionário",
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 p-6">
            <h1 className="text-xl font-bold text-slate-900">StockPro</h1>
            <p className="mt-1 text-xs text-slate-500">Gestão de Stock</p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {roleLabels[userRole] || userRole}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
