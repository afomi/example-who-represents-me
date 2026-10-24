// Turns a juricode response into "who represents me": each governing layer,
// its bodies, and the seats on them that represent the point, with holders.

export function representatives(data) {
  return data.jurisdictions
    .filter((jurisdiction) => jurisdiction.seats.length > 0)
    .map((jurisdiction) => ({
      id: jurisdiction.id,
      name: jurisdiction.display_name ?? jurisdiction.name,
      level: jurisdiction.level,
      bodies: groupByBody(jurisdiction.seats),
    }));
}

function groupByBody(seats) {
  const bodies = new Map();

  for (const seat of seats) {
    if (!bodies.has(seat.body.id)) {
      bodies.set(seat.body.id, { id: seat.body.id, name: seat.body.name, seats: [] });
    }

    bodies.get(seat.body.id).seats.push({
      id: seat.id,
      label: seat.label,
      holder: seat.holder?.full_name ?? null,
    });
  }

  return [...bodies.values()];
}

// Plain text, one seat per line, most local layer first (the API lists federal
// first). With maxLength (an SMS reply), whole lines are kept until the next
// would not fit, and the rest are counted, never cut mid-line.
export function formatText(data, { maxLength = Infinity } = {}) {
  const lines = [];

  if (data.address) lines.push(data.address);

  for (const layer of representatives(data).reverse()) {
    lines.push("", layer.name);

    for (const body of layer.bodies) {
      lines.push(`${body.name}:`);

      for (const seat of body.seats) {
        lines.push(`- ${seat.label}: ${seat.holder ?? "open (no holder on file)"}`);
      }
    }
  }

  if (lines.length === (data.address ? 1 : 0)) {
    lines.push("", "No seats on file for this location yet.");
  }

  return truncate(lines, maxLength);
}

function truncate(lines, maxLength) {
  const text = lines.join("\n");
  if (text.length <= maxLength) return text;

  const kept = [];
  let length = 0;

  for (const [index, line] of lines.entries()) {
    const remaining = lines.slice(index).filter((l) => l.startsWith("- ")).length;
    const more = `\n…and ${remaining} more seats.`;

    if (length + line.length + 1 + more.length > maxLength) {
      return kept.join("\n") + more;
    }

    kept.push(line);
    length += line.length + 1;
  }

  return kept.join("\n");
}
