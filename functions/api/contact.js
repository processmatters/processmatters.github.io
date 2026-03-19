const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/lsilverberg@processmatters.net";
const MAILCHANNELS_ENDPOINT = "https://api.mailchannels.net/tx/v1/send";

function getText(formData, key, maxLength) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.slice(0, maxLength);
}

function getRedirectTarget(request, nextValue) {
  const requestUrl = new URL(request.url);
  const fallback = new URL("/thanks.html", requestUrl.origin);

  if (!nextValue) {
    return fallback.toString();
  }

  try {
    const candidate = new URL(nextValue, requestUrl.origin);
    if (candidate.origin !== requestUrl.origin) {
      return fallback.toString();
    }
    return candidate.toString();
  } catch {
    return fallback.toString();
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildMailChannelsPayload({ fromEmail, toEmail, name, email, message, request }) {
  const submittedAt = new Date().toISOString();
  const ipAddress = request.headers.get("cf-connecting-ip") || "Unavailable";
  const userAgent = request.headers.get("user-agent") || "Unavailable";

  const textBody = [
    "New contact form submission from processmatters.net",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
    "",
    `IP address: ${ipAddress}`,
    `User agent: ${userAgent}`,
    `Submitted at: ${submittedAt}`,
  ].join("\n");

  const htmlBody = `
    <h1>New contact form submission</h1>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
    <hr>
    <p><strong>IP address:</strong> ${escapeHtml(ipAddress)}</p>
    <p><strong>User agent:</strong> ${escapeHtml(userAgent)}</p>
    <p><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</p>
  `;

  return {
    personalizations: [
      {
        to: [{ email: toEmail }],
      },
    ],
    from: {
      email: fromEmail,
      name: "ProcessMatters Website",
    },
    reply_to: {
      email,
      name,
    },
    subject: "New message from processmatters.net",
    content: [
      {
        type: "text/plain",
        value: textBody,
      },
      {
        type: "text/html",
        value: htmlBody,
      },
    ],
  };
}

export async function onRequestGet(context) {
  const contactUrl = new URL("/contact.html", context.request.url);
  return Response.redirect(contactUrl.toString(), 302);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);

  if (origin && origin !== requestUrl.origin) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();

  if (getText(formData, "_honey", 200)) {
    return new Response(null, { status: 204 });
  }

  if (!env.MAILCHANNELS_API_KEY) {
    return Response.redirect(FORMSUBMIT_ENDPOINT, 307);
  }

  const name = getText(formData, "name", 200);
  const email = getText(formData, "email", 320);
  const message = getText(formData, "message", 5000);
  const next = getText(formData, "_next", 500);

  if (!name || !email || !message) {
    return new Response("Missing required fields", { status: 400 });
  }

  if (!isValidEmail(email)) {
    return new Response("Invalid email address", { status: 400 });
  }

  const payload = buildMailChannelsPayload({
    fromEmail: env.CONTACT_FROM_EMAIL || "contact@processmatters.net",
    toEmail: env.CONTACT_TO_EMAIL || "lsilverberg@processmatters.net",
    name,
    email,
    message,
    request,
  });

  const response = await fetch(MAILCHANNELS_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.MAILCHANNELS_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MailChannels request failed", response.status, errorText);
    return new Response(
      "We could not send your message right now. Please email lsilverberg@processmatters.net.",
      { status: 502 }
    );
  }

  return Response.redirect(getRedirectTarget(request, next), 303);
}
