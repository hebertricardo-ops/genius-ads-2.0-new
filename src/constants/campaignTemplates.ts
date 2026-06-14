export const CAMPAIGN_TEMPLATES = [
  {
    key: "no_creative",
    label: "Não gerou nenhum criativo",
    subject: "Seus créditos ainda estão aqui esperando por você",
    message: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Seus créditos ainda estão aqui</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#F97316;padding:28px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Genius ADS</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#111827;line-height:1.6;">
                Oi <strong>{{nome}}</strong>,
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
                Você se cadastrou no <strong>Genius ADS</strong> mas ainda não gerou seu primeiro criativo.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
                Seus créditos gratuitos ainda estão disponíveis — e gerar seu primeiro criativo leva
                <strong>menos de 2 minutos</strong>, sem precisar de logo nem imagem pronta.
              </p>
              <p style="margin:0 0 32px 0;font-size:16px;color:#374151;line-height:1.6;">
                Você só precisa do nome do seu produto e uma frase sobre o que ele resolve. O Genius ADS cuida do resto.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://adsgenius.com.br"
                       style="display:inline-block;background-color:#F97316;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;">
                      Gerar meu primeiro criativo →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6B7280;line-height:1.6;">
                Qualquer dúvida contate a nossa central de suporte via WhatsApp.
              </p>
              <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:#374151;">
                Suporte — Genius ADS
              </p>
              <p style="margin:0;font-size:13px;color:#374151;">
                WhatsApp:
                <a href="https://wa.me/5521975723110"
                   style="color:#F97316;text-decoration:none;font-weight:700;">
                  (21) 97572-3110
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    messageWhatsapp: `Oi {{nome}}!
Você se cadastrou no Genius ADS mas ainda não gerou seu primeiro criativo.
Seus créditos gratuitos ainda estão disponíveis — e gerar seu primeiro criativo leva menos de 2 minutos, sem precisar de logo nem imagem pronta.
Você só precisa do nome do seu produto e uma frase sobre o que ele resolve. O Genius ADS cuida do resto.
👉 Acesse agora: https://adsgenius.com.br
Qualquer dúvida contate a nossa central de suporte via WhatsApp.

Suporte — Genius ADS

WhatsApp: (21) 97572-3110`,
  },
  {
    key: "feedback_request",
    label: "Feedback pós-teste",
    subject: "O que você achou do Genius ADS?",
    message: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>O que você achou do Genius ADS?</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#F97316;padding:28px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Genius ADS</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#111827;line-height:1.6;">
                Oi <strong>{{nome}}</strong>,
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
                Você testou o Genius ADS e quero entender sua experiência.
              </p>
              <p style="margin:0 0 8px 0;font-size:16px;color:#374151;line-height:1.6;">
                <strong>O que faltou para continuar?</strong>
              </p>

              <!-- Options -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
                <tr>
                  <td style="padding:10px 16px;background-color:#FFF7ED;border-left:3px solid #F97316;border-radius:4px;">
                    <p style="margin:0;font-size:15px;color:#374151;">
                      🎨 A qualidade do criativo não me convenceu
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background-color:#FFF7ED;border-left:3px solid #F97316;border-radius:4px;">
                    <p style="margin:0;font-size:15px;color:#374151;">
                      💰 O preço não faz sentido pra mim agora
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background-color:#FFF7ED;border-left:3px solid #F97316;border-radius:4px;">
                    <p style="margin:0;font-size:15px;color:#374151;">
                      🖥️ Não entendi direito como usar
                    </p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background-color:#FFF7ED;border-left:3px solid #F97316;border-radius:4px;">
                    <p style="margin:0;font-size:15px;color:#374151;">
                      💬 Outra razão
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px 0;font-size:16px;color:#374151;line-height:1.6;">
                É só responder esse email com sua opção ou me contar com suas palavras —
                sua resposta vai me ajudar a melhorar o produto e, dependendo do que você disser,
                posso ter algo que faz sentido pra você.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="mailto:hebertricardo@gmail.com?subject=Feedback Genius ADS"
                       style="display:inline-block;background-color:#F97316;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;">
                      Responder agora →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6B7280;line-height:1.6;">
                Qualquer dúvida contate a nossa central de suporte via WhatsApp.
              </p>
              <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:#374151;">
                Suporte — Genius ADS
              </p>
              <p style="margin:0;font-size:13px;color:#374151;">
                WhatsApp:
                <a href="https://wa.me/5521975723110"
                   style="color:#F97316;text-decoration:none;font-weight:700;">
                  (21) 97572-3110
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    messageWhatsapp: `Oi {{nome}}!
Você testou o Genius ADS e quero entender sua experiência.
O que faltou para continuar?
🎨 A qualidade do criativo não me convenceu

💰 O preço não faz sentido pra mim agora

🖥️ Não entendi direito como usar

💬 Outra razão
É só responder essa mensagem com sua opção ou me contar com suas palavras — sua resposta vai me ajudar a melhorar o produto.
Qualquer dúvida contate a nossa central de suporte via WhatsApp.

Suporte — Genius ADS

WhatsApp: (21) 97572-3110`,
  },
  {
    key: "plan_renewal",
    label: "Renovação de plano",
    subject: "Seus créditos estão acabando",
    message: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Seus créditos estão acabando</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#F97316;padding:28px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Genius ADS</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#111827;line-height:1.6;">
                Oi <strong>{{nome}}</strong>,
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
                Seus créditos no <strong>Genius ADS</strong> estão acabando.
                Não deixe sua operação de criativos parar.
              </p>

              <!-- Benefits -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px 0;">
                <tr>
                  <td style="padding:20px;background-color:#FFF7ED;border-radius:6px;">
                    <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#111827;">
                      Por que renovar agora?
                    </p>
                    <p style="margin:0 0 8px 0;font-size:14px;color:#374151;line-height:1.6;">
                      ⚡ Gere 20+ criativos em minutos
                    </p>
                    <p style="margin:0 0 8px 0;font-size:14px;color:#374151;line-height:1.6;">
                      🎯 Copy estruturada para conversão em cada geração
                    </p>
                    <p style="margin:0 0 8px 0;font-size:14px;color:#374151;line-height:1.6;">
                      🚀 Valide ofertas até 10x mais rápido
                    </p>
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                      💸 Sem depender de designer ou inspiração
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://adsgenius.com.br/#pricing"
                       style="display:inline-block;background-color:#F97316;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;">
                      Renovar meus créditos agora →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6B7280;line-height:1.6;">
                Qualquer dúvida contate a nossa central de suporte via WhatsApp.
              </p>
              <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:#374151;">
                Suporte — Genius ADS
              </p>
              <p style="margin:0;font-size:13px;color:#374151;">
                WhatsApp:
                <a href="https://wa.me/5521975723110"
                   style="color:#F97316;text-decoration:none;font-weight:700;">
                  (21) 97572-3110
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    messageWhatsapp: `Oi {{nome}}!
Seus créditos no Genius ADS estão acabando. Não deixe sua operação de criativos parar.
Por que renovar agora?

⚡ Gere 20+ criativos em minutos

🎯 Copy estruturada para conversão em cada geração

🚀 Valide ofertas até 10x mais rápido

💸 Sem depender de designer ou inspiração
👉 Renove agora: https://adsgenius.com.br/#pricing
Qualquer dúvida contate a nossa central de suporte via WhatsApp.

Suporte — Genius ADS

WhatsApp: (21) 97572-3110`,
  },
  {
    key: "custom",
    label: "Mensagem customizada",
    subject: "",
    message: "",
  },
] as const;

export type CampaignTemplateKey = (typeof CAMPAIGN_TEMPLATES)[number]["key"];
