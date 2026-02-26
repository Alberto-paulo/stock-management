import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { purchaseSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { authorized, response, session } = await checkAuth(["ADMIN", "GERENTE"]);
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
  const { authorized, response, session } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized || !session) return response;

  try {
    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const { items, notes } = parsed.data;

    const purchase = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const purchaseItems = [];

      for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice;
        totalAmount += itemTotal;
        purchaseItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: itemTotal,
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      return tx.purchase.create({
        data: {
          userId: session.user.id,
          total: totalAmount,
          notes,
          items: { create: purchaseItems },
        },
        include: {
          items: { include: { product: { select: { name: true } } } },
        },
      });
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("Purchase error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar compra" },
      { status: 500 }
    );
  }
}
