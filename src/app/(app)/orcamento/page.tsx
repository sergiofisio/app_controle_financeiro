import { PiggyBank } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Orçamento"
      description="Limites por categoria, projeções e alertas de consumo."
      icon={PiggyBank}
      phase={5}
    />
  );
}
