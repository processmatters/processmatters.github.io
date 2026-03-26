import { EmailMessage } from "cloudflare:email";

const ALLOWED_ORIGINS = new Set([
  "https://processmatters.net",
  "https://www.processmatters.net",
]);
const CONTACT_PAGE_URL = "https://processmatters.net/contact.html";
const DEFAULT_THANK_YOU_URL = "https://processmatters.net/thanks.html";
const FROM_EMAIL = "contact@processmatters.net";
const TO_EMAIL = "lsilverberg@processmatters.net";

function getText(formData, key, maxLength) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeHeaderValue(value) {
  return value.replace(/[\r\n]+/g, " ").replace(/"/g, "").trim();
}

function getReplyToHeader(name, email) {
  const safeEmail = sanitizeHeaderValue(email);
  const safeName = sanitizeHeaderValue(name);

  if (!safeName) {
    return safeEmail;
  }

  return `${safeName} <${safeEmail}>`;
}

function normalizeBodyLine(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function getRedirectTarget(nextValue) {
  if (!nextValue) {
    return DEFAULT_THANK_YOU_URL;
  }

  try {
    const candidate = new URL(nextValue);
    if (!ALLOWED_ORIGINS.has(candidate.origin)) {
      return DEFAULT_THANK_YOU_URL;
    }
    return candidate.toString();
  } catch {
    return DEFAULT_THANK_YOU_URL;
  }
}

function buildRawEmail({ name, email, message, request }) {
  const submittedAt = new Date().toISOString();
  const ipAddress = request.headers.get("cf-connecting-ip") || "Unavailable";
  const userAgent = request.headers.get("user-agent") || "Unavailable";

  const headers = [
    `From: ProcessMatters Website <${FROM_EMAIL}>`,
    `To: Lisa Silverberg <${TO_EMAIL}>`,
    `Reply-To: ${getReplyToHeader(name, email)}`,
    "Subject: New message from processmatters.net",
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];

  const body = [
    "New contact form submission from processmatters.net",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    "Message:",
    normalizeBodyLine(message),
    "",
    `IP address: ${ipAddress}`,
    `User agent: ${userAgent}`,
    `Submitted at: ${submittedAt}`,
  ];

  return `${headers.join("\r\n")}\r\n\r\n${body.join("\r\n")}`;
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return Response.redirect(CONTACT_PAGE_URL, 302);
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, POST" },
      });
    }

    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    const formData = await request.formData();

    if (getText(formData, "_honey", 200)) {
      return new Response(null, { status: 204 });
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

    const rawEmail = buildRawEmail({ name, email, message, request });
    const emailMessage = new EmailMessage(FROM_EMAIL, TO_EMAIL, rawEmail);

    try {
      await env.CONTACT_EMAIL.send(emailMessage);
    } catch (error) {
      return new Response(
        `We could not send your message right now. Please email ${TO_EMAIL} directly.`,
        { status: 502 }
      );
    }

    return Response.redirect(getRedirectTarget(next), 303);
  },
};
