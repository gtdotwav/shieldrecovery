"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Testimonial = {
  text: string;
  name: string;
  role: string;
  company?: string;
};

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 10,
}: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-5 pb-5"
      >
        {[...Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-xs w-full rounded-2xl p-6 sm:p-7",
                  "border border-gray-100 dark:border-gray-800",
                  "bg-white dark:bg-[#161616]",
                  "shadow-sm transition-shadow hover:shadow-md",
                )}
              >
                <p className="text-[0.85rem] leading-relaxed text-gray-600 dark:text-gray-400">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {t.name}
                    </p>
                    <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                      {t.role}{t.company ? ` · ${t.company}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
