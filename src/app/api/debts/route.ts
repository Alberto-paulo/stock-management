import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { debtSchema } from "@/lib/validations";

export async function GET() {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  const debts = await prisma.debt.findMany({
    include: {
      payments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(debts);
}

export async function POST(req: NextRequest) {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  try {
    const body = await req.json();
    const parsed = debtSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.create({
      data: {
        ...parsed.data,
        remaining: parsed.data.totalAmount,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error("Debt error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar dívida" },
      { status: 500 }
    );
  }
}
