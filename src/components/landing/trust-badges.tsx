"use client";

import {
  Shield,
  Lock,
  Activity,
  Headphones,
  CheckCircle,
} from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

const badges = [
  { label: "Criptografia AES-256", icon: Shield },
  { label: "LGPD Compliant", icon: Lock },
  { label: "99.9% Uptime", icon: Activity },
  { label: "Suporte 24/7", icon: Headphones },
  { label: "Sem contrato", icon: CheckCircle },
];

export function TrustBadges() {
  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-4 py-10 sm:px-8 sm:py-16 lg:px-10">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.label}
              className="flex items-center gap-2 rounded-full border px-4 py-2 sm:px-5 sm:py-2.5"
              style={{
                borderColor: `rgba(${rgb},0.1)`,
                background: `rgba(${rgb},0.03)`,
              }}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                style={{ color: `rgba(${rgb},0.5)` }}
              />
              <span className="text-xs font-medium text-gray-400 sm:text-sm">
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
