import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadTenantByPublicCodigo } from "@/lib/tenant-session";

export const Route = createFileRoute("/c/$codigo")({
  head: ({ params }) => ({
    meta: [
      { title: `Cardápio · ${params.codigo}` },
      { name: "description", content: "Cardápio digital público." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicCodePage,
});

function PublicCodePage() {
  const { codigo } = Route.useParams();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await loadTenantByPublicCodigo(codigo);
      if (!t) { setNotFound(true); return; }
      if (t.slug) {
        navigate({ to: "/cardapio/$slug", params: { slug: t.slug }, replace: true });
      } else if (t.codigo) {
        navigate({ to: "/menu/$codigo", params: { codigo: t.codigo }, replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  if (notFound) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Cardápio não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O código <span className="font-mono">{codigo}</span> não pertence a nenhuma loja.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>Voltar para início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
      Abrindo cardápio...
    </div>
  );
}
