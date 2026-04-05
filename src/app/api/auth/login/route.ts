import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";

    if (username === adminUser && password === adminPass) {
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await encrypt({ userId: "admin", role: "admin", expires });

      const cookieStore = await cookies();
      cookieStore.set("session", session, { expires, httpOnly: true });

      return NextResponse.json({ success: true, redirect: "/admin" });
    }

    return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
