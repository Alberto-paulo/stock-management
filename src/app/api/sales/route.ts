import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { saleSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const where: Record<string, unknown> = {};

  if (session.user.role === "FUNCIONARIO") {
    where.userId = session.user.id;
  }

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
    const parsed = saleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const { items, notes } = parsed.data;

    const sale = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let totalProfit = 0;
      const saleItems = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productId}`);
        }

        if (product.quantity < item.quantity) {
          throw new Error(`Stock insuficiente para: ${product.name}`);
        }

        const itemTotal = item.quantity * item.unitPrice;
        const itemProfit = (item.unitPrice - product.buyPrice) * item.quantity;
        totalAmount += itemTotal;
        totalProfit += itemProfit;

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          buyPrice: product.buyPrice,
          total: itemTotal,
          profit: itemProfit,
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return tx.sale.create({
        data: {
          userId: session.user.id,
          total: totalAmount,
          profit: totalProfit,
          notes,
          items: { create: saleItems },
        },
        include: {
          items: { include: { product: { select: { name: true } } } },
        },
      });
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Sale error:", error);
    const message = error instanceof Error ? error.message : "Erro ao registrar venda";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
