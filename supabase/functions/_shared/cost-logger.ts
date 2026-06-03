import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ─── OpenAI gpt-4.1-mini pricing ─────────────────────────────────────────────
export function calcOpenAICost(promptTokens: number, completionTokens: number): number {
  const INPUT_PRICE  = 0.40 / 1_000_000;
  const OUTPUT_PRICE = 1.60 / 1_000_000;
  return (promptTokens * INPUT_PRICE) + (completionTokens * OUTPUT_PRICE);
}

// ─── FAL.AI gpt-image-2 medium pricing ───────────────────────────────────────
const FAL_COST_MEDIUM: Record<string, number> = {
  "square_hd":      0.061,
  "portrait_4_3":   0.043,
  "portrait_16_9":  0.054,
  "landscape_16_9": 0.053,
};

export function calcFalCost(imageSize: string): number {
  return FAL_COST_MEDIUM[imageSize] ?? 0.061;
}

// ─── Insert cost log (fire-and-forget safe) ───────────────────────────────────
export async function logCost(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    user_id:            string | null;
    api_provider:       "openai" | "fal_ai";
    model:              string;
    operation:          string;
    prompt_tokens?:     number;
    completion_tokens?: number;
    total_tokens?:      number;
    images_count?:      number;
    image_size?:        string;
    prompt_chars?:      number;
    ref_images_count?:  number;
    cost_usd:           number;
  },
): Promise<void> {
  try {
    await supabaseAdmin.from("api_cost_log").insert({
      user_id:           payload.user_id           ?? null,
      api_provider:      payload.api_provider,
      model:             payload.model,
      operation:         payload.operation,
      prompt_tokens:     payload.prompt_tokens     ?? 0,
      completion_tokens: payload.completion_tokens ?? 0,
      total_tokens:      payload.total_tokens      ?? 0,
      images_count:      payload.images_count      ?? 0,
      image_size:        payload.image_size        ?? null,
      prompt_chars:      payload.prompt_chars      ?? 0,
      ref_images_count:  payload.ref_images_count  ?? 0,
      cost_usd:          payload.cost_usd,
    });
  } catch (err) {
    // Log de custo nunca deve quebrar a geração
    console.error("[cost-log] Erro ao registrar custo:", err);
  }
}
