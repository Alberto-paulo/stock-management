import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";

type Period = "daily" | "weekly" | "monthly";

// Maputo = UTC+2, sem horário de verão
const TZ_OFFSET_MS = 2 * 60 * 60 * 1000;

function getRange(period: Period, dateParam: string | null) {
  let y: number, m: number, d: number;

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [yy, mm, dd] = dateParam.split("-").map(Number);
    y = yy;
    m = mm - 1;
    d = dd;
  } else {
    // "hoje" no fuso de Maputo, independentemente do fuso do servidor
    const now = new Date(Date.now() + TZ_OFFSET_MS);
    y = now.getUTCFullYear();
    m = now.getUTCMonth();
    d = now.getUTCDate();
  }

  let startLocal: number;
  let endLocal: number;

  if (period === "weekly") {
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay(); // 0 = domingo
    const diff = (dow + 6) % 7; // semana começa na segunda-feira
    startLocal = Date.UTC(y, m, d - diff);
    endLocal = Date.UTC(y, m, d - diff + 7);
  } else if (period === "monthly") {
    startLocal = Date.UTC(y, m, 1);
    endLocal = Date.UTC(y, m + 1, 1);
  } else {
    startLocal = Date.UTC(y, m, d);
    endLocal = Date.UTC(y, m, d + 1);
  }

  return {
    start: new Date(startLocal - TZ_OFFSET_MS),
    end: new Date(endLocal - TZ_OFFSET_MS),
  };
}

export async function GET(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const rawPeriod = searchParams.get("period");
  const period: Period =
    rawPeriod === "weekly" || rawPeriod === "monthly" ? rawPeriod : "daily";

  const { start, end } = getRange(period, date);

  const where: Record<string, unknown> = {
    createdAt: { gte: start, lt: end },
  };

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
    const { items = [], freeItems = [], notes } = body;

    // Validação: pelo menos um item (stock ou livre)
    if (items.length === 0 && freeItems.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um item" },
        { status: 400 }
      );
    }

    // Validar itens de stock
    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json(
          { error: "Produto inválido nos itens de stock" },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Quantidade inválida nos itens de stock" },
          { status: 400 }
        );
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: "Preço inválido nos itens de stock" },
          { status: 400 }
        );
      }
    }

    // Validar itens livres
    for (const item of freeItems) {
      if (!item.description || !item.description.trim()) {
        return NextResponse.json(
          { error: "Descrição inválida nos itens livres" },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Quantidade inválida nos itens livres" },
          { status: 400 }
        );
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: "Preço inválido nos itens livres" },
          { status: 400 }
        );
      }
    }

    const stockTotal = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );

    const freeTotal = freeItems.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );

    const total = stockTotal + freeTotal;

    const purchase = await prisma.$transaction(async (tx) => {
      // Atualizar quantidade dos produtos do stock
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productId}`);
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
          items: {
            create: [
              // Itens de stock (com produto associado)
              ...items.map(
                (i: {
                  productId: string;
                  quantity: number;
                  unitPrice: number;
                }) => ({
                  productId: i.productId,
                  itemType: "STOCK",
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  total: i.quantity * i.unitPrice,
                })
              ),
              // Itens livres (sem produto, só descrição)
              ...freeItems.map(
                (i: {
                  description: string;
                  quantity: number;
                  unitPrice: number;
                }) => ({
                  description: i.description,
                  itemType: "FREE",
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  total: i.quantity * i.unitPrice,
                })
              ),
            ],
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

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("Purchase error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao registar compra";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
