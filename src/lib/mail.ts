import nodemailer from "nodemailer";

// Transactional email via Yandex Cloud Postbox (SMTP). Credentials come from env
// (synced to the box .env by the deploy workflow). If they're absent, mailEnabled
// is false and the email-login routes return "disabled" — the feature just stays
// hidden until it's configured.
const HOST = process.env.YC_SMTP_HOST || "postbox.cloud.yandex.net";
const PORT = Number(process.env.YC_SMTP_PORT || 587);
const USER = process.env.YC_SMTP_USER || "";
const PASS = process.env.YC_SMTP_PASS || "";
const FROM = process.env.MAIL_FROM || "inApp <no-reply@inapp.pro>";

export const mailEnabled = Boolean(USER && PASS);

let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: USER, pass: PASS },
    });
  }
  return transport;
}

// Magic-link sign-in email — plain, friendly, one clear action.
export async function sendMagicLink(to: string, url: string): Promise<void> {
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b0d;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:440px;background:#16161a;border:1px solid #26262c;border-radius:20px;padding:32px;">
      <tr><td>
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">inApp</div>
        <h1 style="margin:20px 0 8px;font-size:20px;color:#fff;font-weight:700;">Вход в inApp</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#b6b6bd;">Нажмите кнопку, чтобы войти. Ссылка действует 15 минут.</p>
        <a href="${url}" style="display:inline-block;background:#ff7a1a;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:999px;">Войти в inApp</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#76767e;">Если кнопка не работает, скопируйте ссылку:<br><span style="color:#9a9aa4;word-break:break-all;">${url}</span></p>
        <p style="margin:16px 0 0;font-size:12px;color:#76767e;">Если вы не запрашивали вход — просто проигнорируйте письмо.</p>
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
  await getTransport().sendMail({
    from: FROM,
    to,
    subject: "Вход в inApp",
    text: `Откройте ссылку, чтобы войти в inApp (действует 15 минут):\n${url}\n\nЕсли вы не запрашивали вход — проигнорируйте письмо.`,
    html,
  });
}
