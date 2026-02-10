import { createClient } from "npm:@supabase/supabase-js@2";

export interface EmailRequest {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface EmailResponse {
  success: boolean;
  id?: string;
  error?: string;
}

async function getEmailProvider(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_provider")
    .maybeSingle();

  return data?.value || "resend";
}

async function sendViaResend(params: EmailRequest): Promise<EmailResponse> {
  const { Resend } = await import("npm:resend@2.0.0");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(resendApiKey);
  const payload: any = {
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  };
  if (params.attachments) {
    payload.attachments = params.attachments;
  }

  const response = await resend.emails.send(payload);
  return { success: true, id: response.data?.id };
}

async function sendViaMaileroo(params: EmailRequest): Promise<EmailResponse> {
  const mailerooApiKey = Deno.env.get("MAILEROO_API_KEY");
  if (!mailerooApiKey) {
    return { success: false, error: "MAILEROO_API_KEY not configured" };
  }

  // Parse "Name <email>" format
  const fromMatch = params.from.match(/^(.+)\s<(.+)>$/);
  const fromAddress = fromMatch ? fromMatch[2] : params.from;
  const fromName = fromMatch ? fromMatch[1] : undefined;

  const body: any = {
    from: { address: fromAddress, ...(fromName ? { name: fromName } : {}) },
    to: params.to.map(email => ({ address: email })),
    subject: params.subject,
    html: params.html,
  };

  if (params.attachments && params.attachments.length > 0) {
    body.attachments = params.attachments.map(a => ({
      file_name: a.filename,
      content: a.content,
      content_type: a.filename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
    }));
  }

  const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": mailerooApiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: `Maileroo error [${response.status}]: ${JSON.stringify(data)}` };
  }

  return { success: true, id: data.data?.reference_id };
}

export async function sendEmail(params: EmailRequest): Promise<EmailResponse> {
  const provider = await getEmailProvider();
  console.log(`Sending email via ${provider} to ${params.to.join(", ")}`);

  if (provider === "maileroo") {
    return sendViaMaileroo(params);
  }
  return sendViaResend(params);
}
