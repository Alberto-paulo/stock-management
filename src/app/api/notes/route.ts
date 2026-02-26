import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/rbac";
import { noteSchema } from "@/lib/validations";

export async function GET() {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const where: Record<string, unknown> = {};

  if (session.user.role === "FUNCIONARIO") {
    where.userId = session.user.id;
  }

  const notes = await prisma.note.findMany({
    where,
    include: {
      user: { select: { name: true } },
      order: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  try {
    const body = await req.json();
    const parsed = noteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
        orderId: parsed.data.orderId || null,
      },
      include: {
        user: { select: { name: true } },
        order: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Note error:", error);
    return NextResponse.json(
      { error: "Erro ao criar anotação" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { authorized, response, session } = await checkAuth();
  if (!authorized || !session) return response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  const note = await prisma.note.findUnique({ where: { id } });

  if (!note) {
    return NextResponse.json(
      { error: "Anotação não encontrada" },
      { status: 404 }
    );
  }

  if (session.user.role === "FUNCIONARIO" && note.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.note.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
