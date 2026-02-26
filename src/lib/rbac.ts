import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

type Role = "ADMIN" | "GERENTE" | "FUNCIONARIO";

const roleHierarchy: Record<Role, number> = {
  ADMIN: 3,
  GERENTE: 2,
  FUNCIONARIO: 1,
};

type AuthResult =
  | { authorized: false; response: NextResponse; session: null }
  | { authorized: true; response: null; session: { user: { id: string; name: string; email: string; role: string } } };

export async function checkAuth(allowedRoles?: Role[]): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
      session: null,
    };
  }

  const userRole = session.user.role as Role;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Sem permissão" }, { status: 403 }),
      session: null,
    };
  }

  return {
    authorized: true as const,
    response: null,
    session: session as AuthResult extends { authorized: true } ? AuthResult["session"] : never,
  } as AuthResult;
}

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[minRole];
}
