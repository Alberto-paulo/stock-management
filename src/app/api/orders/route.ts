import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { orderSchema, orderStatusSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (session.user.role === "FUNCIONARIO") {
    where.userId = session.user.id;
  }

  if (status) {
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { name: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const { items, notes } = parsed.data;

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      totalAmount += itemTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: totalAmount,
        notes,
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order error:", error);
    return NextResponse.json(
      { error: "Erro ao criar encomenda" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const parsed = orderStatusSchema.safeParse({ status });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Encomenda não encontrada" },
        { status: 404 }
      );
    }

    if (status === "CONCLUIDA" && order.status !== "CONCLUIDA") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        await tx.order.update({
          where: { id },
          data: { status },
        });
      });
    } else {
      await prisma.order.update({
        where: { id },
        data: { status },
      });
    }

    const updated = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true } } } },
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar encomenda" },
      { status: 500 }
    );
  }
}
