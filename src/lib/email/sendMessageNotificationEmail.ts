type MessageNotificationPayload = {
  to: string;
  conversationUrl: string;
};

type EmailResult = {
  delivered: boolean;
  skipped?: boolean;
  error?: string;
};

export async function sendMessageNotificationEmail({
  to,
  conversationUrl,
}: MessageNotificationPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("Message email skipped (no provider configured)", {
        to,
        conversationUrl,
      });
    }
    return { delivered: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "New message on Vuxsy",
        text:
          "You have received a new message on Vuxsy. Log in to your account to reply.",
        html: `You have received a new message on Vuxsy. <a href=\"${conversationUrl}\">Log in to your account</a> to reply.`,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn("Message notification email failed", {
        status: response.status,
        message,
      });
      return { delivered: false, error: message };
    }

    return { delivered: true };
  } catch (error) {
    console.error("Message notification email error", error);
    return { delivered: false, error: (error as Error).message };
  }
}
