import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const where: Record<string, unknown> = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { name: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  try {
    const body = await req.json();
    const { items = [], notes } = body;

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um item" },
        { status: 400 }
      );
    }

    const sale = await prisma.$transaction(async (tx) => {
      // Para cada item, buscar o produto para obter o buyPrice e calcular o lucro
      const saleItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productId}`);
        }

        if (product.quantity < item.quantity) {
          throw new Error(
            `Stock insuficiente para "${product.name}". Disponível: ${product.quantity}, solicitado: ${item.quantity}`
          );
        }

        // Diminuir o stock após a venda
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        // Calcular lucro: (preço de venda - preço de custo) * quantidade
        const itemTotal = item.quantity * item.unitPrice;
        const itemProfit = (item.unitPrice - product.buyPrice) * item.quantity;

        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          buyPrice: product.buyPrice,
          total: itemTotal,
          profit: itemProfit,
        });
      }

      // Somar total e lucro de todos os itens
      const total = saleItemsData.reduce((sum, i) => sum + i.total, 0);
      const profit = saleItemsData.reduce((sum, i) => sum + i.profit, 0);

      return tx.sale.create({
        data: {
          userId: session.user.id,
          total,
          profit,
          notes: notes || null,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          user: { select: { name: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Sale error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao registar venda";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
