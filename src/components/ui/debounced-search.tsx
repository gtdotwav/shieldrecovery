"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type DebouncedSearchProps = {
  defaultValue: string;
  placeholder?: string;
  /** Delay in ms before navigating (default 300) */
  debounceMs?: number;
  /** URL search params to preserve when updating q */
  preserveParams?: string[];
};

export function DebouncedSearch({
  defaultValue,
  placeholder = "Buscar por nome, email ou telefone",
  debounceMs = 300,
  preserveParams = ["view", "scope"],
}: DebouncedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue);
  const deferredQuery = useDeferredValue(query);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const navigate = useCallback(
    (value: string) => {
      const params = new URLSearchParams();
      for (const key of preserveParams) {
        const existing = searchParams.get(key);
        if (existing) params.set(key, existing);
      }
      if (value.trim()) {
        params.set("q", value.trim());
      }
      const qs = params.toString();
      router.replace(`/leads${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams, preserveParams],
  );

  useEffect(() => {
    // Skip navigation on first render (initial page load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(deferredQuery), debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [deferredQuery, debounceMs, navigate]);

  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-black/[0.08] bg-white px-10 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[var(--accent)] dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
      />
    </label>
  );
}
