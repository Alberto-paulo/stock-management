import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { productSchema } from "@/lib/validations";

export async function GET() {
  const { authorized, response } = await checkAuth();
  if (!authorized) return response;

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  try {
    const body = await req.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: parsed.data,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Product create error:", error);
    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  await prisma.product.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
