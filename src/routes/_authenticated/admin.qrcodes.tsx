import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QrCode, Printer, Download, BookOpen, Coffee, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/qrcodes")({
  component: QrCodesPage,
});

function origin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function svgToBlob(svg: SVGSVGElement) {
  const s = new XMLSerializer().serializeToString(svg);
  return new Blob([`<?xml version="1.0" standalone="no"?>\n${s}`], { type: "image/svg+xml;charset=utf-8" });
}

function downloadSvg(id: string, filename: string) {
  const el = document.getElementById(id) as unknown as SVGSVGElement | null;
  if (!el) return;
  const url = URL.createObjectURL(svgToBlob(el));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function printHtml(html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { toast.error("Bloqueado pelo navegador"); return; }
  w.document.write(`<!doctype html><html><head><title>QR Codes</title>
    <style>
      @page { size: A4; margin: 10mm; }
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12mm; }
      .card { border: 1px dashed #999; border-radius: 8px; padding: 10mm; text-align: center; page-break-inside: avoid; }
      .card h3 { margin: 0 0 4mm; font-size: 18pt; }
      .card p { margin: 2mm 0 0; font-size: 10pt; color: #555; }
      .card svg { width: 60mm; height: 60mm; }
      .single { display: grid; place-items: center; min-height: 90vh; }
      .single svg { width: 120mm; height: 120mm; }
      .single h2 { font-size: 28pt; margin: 0 0 6mm; }
    </style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>{window.print();},300);}</script></body></html>`);
  w.document.close();
}

function svgMarkup(value: string, size = 220) {
  // Render an inline SVG string using qrcode.react's SVG DOM by serializing an offscreen instance is complex.
  // Instead, use a data URL via canvas: not available here. Use API-safe: chartlib not available.
  // Simplest reliable: use qrserver public endpoint fallback? No — offline. Use inline data via qrcode-generator? Not installed.
  // We'll re-render QRCodeSVG in a hidden container in React and read its outerHTML.
  return `<div data-qr="${encodeURIComponent(value)}" style="width:${size}px;height:${size}px"></div>`;
}

function QrCodesPage() {
  const [tab, setTab] = useState("mesas");
  const [busca, setBusca] = useState("");
  const hiddenRef = useRef<HTMLDivElement>(null);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });
  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: async () => (await supabase.from("restaurant_tables").select("*").order("numero")).data ?? [],
  });

  const cardapioUrl = `${origin()}/`;
  const mesaUrl = (numero: number) => `${origin()}/mesa/${numero}`;

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (tables.data ?? []).filter((t) => !q || String(t.numero).includes(q));
  }, [tables.data, busca]);

  function serializeQr(id: string): string {
    const el = document.getElementById(id) as unknown as SVGSVGElement | null;
    return el ? new XMLSerializer().serializeToString(el) : "";
  }

  function printOne(kind: "cardapio" | "mesa", numero?: number) {
    const id = kind === "cardapio" ? "qr-cardapio" : `qr-mesa-${numero}`;
    const svg = serializeQr(id);
    const title = kind === "cardapio" ? (settings.data?.nome_estabelecimento ?? "Cardápio Digital") : `Mesa ${numero}`;
    const sub = kind === "cardapio" ? "Escaneie para ver o cardápio" : "Escaneie para acompanhar seu pedido";
    printHtml(`<div class="single"><div style="text-align:center"><h2>${title}</h2>${svg}<p style="margin-top:6mm;font-size:12pt;color:#555">${sub}</p></div></div>`);
  }

  function printAllTables() {
    const cards = filtered.map((t) => {
      const svg = serializeQr(`qr-mesa-${t.numero}`);
      return `<div class="card"><h3>Mesa ${t.numero}</h3>${svg}<p>Escaneie para acompanhar seu pedido</p></div>`;
    }).join("");
    printHtml(`<div class="grid">${cards}</div>`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><QrCode className="h-6 w-6" /> QR Codes</h1>
        <p className="text-sm text-muted-foreground">
          Dois tipos oficiais: <strong>Cardápio</strong> (só consulta) e <strong>Mesa</strong> (acompanha pedidos em tempo real). Alterações no cardápio e pedidos são refletidas automaticamente — não é preciso gerar novo QR.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mesas"><Coffee className="mr-1 h-4 w-4" /> Mesas ({tables.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="cardapio"><BookOpen className="mr-1 h-4 w-4" /> Cardápio</TabsTrigger>
        </TabsList>

        <TabsContent value="cardapio" className="mt-4">
          <Card className="mx-auto max-w-md p-6 text-center">
            <h2 className="font-display text-lg font-semibold">{settings.data?.nome_estabelecimento ?? "Cardápio Digital"}</h2>
            <p className="text-xs text-muted-foreground">Escaneie para visualizar o cardápio completo</p>
            <div className="my-4 grid place-items-center rounded-lg border border-border bg-white p-4">
              <QRCodeSVG id="qr-cardapio" value={cardapioUrl} size={220} level="H" includeMargin />
            </div>
            <div className="break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{cardapioUrl}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => printOne("cardapio")}><Printer className="mr-1 h-4 w-4" /> Imprimir</Button>
              <Button variant="outline" onClick={() => downloadSvg("qr-cardapio", "qr-cardapio.svg")}><Download className="mr-1 h-4 w-4" /> Baixar SVG</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="mesas" className="mt-4 space-y-4">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número ou setor" className="pl-9" />
              </div>
              <Button onClick={printAllTables} disabled={filtered.length === 0}>
                <Printer className="mr-1 h-4 w-4" /> Imprimir todas ({filtered.length})
              </Button>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma mesa cadastrada. Cadastre em <strong>Mesas</strong>.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <Card key={t.id} className="p-4 text-center">
                  <div className="font-display text-lg font-bold">Mesa {t.numero}</div>
                  
                  <div className="my-3 grid place-items-center rounded-md border border-border bg-white p-3">
                    <QRCodeSVG id={`qr-mesa-${t.numero}`} value={mesaUrl(t.numero)} size={140} level="H" includeMargin />
                  </div>
                  <div className="mb-2 truncate text-[10px] text-muted-foreground">{mesaUrl(t.numero)}</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => printOne("mesa", t.numero)}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadSvg(`qr-mesa-${t.numero}`, `qr-mesa-${t.numero}.svg`)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div ref={hiddenRef} className="sr-only" aria-hidden />
    </div>
  );
}
