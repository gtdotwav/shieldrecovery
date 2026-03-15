import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PlatformAppPage, PlatformSurface } from "@/components/platform/platform-shell";

export default function LeadNotFound() {
  return (
    <PlatformAppPage currentPath="/leads">
      <PlatformSurface className="flex flex-col items-center justify-center p-12">
        <p className="text-lg font-semibold text-[#1a1a2e]">
          Lead não encontrado
        </p>
        <p className="mt-2 text-sm text-[#717182]">
          O caso pode ter sido removido ou o ID é inválido.
        </p>
        <Link
          href="/leads"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff7e24]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao CRM
        </Link>
      </PlatformSurface>
    </PlatformAppPage>
  );
}
