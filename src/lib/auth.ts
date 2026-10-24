import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  LIMITS,
  clearFailures,
  getClientIp,
  isBlocked,
  registerFailure,
} from "./rate-limit";

// Mensagem única para qualquer falha de login (não revela se o email existe).
const GENERIC_LOGIN_ERROR = "Email ou senha incorretos";
const BLOCKED_LOGIN_ERROR = "Muitas tentativas. Tente novamente dentro de 15 minutos.";

// Hash sem utilizador associado: serve para gastar o mesmo tempo de CPU quando o
// email não existe, evitando distinguir contas existentes pelo tempo de resposta.
const DUMMY_HASH = "$2b$12$tHL8g8QJXcDcEvWbTqIN8OAPCN4qstNNaOX9GSNFUksYe8NvG/W52";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(GENERIC_LOGIN_ERROR);
        }

        // Evita pedidos gigantes que só servem para gastar CPU no bcrypt.
        if (credentials.email.length > 254 || credentials.password.length > 128) {
          throw new Error(GENERIC_LOGIN_ERROR);
        }

        const emailKey = `email:${credentials.email.trim().toLowerCase()}`;
        const ipKey = `ip:${getClientIp(req?.headers as Record<string, string | string[] | undefined> | undefined)}`;

        if (isBlocked(emailKey) || isBlocked(ipKey)) {
          throw new Error(BLOCKED_LOGIN_ERROR);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Compara sempre com um hash (real ou falso) para manter o tempo constante.
        const isValid = await bcrypt.compare(
          credentials.password,
          user?.password ?? DUMMY_HASH
        );

        if (!user || !user.active || !isValid) {
          registerFailure(emailKey, LIMITS.perEmail);
          registerFailure(ipKey, LIMITS.perIp);
          throw new Error(GENERIC_LOGIN_ERROR);
        }

        clearFailures(emailKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; role: string }).id = token.id as string;
        (session.user as { id: string; role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
