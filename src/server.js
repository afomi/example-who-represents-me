import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { juricode } from "./jurisdictional.js";
import { formatText, representatives } from "./represent.js";

// Twilio caps a single reply message at 1,600 characters.
const SMS_MAX_LENGTH = 1600;

const page = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

// Routes:
//   GET  /                         the chat page
//   GET  /api/represent?address=…  JSON (also lat & lng)
//   POST /sms                      a Twilio Messaging webhook: the text is the address
export function app({ lookup = juricode } = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    try {
      if (request.method === "GET" && url.pathname === "/") {
        return send(response, 200, "text/html; charset=utf-8", page);
      }

      if (request.method === "GET" && url.pathname === "/api/represent") {
        const data = await lookup(query(url.searchParams));
        const body = { address: data.address ?? null, layers: representatives(data), text: formatText(data) };
        return send(response, 200, "application/json", JSON.stringify(body));
      }

      if (request.method === "POST" && url.pathname === "/sms") {
        const form = new URLSearchParams(await readBody(request));
        const address = (form.get("Body") ?? "").trim();
        const reply = address
          ? formatText(await lookup({ address }), { maxLength: SMS_MAX_LENGTH })
          : "Text a U.S. street address to see who represents it.";
        return send(response, 200, "text/xml", twiml(reply));
      }

      return send(response, 404, "application/json", JSON.stringify({ error: "Not found" }));
    } catch (error) {
      if (url.pathname === "/sms") {
        return send(response, 200, "text/xml", twiml(error.message));
      }
      return send(response, 422, "application/json", JSON.stringify({ error: error.message }));
    }
  });
}

function query(params) {
  return {
    address: params.get("address")?.trim() || undefined,
    lat: params.get("lat") ?? undefined,
    lng: params.get("lng") ?? undefined,
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType });
  response.end(body);
}

function twiml(message) {
  const escaped = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  app().listen(port, () => console.log(`Listening on http://localhost:${port}`));
}
