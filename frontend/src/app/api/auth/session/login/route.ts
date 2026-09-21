import { forwardAuthJson } from "@/lib/sessionResponse";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return forwardAuthJson("/api/auth/login", body);
}
