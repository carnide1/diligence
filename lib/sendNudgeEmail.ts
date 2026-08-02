import { Resend } from "resend";

export async function sendNudgeEmail(args: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM are required to send mail.");
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
  });
  if (error) {
    throw new Error(error.message || "Resend send failed");
  }
}
