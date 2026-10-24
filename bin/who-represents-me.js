#!/usr/bin/env node
// Usage:
//   who-represents-me "300 Hemlock St, Vacaville, CA 95688"
//   who-represents-me --lat 38.3649 --lng -121.9999
//   who-represents-me --json "300 Hemlock St, Vacaville, CA 95688"
import { parseArgs } from "node:util";
import { juricode } from "../src/jurisdictional.js";
import { formatText, representatives } from "../src/represent.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    lat: { type: "string" },
    lng: { type: "string" },
    json: { type: "boolean", default: false },
  },
});

try {
  const data = await juricode({ address: positionals.join(" ") || undefined, lat: values.lat, lng: values.lng });

  console.log(
    values.json
      ? JSON.stringify({ address: data.address ?? null, layers: representatives(data) }, null, 2)
      : formatText(data),
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
