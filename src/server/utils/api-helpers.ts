import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data, timestamp: new Date().toISOString() }, { status });
}

export function apiError(error: string, status = 400, code?: string) {
  return NextResponse.json(
    { ok: false, error, code: code ?? `ERR_${status}`, timestamp: new Date().toISOString() },
    { status },
  );
}

export function withErrorHandler(handler: (req: Request, ctx?: any) => Promise<Response>) {
  return async (req: Request, ctx?: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error(`[API Error] ${req.method} ${req.url}:`, err);
      return apiError(message, 500, "ERR_INTERNAL");
    }
  };
}
