import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";

const protectedRoutes = ["/admin"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  if (isProtectedRoute) {
    const session = req.cookies.get("session")?.value;
    const parsed = await decrypt(session);

    if (!parsed?.userId) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    if (path.startsWith("/admin/global") && parsed.role !== "GLOBAL_ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
  }
  
  if (path === "/" || path === "/login") {
    const session = req.cookies.get("session")?.value;
    const parsed = await decrypt(session);
    if (parsed?.userId) {
       return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
