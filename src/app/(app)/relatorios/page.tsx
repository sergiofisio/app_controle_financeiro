import { BarChart3 } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Relatórios"
      description="Fluxo de caixa, categorias, comparativos e exportação CSV."
      icon={BarChart3}
      phase={4}
    />
  );
}
