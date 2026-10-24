import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatText, representatives } from "../src/represent.js";
import { app } from "../src/server.js";

// A recorded GET /api/v1/juricode?address=300 Hemlock St, Vacaville, CA 95688&include=seats
const { data } = JSON.parse(await readFile(new URL("fixtures/vacaville.json", import.meta.url), "utf8"));

test("a resident sees each governing layer with its bodies and seat holders", () => {
  const layers = representatives(data);
  const city = layers.find((layer) => layer.name === "City of Vacaville");
  const council = city.bodies.find((body) => body.name === "Vacaville City Council");

  assert.deepEqual(council.seats[0], { id: 1, label: "Mayor", holder: "John Carli" });
  assert.ok(layers.some((layer) => layer.name === "Congressional District 4"));
});

test("layers with no seats on file are left out, not shown empty", () => {
  assert.ok(!representatives(data).some((layer) => layer.name === "Solano"));
});

test("an open seat says so instead of showing a blank", () => {
  const text = formatText(data);

  assert.match(text, /- Mayor: John Carli/);
  assert.match(text, /- Parks & Recreation Commissioner, Seat 3: open \(no holder on file\)/);
});

test("the most local layer comes first", () => {
  const text = formatText(data);
  assert.ok(text.indexOf("City of Vacaville") < text.indexOf("United States Senate"));
});

test("an SMS reply fits the limit and counts the seats it left out", () => {
  const text = formatText(data, { maxLength: 300 });

  assert.ok(text.length <= 300, `was ${text.length} characters`);
  assert.match(text, /…and \d+ more seats\.$/);
});

test("a location with no seats on file says so", () => {
  const text = formatText({ address: "1 Nowhere Rd", jurisdictions: [] });
  assert.equal(text, "1 Nowhere Rd\n\nNo seats on file for this location yet.");
});

test("texting an address to /sms replies with TwiML", async (t) => {
  const server = app({ lookup: async ({ address }) => ({ ...data, address }) }).listen(0);
  t.after(() => server.close());

  const response = await fetch(`http://localhost:${server.address().port}/sms`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ Body: "300 Hemlock St, Vacaville, CA 95688", From: "+15555550100" }),
  });
  const body = await response.text();

  assert.equal(response.headers.get("content-type"), "text/xml");
  assert.match(body, /^<\?xml.*<Response><Message>300 Hemlock St, Vacaville, CA 95688\n\nVacaville Unified School District/s);
  assert.match(body, /Parks &amp; Recreation Commission/);
  assert.ok(body.length < 1800);
});

test("an address the API cannot match comes back as the API's message", async (t) => {
  const server = app({
    lookup: async () => {
      throw new Error("No match for that address.");
    },
  }).listen(0);
  t.after(() => server.close());

  const response = await fetch(`http://localhost:${server.address().port}/api/represent?address=zzz`);

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "No match for that address." });
});
