import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stock/:path*",
    "/purchases/:path*",
    "/sales/:path*",
    "/orders/:path*",
    "/debts/:path*",
    "/notes/:path*",
    "/reports/:path*",
    "/users/:path*",
  ],
};
