"use client";

import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

const steps = [
  {
    number: 1,
    title: "Crie sua conta",
    description: "Cadastro em 2 minutos, sem cartão de crédito.",
  },
  {
    number: 2,
    title: "Conecte seu gateway",
    description: "Configure o webhook no painel do seu gateway.",
  },
  {
    number: 3,
    title: "Recupere automaticamente",
    description: "IA começa a monitorar e recuperar imediatamente.",
  },
];

export function OnboardingSteps() {
  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
      <div className="text-center">
        <p
          className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-70 sm:tracking-[0.3em]"
          style={{ color: b.accent }}
        >
          Onboarding
        </p>
        <h2 className="mt-3 text-balance text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:mt-4 sm:text-[1.75rem] lg:text-[2.2rem]">
          Comece em 3 passos
        </h2>
      </div>

      <div className="mx-auto mt-10 max-w-[48rem] sm:mt-14">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-3 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Connecting line — between circles on desktop */}
              {i < steps.length - 1 && (
                <div
                  className="absolute left-1/2 top-[1.25rem] hidden h-px sm:block"
                  style={{
                    width: "100%",
                    background: `rgba(${rgb},0.15)`,
                  }}
                />
              )}
              {/* Connecting line — vertical on mobile */}
              {i < steps.length - 1 && (
                <div
                  className="absolute left-1/2 top-[2.5rem] -translate-x-1/2 sm:hidden"
                  style={{
                    width: "1px",
                    height: "calc(100% - 1rem)",
                    background: `rgba(${rgb},0.15)`,
                  }}
                />
              )}

              {/* Number circle */}
              <div
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  background: `rgba(${rgb},0.1)`,
                  color: b.accent,
                  border: `1px solid rgba(${rgb},0.2)`,
                }}
              >
                {step.number}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-gray-200">
                {step.title}
              </h3>
              <p className="mt-1.5 max-w-[14rem] text-sm leading-relaxed text-gray-500 pb-8 sm:pb-0">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
