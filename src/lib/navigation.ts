import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  FileUp,
  LayoutDashboard,
  LineChart,
  PiggyBank,
  Receipt,
  Scale,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  phase: number;
  group: "visao" | "diario" | "planejamento" | "investimentos" | "sistema";
};

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    phase: 1,
    group: "visao",
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    phase: 4,
    group: "visao",
  },
  {
    title: "Para onde vai o dinheiro",
    href: "/relatorios/para-onde-vai",
    icon: ArrowLeftRight,
    phase: 4,
    group: "visao",
  },
  {
    title: "Lançamentos",
    href: "/lancamentos",
    icon: Receipt,
    phase: 2,
    group: "diario",
  },
  {
    title: "Contas bancárias",
    href: "/contas",
    icon: Wallet,
    phase: 2,
    group: "diario",
  },
  {
    title: "Cartões de crédito",
    href: "/cartoes",
    icon: CreditCard,
    phase: 2,
    group: "diario",
  },
  {
    title: "Importar extratos",
    href: "/importar",
    icon: FileUp,
    phase: 3,
    group: "diario",
  },
  {
    title: "Orçamento",
    href: "/orcamento",
    icon: PiggyBank,
    phase: 5,
    group: "planejamento",
  },
  {
    title: "Metas financeiras",
    href: "/metas",
    icon: Target,
    phase: 5,
    group: "planejamento",
  },
  {
    title: "Investimentos",
    href: "/investimentos",
    icon: LineChart,
    phase: 6,
    group: "investimentos",
  },
  {
    title: "Comparador",
    href: "/comparador",
    icon: Scale,
    phase: 7,
    group: "investimentos",
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    phase: 1,
    group: "sistema",
  },
];

export const navGroups: {
  id: NavItem["group"];
  label: string;
}[] = [
  { id: "visao", label: "Visão geral" },
  { id: "diario", label: "Dia a dia" },
  { id: "planejamento", label: "Planejamento" },
  { id: "investimentos", label: "Investimentos" },
  { id: "sistema", label: "Sistema" },
];
