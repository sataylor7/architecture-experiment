import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM ?? 'noreply@localhost';

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // Email service not configured — code is logged to console in dev (see auth.service.ts)
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your login code',
    text: `Your login code is: ${code}\n\nThis code expires in 15 minutes. Do not share it.`,
  });
}
