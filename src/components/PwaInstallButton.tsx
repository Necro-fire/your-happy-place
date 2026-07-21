import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface Props {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function PwaInstallButton({
  variant = "outline",
  size = "sm",
  className,
  label = "Instalar Aplicativo",
}: Props) {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        void promptInstall();
      }}
    >
      <Download className="h-4 w-4" />
      {size !== "icon" && <span className="ml-2">{label}</span>}
    </Button>
  );
}
