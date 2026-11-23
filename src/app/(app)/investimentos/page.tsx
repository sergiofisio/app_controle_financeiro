import { LineChart } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Investimentos"
      description="Carteira, aportes, resgates e rentabilidade sem confundir com ganhos."
      icon={LineChart}
      phase={6}
    />
  );
}
