#!/usr/bin/env python3
"""
Bulk improvement script for PagRecovery/Shield Recovery.
Handles mechanical fixes across the entire codebase.
"""

import os
import re
import json
from pathlib import Path

SRC = Path(__file__).parent.parent / "src"
CHANGES = []

def log(msg: str):
    CHANGES.append(msg)
    print(f"  [OK] {msg}")

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, content: str):
    path.write_text(content, encoding="utf-8")

def replace_in_file(path: Path, old: str, new: str, description: str):
    content = read(path)
    if old in content:
        content = content.replace(old, new)
        write(path, content)
        log(f"{path.relative_to(SRC)}: {description}")
        return True
    return False

# ══════════════════════════════════════════════════════
# #1 — Fix login placeholder (leaks shieldrecovery.local)
# ══════════════════════════════════════════════════════
def fix_login_placeholder():
    p = SRC / "app/login/page.tsx"
    replace_in_file(p,
        'placeholder="admin@shieldrecovery.local"',
        'placeholder="seu@email.com"',
        "#1 Fix login placeholder — remove internal domain leak")

# ══════════════════════════════════════════════════════
# #2 — Add required to login inputs
# ══════════════════════════════════════════════════════
def fix_login_required():
    p = SRC / "app/login/page.tsx"
    content = read(p)
    # Add required to email input
    if 'name="email"' in content and 'required' not in content.split('name="email"')[1].split("/>")[0]:
        content = content.replace(
            'placeholder="seu@email.com"',
            'placeholder="seu@email.com"\n            required'
        )
    # Add required to password input
    if 'name="password"' in content:
        pw_section = content.split('name="password"')[1].split("/>")[0]
        if "required" not in pw_section:
            content = content.replace(
                'placeholder="Sua senha"',
                'placeholder="Sua senha"\n            required'
            )
    write(p, content)
    log("app/login/page.tsx: #2 Added required to email/password fields")

# ══════════════════════════════════════════════════════
# #4 — Fix meta description (mentions Pagou.ai)
# ══════════════════════════════════════════════════════
def fix_meta_description():
    p = SRC / "lib/platform.ts"
    replace_in_file(p,
        'Estrutura de recovery pronta para operar com Pagou.ai e evoluir para white label.',
        'Plataforma inteligente de recuperação de pagamentos. Detecta falhas, contacta clientes e recupera vendas automaticamente.',
        "#4 Fix PagRecovery longDescription — remove Pagou.ai mention")

# ══════════════════════════════════════════════════════
# #5 + #6 + #35 — OG tags, unique descriptions, canonical
# ══════════════════════════════════════════════════════
def fix_seo_layout():
    p = SRC / "app/layout.tsx"
    content = read(p)

    # Add OG and Twitter tags to metadata
    old_metadata = """export const metadata: Metadata = {
  title: `${platformBrand.name} | ${platformBrand.shortDescription}`,
  description: platformBrand.longDescription,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};"""

    new_metadata = """export const metadata: Metadata = {
  title: {
    default: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    template: `%s | ${platformBrand.name}`,
  },
  description: platformBrand.longDescription,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: platformBrand.name,
    title: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    description: platformBrand.longDescription,
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${platformBrand.name} | ${platformBrand.shortDescription}`,
    description: platformBrand.longDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};"""

    if old_metadata in content:
        content = content.replace(old_metadata, new_metadata)
        write(p, content)
        log("app/layout.tsx: #5 Added OG/Twitter meta tags, #6 title template, #35 robots")

def fix_page_metadata():
    """Convert page metadata to use title template (just string, not object)"""
    pages = {
        "app/dashboard/page.tsx": "Recuperação",
        "app/leads/page.tsx": "CRM",
        "app/inbox/page.tsx": "Conversas",
        "app/calendar/page.tsx": "Calendário",
        "app/admin/page.tsx": "Admin",
        "app/connect/page.tsx": "Integrações",
        "app/ai/page.tsx": "Automações",
        "app/onboarding/page.tsx": "Guia",
        "app/test/page.tsx": "Testes",
    }

    for rel_path, title in pages.items():
        p = SRC / rel_path
        if not p.exists():
            continue
        content = read(p)

        # Match pattern: title: `Something | ${platformBrand.name}`
        pattern = r'title:\s*`[^`]+\|\s*\$\{platformBrand\.name\}`'
        match = re.search(pattern, content)
        if match:
            content = content[:match.start()] + f'title: "{title}"' + content[match.end():]
            write(p, content)
            log(f"{rel_path}: #6 Simplified metadata title to use layout template")

# ══════════════════════════════════════════════════════
# #8 — Calculator accessibility (add labels)
# ══════════════════════════════════════════════════════
def fix_calculator_labels():
    p = SRC / "components/landing/recovery-calculator.tsx"
    content = read(p)

    # The InputField component already has a label, but the range input needs one
    # Add aria-label to the range slider
    if 'type="range"' in content and 'aria-label' not in content.split('type="range"')[1].split("/>")[0]:
        content = content.replace(
            'type="range"',
            'type="range"\n                    aria-label="Taxa de falha em percentual"'
        )
        write(p, content)
        log("components/landing/recovery-calculator.tsx: #8 Added aria-label to range input")

# ══════════════════════════════════════════════════════
# #9 — Skip-to-content link
# ══════════════════════════════════════════════════════
def add_skip_to_content():
    p = SRC / "app/layout.tsx"
    content = read(p)
    if "skip-to-content" not in content:
        content = content.replace(
            "<body",
            '<body'
        )
        # Add skip link as first child of body
        content = content.replace(
            "<ToastProvider>",
            '<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg">Pular para conteúdo</a>\n        <ToastProvider>'
        )
        write(p, content)
        log("app/layout.tsx: #9 Added skip-to-content link")

# ══════════════════════════════════════════════════════
# #10 — Semantic badges (aria-label)
# ══════════════════════════════════════════════════════
def fix_badge_semantics():
    # Stage badge
    p = SRC / "components/ui/stage-badge.tsx"
    if p.exists():
        content = read(p)
        if "aria-label" not in content and "role=" not in content:
            # Add role="status" to the outer span
            content = content.replace(
                'className={cn(',
                'role="status"\n      aria-label={`Status: ${label}`}\n      className={cn(',
                1  # only first occurrence
            )
            write(p, content)
            log("components/ui/stage-badge.tsx: #10 Added role=status and aria-label")

    # Status badge
    p = SRC / "components/ui/status-badge.tsx"
    if p.exists():
        content = read(p)
        if "aria-label" not in content:
            content = content.replace(
                'className={cn(',
                'role="status"\n      aria-label={`${label}`}\n      className={cn(',
                1
            )
            write(p, content)
            log("components/ui/status-badge.tsx: #10 Added role=status and aria-label")

# ══════════════════════════════════════════════════════
# #11 — Focus indicators in CSS
# ══════════════════════════════════════════════════════
def add_focus_indicators():
    p = SRC / "app/globals.css"
    content = read(p)
    if "focus-visible" not in content:
        focus_css = """
/* ── Focus indicators (accessibility) ── */

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline-offset: -1px;
}
"""
        # Insert before the scrollbar section
        content = content.replace(
            "/* ── Scrollbars ── */",
            focus_css + "\n/* ── Scrollbars ── */",
        )
        write(p, content)
        log("app/globals.css: #11 Added :focus-visible indicators")

# ══════════════════════════════════════════════════════
# #13 — Fix hardcoded light-mode colors that don't adapt
# ══════════════════════════════════════════════════════
def fix_dark_mode_colors():
    """Find and fix hardcoded light colors in non-landing pages"""
    targets = [
        "app/retry",
        "app/onboarding",
        "app/invite",
    ]
    replacements = {
        'bg-[#f8fafc]': 'bg-gray-50 dark:bg-[#111111]',
        'bg-[#f8f9fb]': 'bg-gray-50 dark:bg-[#111111]',
        'bg-[#f8f8fa]': 'bg-gray-50 dark:bg-[#111111]',
        'text-[#1a1a2e]': 'text-gray-900 dark:text-white',
        'text-[#717182]': 'text-gray-500 dark:text-gray-400',
    }
    for target_dir in targets:
        for p in (SRC / target_dir).rglob("*.tsx"):
            content = read(p)
            changed = False
            for old, new in replacements.items():
                if old in content:
                    content = content.replace(old, new)
                    changed = True
            if changed:
                write(p, content)
                log(f"{p.relative_to(SRC)}: #13 Fixed hardcoded colors for dark mode")

# ══════════════════════════════════════════════════════
# #34 — Clean up sky→accent CSS overrides
# ══════════════════════════════════════════════════════
def cleanup_sky_overrides():
    """Remove the sky→accent CSS overrides since we've replaced sky classes in code"""
    p = SRC / "app/globals.css"
    content = read(p)

    # The block from .bg-sky-500 to the end of .focus\:ring-sky-400:focus
    sky_block = """/* ── Accent compatibility ── */

.bg-sky-500,
.bg-sky-600 {
  background: var(--accent) !important;
  color: #ffffff !important;
}

.hover\\:bg-sky-600:hover,
.hover\\:bg-sky-700:hover,
.hover\\:bg-sky-500:hover {
  background: var(--accent-strong) !important;
}

.text-sky-300,
.text-sky-400,
.text-sky-500,
.text-sky-600,
.text-sky-700 {
  color: var(--accent) !important;
}

.border-sky-100,
.border-sky-200,
.border-sky-500\\/18,
.border-sky-500\\/30 {
  border-color: var(--accent-soft) !important;
}

.focus\\:border-sky-300:focus,
.focus\\:border-sky-400:focus,
.focus\\:ring-sky-100:focus,
.focus\\:ring-sky-200:focus,
.focus\\:ring-sky-400:focus {
  border-color: rgba(249, 115, 22, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.07) !important;
}"""

    if sky_block in content:
        content = content.replace(sky_block, "/* Sky→accent overrides removed — classes replaced in source */")
        write(p, content)
        log("app/globals.css: #34 Removed sky→accent CSS overrides (classes fixed in source)")

# ══════════════════════════════════════════════════════
# #21 — Add Vercel Analytics
# ══════════════════════════════════════════════════════
def add_analytics():
    """Check if @vercel/analytics is available and add to layout"""
    p = SRC / "app/layout.tsx"
    content = read(p)
    if "Analytics" not in content and "vercel/analytics" not in content:
        # Add import
        content = content.replace(
            'import "./globals.css";',
            'import "./globals.css";\n\nlet Analytics: React.ComponentType | null = null;\ntry { Analytics = require("@vercel/analytics/react").Analytics; } catch {}'
        )
        # Add component before closing body
        content = content.replace(
            "</body>",
            "        {Analytics ? <Analytics /> : null}\n      </body>"
        )
        write(p, content)
        log("app/layout.tsx: #21 Added Vercel Analytics (graceful if package missing)")

# ══════════════════════════════════════════════════════
# RUN ALL
# ══════════════════════════════════════════════════════
if __name__ == "__main__":
    print("═══ Bulk Improvements for PagRecovery ═══\n")

    print("Phase 1: Security & Login")
    fix_login_placeholder()
    fix_login_required()

    print("\nPhase 2: SEO & Meta")
    fix_meta_description()
    fix_seo_layout()
    fix_page_metadata()

    print("\nPhase 3: Accessibility")
    fix_calculator_labels()
    add_skip_to_content()
    fix_badge_semantics()
    add_focus_indicators()

    print("\nPhase 4: Dark Mode & CSS")
    fix_dark_mode_colors()
    cleanup_sky_overrides()

    print("\nPhase 5: Analytics")
    add_analytics()

    print(f"\n═══ Done: {len(CHANGES)} changes applied ═══")
    for i, c in enumerate(CHANGES, 1):
        print(f"  {i}. {c}")
