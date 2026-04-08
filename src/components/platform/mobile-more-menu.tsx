"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Inbox, LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions/auth-actions";
import { cn } from "@/lib/utils";

type MobileRoute = {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
};

export function MobileMoreMenu({
  routes,
  currentPath,
}: {
  routes: MobileRoute[];
  currentPath: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = routes.some((r) => r.href === currentPath);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex flex-col items-center gap-0.5 min-w-[3rem] min-h-[2.75rem] justify-center px-1.5 rounded-lg transition-colors",
          isActive
            ? "text-[var(--accent)]"
            : "text-gray-400 dark:text-gray-500",
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Inbox className="w-5 h-5 shrink-0" />
        <span className="text-[0.6rem] leading-tight">Mais</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg min-w-[160px] py-1 z-50">
          {routes.map((route) => {
            const active = !route.external && currentPath === route.href;
            const itemClass = cn(
              "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
              active
                ? "text-[var(--accent)] bg-[var(--accent)]/5"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
            );

            return route.external ? (
              <a
                key={route.href}
                href={route.href}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {route.icon}
                {route.label}
              </a>
            ) : (
              <Link
                key={route.href}
                href={route.href}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {route.icon}
                {route.label}
              </Link>
            );
          })}
          <form action={logoutAction} className="border-t border-gray-200 dark:border-gray-800 mt-1 pt-1">
            <button
              type="submit"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 w-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
