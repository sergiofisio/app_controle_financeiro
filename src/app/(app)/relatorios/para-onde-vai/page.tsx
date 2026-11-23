import { ArrowLeftRight } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Para onde está indo nosso dinheiro?"
      description="Resumo claro de receitas, gastos, poupança e evolução patrimonial."
      icon={ArrowLeftRight}
      phase={4}
    />
  );
}
