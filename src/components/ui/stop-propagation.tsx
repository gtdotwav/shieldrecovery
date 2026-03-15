"use client";

/**
 * Client-side wrapper that stops click propagation.
 * Used to prevent parent <Link> navigation when clicking nested
 * interactive elements (forms, buttons) inside a clickable card.
 *
 * Server Components cannot use event handlers like onClick,
 * so this wrapper isolates the client-side behavior.
 */
export function StopPropagation({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      onClick={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
