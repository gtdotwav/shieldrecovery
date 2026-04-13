import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
      <div className="text-center">
        <p className="text-7xl font-bold opacity-20">404</p>
        <h2 className="mt-4 text-xl font-semibold">
          Pagina nao encontrada
        </h2>
        <p className="mt-2 max-w-sm text-sm text-foreground-secondary">
          O endereco que voce acessou nao existe ou foi movido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Voltar ao inicio
        </Link>
      </div>
    </div>
  );
}
