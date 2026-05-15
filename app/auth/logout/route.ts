import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? request.url));
  response.cookies.delete("drive-access-console-session");
  return response;
}
