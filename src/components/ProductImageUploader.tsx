import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ImagePlus, Loader2, RotateCw, Trash2, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProductImageUrl, isStoragePath, uploadProductImage, deleteProductImage } from "@/lib/product-image-url";

const ACCEPT = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPT_ATTR = ACCEPT.join(",");
const MAX_BYTES = 8 * 1024 * 1024;
const OUTPUT_SIZE = 1024;

type Props = {
  value?: string | null;
  onChange: (path: string | null) => void;
};

async function validateMagic(file: File): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("ffd8ff")) return true; // jpg
  if (hex.startsWith("89504e47")) return true; // png
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return true; // webp
  return false;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

async function makeCroppedWebp(src: string, area: Area, rotation: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d")!;

  // Rotated source draw
  const rad = (rotation * Math.PI) / 180;
  const off = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const rw = Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h);
  const rh = Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h);
  off.width = rw; off.height = rh;
  const octx = off.getContext("2d")!;
  octx.translate(rw / 2, rh / 2);
  octx.rotate(rad);
  octx.drawImage(img, -w / 2, -h / 2);

  ctx.drawImage(off, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/webp", 0.88));
}

export function ProductImageUploader({ value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (!value) { setPreview(null); return; }
    if (!isStoragePath(value)) { setPreview(value); return; }
    getProductImageUrl(value).then((u) => { if (alive) setPreview(u); });
    return () => { alive = false; };
  }, [value]);

  const openPicker = () => inputRef.current?.click();

  const handleFile = useCallback(async (f: File) => {
    if (!ACCEPT.includes(f.type)) return toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
    if (f.size > MAX_BYTES) return toast.error("Imagem acima de 8 MB.");
    if (!(await validateMagic(f))) return toast.error("Arquivo inválido ou corrompido.");
    const url = await readAsDataURL(f);
    setFile({ name: f.name, size: f.size });
    setCropSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  const confirmCrop = async () => {
    if (!cropSrc || !area) return;
    setUploading(true);
    try {
      const blob = await makeCroppedWebp(cropSrc, area, rotation);
      const previous = value && isStoragePath(value) ? value : null;
      const path = await uploadProductImage(blob, "webp");
      onChange(path);
      if (previous) deleteProductImage(previous).catch(() => {});
      setCropSrc(null);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    const previous = value && isStoragePath(value) ? value : null;
    onChange(null);
    if (previous) deleteProductImage(previous).catch(() => {});
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
        )}
      >
        {preview ? (
          <div className="flex w-full items-center gap-3">
            <img src={preview} alt="Prévia" className="h-24 w-24 rounded-lg object-cover" />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium truncate">{file?.name ?? "Imagem atual"}</div>
              {file && <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>}
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openPicker(); }}>
                  <Upload className="mr-1 h-3 w-3" />Alterar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); remove(); }}>
                  <Trash2 className="mr-1 h-3 w-3" />Remover
                </Button>
              </div>
            </div>
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        ) : (
          <>
            <ImagePlus className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm">Clique ou arraste uma imagem</div>
            <div className="text-xs text-muted-foreground">JPG, PNG ou WEBP • até 8 MB • recorte 1:1</div>
          </>
        )}
      </div>

      <Dialog open={!!cropSrc} onOpenChange={(o) => !o && !uploading && setCropSrc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ajustar imagem (1:1)</DialogTitle></DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black/80">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, a) => setArea(a)}
                showGrid
              />
            )}
          </div>
          <div className="space-y-3 pt-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Zoom</div>
              <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw className="mr-1 h-3 w-3" />Girar 90°
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); }}>
                Restaurar
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCropSrc(null)} disabled={uploading}>Cancelar</Button>
            <Button type="button" onClick={confirmCrop} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Salvar imagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
