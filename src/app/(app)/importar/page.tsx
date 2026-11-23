import { FileUp } from "lucide-react";
import { ComingSoonPage } from "@/lib/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      title="Importar extratos"
      description="Importação de CSV, OFX e PDF textual com antiduplicação."
      icon={FileUp}
      phase={3}
    />
  );
}
