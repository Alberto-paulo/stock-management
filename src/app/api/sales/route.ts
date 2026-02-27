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

  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      user: { select: { name: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(purchases);
}

export async function POST(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  try {
    const body = await req.json();
    const { items = [], freeItemsTotal = 0, notes } = body;

    // Calcular total dos itens do stock + itens livres
    const stockTotal = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );
    const total = stockTotal + (parseFloat(freeItemsTotal) || 0);

    const purchase = await prisma.$transaction(async (tx) => {
      // Atualizar quantidade dos produtos do stock
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new Error(`Produto nao encontrado: ${item.productId}`);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      return tx.purchase.create({
        data: {
          userId: session.user.id,
          total,
          notes: notes || null,
          items:
            items.length > 0
              ? {
                  create: items.map(
                    (i: {
                      productId: string;
                      quantity: number;
                      unitPrice: number;
                    }) => ({
                      productId: i.productId,
                      quantity: i.quantity,
                      unitPrice: i.unitPrice,
                      total: i.quantity * i.unitPrice,
                    })
                  ),
                }
              : undefined,
        },
        include: {
          user: { select: { name: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("Purchase error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao registar compra";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
