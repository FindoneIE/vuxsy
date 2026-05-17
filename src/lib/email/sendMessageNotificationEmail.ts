import nodemailer from "nodemailer";

type MessageNotificationPayload = {
  to: string;
  conversationUrl: string;
  senderDisplayName: string;
  listingTitle: string;
  listingUrl?: string | null;
  listingLocation?: string | null;
  listingPrice?: string | null;
  listingImageUrl?: string | null;
  messagePreview: string;
  messageSentAt?: string | null;
};

type EmailResult = {
  delivered: boolean;
  skipped?: boolean;
  reason?:
    | "missing_smtp_config"
    | "smtp_send_failed"
    | "smtp_send_succeeded";
  error?: string;
};

export async function sendMessageNotificationEmail({
  to,
  conversationUrl,
  senderDisplayName,
  listingTitle,
  listingUrl,
  listingLocation,
  listingPrice,
  listingImageUrl,
  messagePreview,
  messageSentAt,
}: MessageNotificationPayload): Promise<EmailResult> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPortRaw = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const replyTo = process.env.SMTP_REPLY_TO;

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const normalizedSenderName = senderDisplayName.trim();
  const visibleSenderName =
    normalizedSenderName && !normalizedSenderName.includes("@")
      ? normalizedSenderName
      : "User";
  const safeSender = escapeHtml(visibleSenderName);
  const safeListingTitle = escapeHtml(listingTitle);
  const safeListingLocation = listingLocation ? escapeHtml(listingLocation) : null;
  const safeListingPrice = listingPrice ? escapeHtml(listingPrice) : null;
  const safeListingImageUrl = listingImageUrl ? escapeHtml(listingImageUrl) : null;
  const safePreview = escapeHtml(messagePreview);
  const safeConversationUrl = escapeHtml(conversationUrl);
  // Only allow absolute http(s) URLs for the listing link to keep emails safe
  // and ensure links open the live site (never a relative or javascript: URL).
  const isAbsoluteHttpUrl = (value: string | null | undefined): value is string =>
    typeof value === "string" && /^https?:\/\//i.test(value);
  const safeListingUrl = isAbsoluteHttpUrl(listingUrl) ? escapeHtml(listingUrl) : null;
  const preheaderText = `New message from ${visibleSenderName} about ${listingTitle}`;
  const safePreheaderText = escapeHtml(preheaderText);
  const preheaderSpacer = Array.from({ length: 36 }, () => "&#8204;&nbsp;").join("");
  const sentAt = messageSentAt ? new Date(messageSentAt) : new Date();
  const sentAtLabel = Number.isNaN(sentAt.getTime())
    ? "Just now"
    : new Intl.DateTimeFormat("en-IE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(sentAt);
  const safeSentAtLabel = escapeHtml(sentAtLabel);
  const listingImageCell = safeListingImageUrl
    ? `<img src="${safeListingImageUrl}" alt="Listing image" width="112" height="112" style="display:block;width:112px;height:112px;object-fit:cover;border-radius:8px;border:0;outline:none;text-decoration:none;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="112" height="112" style="width:112px;height:112px;background:#f8fafc;border-radius:8px;"><tr><td align="center" valign="middle" style="font-size:11px;color:#94a3b8;font-family:Arial,sans-serif;">No image</td></tr></table>`;
  const listingImageContent = safeListingUrl
    ? `<a href="${safeListingUrl}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:inherit;line-height:0;">${listingImageCell}</a>`
    : listingImageCell;
  const listingTitleContent = safeListingUrl
    ? `<a href="${safeListingUrl}" target="_blank" rel="noopener" style="color:#0f172a;text-decoration:none;">${safeListingTitle}</a>`
    : safeListingTitle;

  const textBody = [
    "You have a new message",
    "",
    "You received a new chat message about this listing.",
    `Listing: ${listingTitle}`,
    safeListingUrl ? `View listing: ${listingUrl}` : null,
    listingPrice ? `Price: ${listingPrice}` : null,
    listingLocation ? `Location: ${listingLocation}` : null,
  `From: ${visibleSenderName}`,
    `Message: ${messagePreview}`,
    `Sent: ${sentAtLabel}`,
    "",
    `Reply Now: ${conversationUrl}`,
    "",
  "For your safety, keep communication inside Vuxsy chat.",
    "",
    "Vuxsy",
    "Vuxsy, Ireland",
    "© 2026 Vuxsy. All rights reserved.",
    "Legal | Privacy",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;visibility:hidden;line-height:1px;font-size:1px;color:transparent;">
    ${safePreheaderText}${preheaderSpacer}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#f5f7fb;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:16px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e6ebf2;border-radius:8px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <tr>
            <td style="padding:24px 24px 16px 24px;border-bottom:1px solid #f1f5f9;font-size:22px;line-height:1.2;font-weight:700;color:#0f172a;">Vuxsy</td>
          </tr>
          <tr>
            <td style="padding:24px 24px 0 24px;">
              <h1 style="margin:0;font-size:26px;line-height:1.15;color:#0f172a;font-weight:700;letter-spacing:-0.2px;">You have a new message</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px 24px;font-size:15px;line-height:1.6;color:#526074;">You received a new chat message about this listing.</td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #e6ebf2;border-radius:8px;background:#ffffff;">
                <tr>
                  <td width="128" valign="middle" style="width:128px;vertical-align:middle;padding:8px;border-right:1px solid #eef2f7;">${listingImageContent}</td>
                  <td valign="top" style="padding:12px 14px 12px 12px;vertical-align:top;">
                    <div style="margin:0 0 8px 0;font-size:16px;line-height:1.35;font-weight:700;color:#0f172a;word-break:break-word;max-height:2.7em;overflow:hidden;">${listingTitleContent}</div>
                    ${safeListingPrice ? `<p style="margin:0 0 6px 0;font-size:15px;line-height:1.35;font-weight:700;color:#0f172a;">${safeListingPrice}</p>` : ""}
                    ${safeListingLocation ? `<p style="margin:0;font-size:13px;line-height:1.4;color:#64748b;">${safeListingLocation}</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #e8edf3;border-radius:8px;background:#f8fafc;">
                <tr>
                  <td width="48" valign="middle" style="padding:8px 0 8px 8px;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="32" height="32" style="width:32px;height:32px;border-radius:9999px;background:#eef2f7;border:1px solid #dbe3ee;">
                      <tr>
                        <td align="center" valign="middle" style="padding:0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="16" style="width:16px;">
                            <tr>
                              <td align="center" style="padding:0 0 2px 0;">
                                <span style="display:block;width:8px;height:8px;border-radius:9999px;background:#94a3b8;line-height:8px;font-size:0;">&nbsp;</span>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding:0;">
                                <span style="display:block;width:14px;height:6px;border-radius:6px 6px 4px 4px;background:#94a3b8;line-height:6px;font-size:0;">&nbsp;</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:8px;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                      <tr>
                        <td style="font-size:13px;line-height:1.25;color:#475569;font-weight:600;vertical-align:top;padding-top:1px;">${safeSender}</td>
                        <td align="right" style="font-size:10px;line-height:1.25;color:#c1cad6;white-space:nowrap;padding-left:8px;vertical-align:top;padding-top:1px;">${safeSentAtLabel}</td>
                      </tr>
                    </table>
                    <div style="display:inline-block;max-width:100%;margin-top:4px;background:#ffffff;border:1px solid #e6ebf2;border-radius:8px;">
                      <div style="padding:7px 8px;font-size:12px;line-height:1.35;color:#334155;white-space:pre-wrap;max-height:64px;overflow:hidden;word-break:break-word;">${safePreview}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:0 24px 24px 24px;">
              <a href="${safeConversationUrl}" style="display:block;width:100%;height:44px;box-sizing:border-box;text-align:center;background:#34579B;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:44px;padding:0 16px;border-radius:8px;border:1px solid #2f4f8d;">Reply Now</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #fde8b1;background:#fffdf5;border-radius:8px;">
                <tr>
                  <td style="padding:16px;font-size:12px;line-height:1.6;color:#92400e;">For your safety, keep communication inside Vuxsy chat.</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 14px 24px;border-top:1px solid #f1f5f9;font-size:10px;line-height:1.45;color:#b7c0cd;">
              <div style="font-weight:500;color:#a8b3c2;">Vuxsy, Ireland</div>
              <div style="margin-top:4px;">© 2026 Vuxsy. All rights reserved.</div>
              <div style="margin-top:4px;">Legal&nbsp;&nbsp;|&nbsp;&nbsp;Privacy</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const smtpPort = Number.parseInt(smtpPortRaw ?? "", 10);

  if (
    !smtpHost ||
    !smtpUser ||
    !smtpPass ||
    !from ||
    !replyTo ||
    !Number.isFinite(smtpPort)
  ) {
    if (process.env.NODE_ENV === "development") {
      console.info("Message email skipped (SMTP provider not configured)", {
        to,
        conversationUrl,
      });
    }
    return { delivered: false, skipped: true, reason: "missing_smtp_config" };
  }

  const subject = "New message on Vuxsy";

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      replyTo,
      subject,
      text: textBody,
      html: htmlBody,
    });

    return {
      delivered: true,
      reason: "smtp_send_succeeded",
    };
  } catch (error) {
    console.error("Message notification email error", error);

    const err = error as Error;

    return {
      delivered: false,
      reason: "smtp_send_failed",
      error: err.message,
    };
  }
}
