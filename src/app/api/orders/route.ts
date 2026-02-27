import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

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
      images: true,
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
    const clientName = formData.get("clientName") as string | null;
    const clientPhone = formData.get("clientPhone") as string | null;
    const description = formData.get("description") as string | null;
    const customQuantity = parseFloat(formData.get("customQuantity") as string || "0");
    const customUnitPrice = parseFloat(formData.get("customUnitPrice") as string || "0");

    const items = JSON.parse(itemsRaw || "[]");

    // Upload de múltiplas imagens
    const imageUrls: string[] = [];
    const imageFiles = formData.getAll("images") as File[];
    for (const imageFile of imageFiles) {
      if (imageFile && imageFile.size > 0) {
        const { url } = await put(
          `orders/${Date.now()}-${generateId()}-${imageFile.name}`,
          imageFile,
          { access: "public" }
        );
        imageUrls.push(url);
      }
    }

    // Calcular total dos produtos do stock
    const stockTotal = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );

    // Calcular total do item custom (quantidade × preço unitário)
    const customTotal =
      customQuantity > 0 && customUnitPrice > 0
        ? customQuantity * customUnitPrice
        : 0;

    const total = stockTotal + customTotal;

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total,
        notes: notes || null,
        clientName: clientName || null,
        clientPhone: clientPhone || null,
        description: description || null,
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
        images:
          imageUrls.length > 0
            ? {
                create: imageUrls.map((url) => ({
                  id: generateId(),
                  url,
                })),
              }
            : undefined,
      },
      include: {
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
        images: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order POST error:", error);
    return NextResponse.json(
      { error: "Erro ao criar encomenda" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    if (session.user.role === "FUNCIONARIO") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json(
        { error: "ID e status sao obrigatorios" },
        { status: 400 }
      );
    }
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json(order);
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem editar encomendas" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const clientName = formData.get("clientName") as string | null;
    const clientPhone = formData.get("clientPhone") as string | null;
    const description = formData.get("description") as string | null;
    const notes = formData.get("notes") as string | null;
    const removeImageIds = JSON.parse(
      (formData.get("removeImageIds") as string) || "[]"
    );

    if (!id) {
      return NextResponse.json({ error: "ID e obrigatorio" }, { status: 400 });
    }

    const existingImages = await prisma.orderImage.count({
      where: { orderId: id },
    });
    const remainingSlots =
      10 - existingImages + removeImageIds.length;

    const imageUrls: string[] = [];
    const imageFiles = formData.getAll("images") as File[];
    const validImages = imageFiles.filter((f) => f.size > 0);

    if (validImages.length > remainingSlots) {
      return NextResponse.json(
        { error: "Maximo de 10 fotografias por encomenda" },
        { status: 400 }
      );
    }

    for (const imageFile of validImages) {
      const { url } = await put(
        `orders/${Date.now()}-${generateId()}-${imageFile.name}`,
        imageFile,
        { access: "public" }
      );
      imageUrls.push(url);
    }

    if (removeImageIds.length > 0) {
      await prisma.orderImage.deleteMany({
        where: { id: { in: removeImageIds }, orderId: id },
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        clientName: clientName || null,
        clientPhone: clientPhone || null,
        description: description || null,
        notes: notes || null,
        images:
          imageUrls.length > 0
            ? {
                create: imageUrls.map((url) => ({
                  id: generateId(),
                  url,
                })),
              }
            : undefined,
      },
      include: {
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
        images: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order PUT error:", error);
    return NextResponse.json(
      { error: "Erro ao editar encomenda" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem apagar encomendas" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID e obrigatorio" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json(
      { error: "Encomenda nao encontrada" },
      { status: 404 }
    );
  }

  await prisma.order.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
