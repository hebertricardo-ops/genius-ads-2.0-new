import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export function isSvgUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".svg") ||
    lower.includes(".svg?") ||
    lower.includes("image/svg")
  );
}

export async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem: ${response.status} ${url}`);
  }
  return response.arrayBuffer();
}

let _wasmInitialized = false;

export async function convertSvgToPng(svgBuffer: ArrayBuffer): Promise<Uint8Array> {
  const { Resvg, initWasm } = await import("npm:@resvg/resvg-wasm");

  if (!_wasmInitialized) {
    await initWasm(
      fetch("https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"),
    );
    _wasmInitialized = true;
  }

  const svgText = new TextDecoder().decode(svgBuffer);
  const resvg = new Resvg(svgText, {
    fitTo: { mode: "width", value: 1200 },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

export async function ensureSupportedFormat(
  imageUrl: string,
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<string> {
  if (!isSvgUrl(imageUrl)) return imageUrl;

  console.log("[image-utils] SVG detectado, convertendo para PNG:", imageUrl);

  try {
    const svgBuffer = await fetchImageBuffer(imageUrl);
    const pngBytes = await convertSvgToPng(svgBuffer);

    const fileName = `logos/${userId}/${crypto.randomUUID()}.png`;
    const { error } = await supabaseAdmin.storage
      .from("creative-uploads")
      .upload(fileName, pngBytes, { contentType: "image/png", upsert: false });

    if (error) throw error;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("creative-uploads")
      .getPublicUrl(fileName);

    console.log("[image-utils] SVG convertido e salvo:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("[image-utils] Erro ao converter SVG:", error);
    throw new Error(
      `Não foi possível converter o logo SVG para PNG: ${error instanceof Error ? error.message : error}`,
    );
  }
}
