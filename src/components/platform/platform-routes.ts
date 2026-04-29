import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ContactRound,
  Crosshair,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  Gift,
  HandCoins,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  PhoneCall,
  PhoneOutgoing,
  RefreshCcw,
  Repeat,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";

import { platformBrand } from "@/lib/platform";
import type { UserRole } from "@/server/auth/core";

export type SidebarGroup =
  | "overview"
  | "communication"
  | "monetization"
  | "sales"
  | "operations"
  | "admin";

export type PlatformRoute = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  kind: "marketing" | "app";
  group?: SidebarGroup;
  pinned?: boolean;
  allowedRoles?: UserRole[];
  devOnly?: boolean;
  experimental?: boolean;
  external?: boolean;
};

export const platformRoutes: PlatformRoute[] = [
  {
    href: "/",
    label: "Home",
    description: platformBrand.name,
    icon: LayoutDashboard,
    kind: "marketing",
  },
  {
    href: "/apps",
    label: "Mais",
    description: "Todas as ferramentas e módulos.",
    icon: LayoutGrid,
    kind: "app",
    group: "overview",
  },

  // ── Visão Geral ──
  {
    href: "/admin/ceo",
    label: "CEO",
    description: "Visão executiva da plataforma.",
    icon: Gauge,
    kind: "app",
    group: "overview",
    pinned: true,
    allowedRoles: ["admin"],
  },
  {
    href: "/dashboard",
    label: "Recuperação",
    description: "O que precisa de ação agora.",
    icon: BarChart3,
    kind: "app",
    group: "overview",
    pinned: true,
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Governança dos sellers e da recuperação.",
    icon: ShieldCheck,
    kind: "app",
    group: "overview",
    allowedRoles: ["admin"],
  },
  {
    href: "/onboarding",
    label: "Guia",
    description: "Como usar a plataforma no dia a dia.",
    icon: BookOpen,
    kind: "app",
    group: "overview",
    allowedRoles: ["admin", "seller", "market"],
  },

  // ── Comunicação ──
  {
    href: "/leads",
    label: "CRM",
    description: "Qual caso mover agora.",
    icon: Users,
    kind: "app",
    group: "communication",
    pinned: true,
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/inbox",
    label: "Conversas",
    description: "Quem precisa de resposta.",
    icon: MessageSquare,
    kind: "app",
    group: "communication",
    pinned: true,
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/calling",
    label: "CallCenter",
    description: "Agente de voz IA para recuperação de clientes.",
    icon: PhoneCall,
    kind: "app",
    group: "communication",
    allowedRoles: ["admin", "seller", "market"],
  },

  // ── Monetização ──
  {
    href: "/financeiro",
    label: "Financeiro",
    description: "Saldo, comissões e saques.",
    icon: Wallet,
    kind: "app",
    group: "monetization",
    pinned: true,
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/cart-recovery",
    label: "Carrinho",
    description: "Recuperação de carrinhos abandonados.",
    icon: ShoppingCart,
    kind: "app",
    group: "monetization",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/subscriptions",
    label: "Recorrência",
    description: "Assinaturas e cobrança recorrente inteligente.",
    icon: Repeat,
    kind: "app",
    group: "monetization",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/reactivation",
    label: "Reativação",
    description: "Reativar clientes inativos da base.",
    icon: RefreshCcw,
    kind: "app",
    group: "monetization",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/preventive",
    label: "Preventiva",
    description: "Régua preventiva pré-vencimento.",
    icon: Bell,
    kind: "app",
    group: "monetization",
    allowedRoles: ["admin", "seller"],
  },

  // ── Vendas ──
  {
    href: "/marketing",
    label: "Painel",
    description: "Painel de resultados e operação de recuperação.",
    icon: Megaphone,
    kind: "app",
    group: "sales",
    allowedRoles: ["admin", "market"],
  },
  {
    href: "/upsell",
    label: "Upsell",
    description: "Ofertas pós-pagamento e cross-sell.",
    icon: Gift,
    kind: "app",
    group: "sales",
    allowedRoles: ["admin", "seller"],
    experimental: true,
  },
  {
    href: "/commerce",
    label: "Vendas IA",
    description: "Vendas por conversa via WhatsApp e voz.",
    icon: Store,
    kind: "app",
    group: "sales",
    allowedRoles: ["admin", "seller"],
    experimental: true,
  },
  {
    href: "/outbound-sales",
    label: "Outbound",
    description: "Campanhas de venda ativa por IA.",
    icon: PhoneOutgoing,
    kind: "app",
    group: "sales",
    allowedRoles: ["admin", "seller"],
    experimental: true,
  },

  // ── Operações ──
  {
    href: "/ai",
    label: "Automações",
    description: "IA e automações da operação.",
    icon: Bot,
    kind: "app",
    group: "operations",
    pinned: true,
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/connect",
    label: "Integrações",
    description: "O que está ativo e o que falta.",
    icon: Settings,
    kind: "app",
    group: "operations",
    pinned: true,
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/calendar",
    label: "Calendário",
    description: "Movimento, notas e automações por dia.",
    icon: CalendarDays,
    kind: "app",
    group: "operations",
    allowedRoles: ["admin", "seller", "market"],
  },
  {
    href: "/tracking",
    label: "Tracking",
    description: "Atribuição UTM, ROAS e rastreamento de conversões.",
    icon: Crosshair,
    kind: "app",
    group: "operations",
    allowedRoles: ["admin", "seller"],
  },

  // ── Administração ──
  {
    href: "/admin/withdraw",
    label: "Saques",
    description: "Painel de saques PIX e saldo.",
    icon: HandCoins,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
  },
  {
    href: "/admin/crm",
    label: "CRM PIX",
    description: "Contatos e chaves PIX para saques.",
    icon: ContactRound,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
  },
  {
    href: "/reconciliation",
    label: "Conciliação",
    description: "Conciliação financeira automática.",
    icon: FileSpreadsheet,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
  },
  {
    href: "/payment-score",
    label: "Score",
    description: "Score de pagamento proprietário.",
    icon: Gauge,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
  },
  {
    href: "/negativation",
    label: "Negativação",
    description: "Negativação e protesto automatizado.",
    icon: AlertTriangle,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
  },
  {
    href: "/anticipation",
    label: "Antecipação",
    description: "Antecipação de recebíveis.",
    icon: Banknote,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
    experimental: true,
  },
  {
    href: "/test",
    label: "Testes",
    description: "Disparar eventos simulados.",
    icon: FlaskConical,
    kind: "app",
    group: "admin",
    allowedRoles: ["admin"],
  },
  {
    href: "/checkout/dashboard",
    label: "Checkout",
    description: "Plataforma de pagamentos e transações.",
    icon: Link2,
    kind: "app",
    group: "admin",
    external: true,
    allowedRoles: ["admin"],
  },
];

export function getVisibleRoutes(
  role?: UserRole,
  options: { experimentalEnabled?: boolean } = {},
) {
  return platformRoutes.filter((route) => {
    if (route.devOnly) {
      return process.env.NODE_ENV !== "production";
    }

    if (route.experimental && !options.experimentalEnabled) {
      return false;
    }

    if (route.allowedRoles && (!role || !route.allowedRoles.includes(role))) {
      return false;
    }

    return true;
  });
}
