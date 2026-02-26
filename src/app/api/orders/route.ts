import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

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
    const formData = await req.formData();
    const itemsRaw = formData.get("items") as string;
    const notes = formData.get("notes") as string | null;
    const customItemName = formData.get("customItemName") as string | null;
    const imageFile = formData.get("image") as File | null;

    const items = JSON.parse(itemsRaw || "[]");

    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const { url } = await put(
        `orders/${Date.now()}-${imageFile.name}`,
        imageFile,
        { access: "public" }
      );
      imageUrl = url;
    }

    // Monta as notas finais incluindo item personalizado e imagem
    let finalNotes = notes || "";
    if (customItemName) {
      finalNotes = `[Item extra: ${customItemName}]\n${finalNotes}`.trim();
    }
    if (imageUrl) {
      finalNotes = `${finalNotes}\n[imagem: ${imageUrl}]`.trim();
    }

    const total = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total,
        notes: finalNotes || null,
        items: {
          create: items.map((i: { productId: string; quantity: number; unitPrice: number }) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
      },
      include: {
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
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
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  if (session.user.role === "FUNCIONARIO") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: "ID e status são obrigatórios" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(order);
}
