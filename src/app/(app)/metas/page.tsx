import { Target } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Metas financeiras"
      description="Objetivos, progresso e contribuição mensal necessária."
      icon={Target}
      phase={5}
    />
  );
}
