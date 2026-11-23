import { Scale } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Comparador de investimentos"
      description="Simulações com CDI, Selic, IPCA, tributação e liquidez."
      icon={Scale}
      phase={7}
    />
  );
}
