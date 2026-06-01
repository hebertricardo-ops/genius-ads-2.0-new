const N8N_NEW_USER_URL =
  "https://estudo-metodo-era-n8n.dvibzb.easypanel.host/webhook-test/dc6a2822-3e70-4557-a16b-ca2605c25a56";

export function fireNewUserWebhook(data: {
  name: string;
  email: string;
  whatsapp?: string | null;
  plan?: string;
}) {
  fetch(N8N_NEW_USER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name ?? "",
      email: data.email,
      whatsapp: data.whatsapp ?? null,
      plan: data.plan ?? "free",
    }),
  }).catch(() => {});
}
