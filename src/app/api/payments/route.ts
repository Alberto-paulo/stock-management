import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { paymentSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const { authorized, response } = await checkAuth(["ADMIN", "GERENTE"]);
  if (!authorized) return response;

  try {
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const { debtId, amount, notes } = parsed.data;

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    if (!debt) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 }
      );
    }

    if (amount > debt.remaining) {
      return NextResponse.json(
        { error: "Valor excede o saldo restante" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { debtId, amount, notes },
      });

      const updatedDebt = await tx.debt.update({
        where: { id: debtId },
        data: {
          paidAmount: { increment: amount },
          remaining: { decrement: amount },
        },
      });

      return { payment, debt: updatedDebt };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }
}
