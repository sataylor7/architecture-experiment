import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM!;

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your login code',
    text: `Your login code is: ${code}\n\nThis code expires in 15 minutes. Do not share it.`,
  });
}
