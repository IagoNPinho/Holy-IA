const { get, all } = require("../database/db");

function parseWorkingHours(text) {
  if (!text) return { start: "08:00", end: "18:00" };
  const match = text.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return { start: "08:00", end: "18:00" };
  const start = match[1].padStart(5, "0");
  const end = match[2].padStart(5, "0");
  return { start, end };
}

function toMinutes(time) {
  const [h, m] = time.split(":").map((v) => Number.parseInt(v, 10));
  return h * 60 + (m || 0);
}

function toTime(minutes) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

async function getAvailableSlots(date) {
  const settings = await get("SELECT working_hours FROM clinic_settings WHERE id = 1");
  const { start, end } = parseWorkingHours(settings?.working_hours || "");
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);

  const rows = await all(
    `
    SELECT appointment_time
    FROM appointments
    WHERE appointment_date = ?
    `,
    [date]
  );
  const occupied = new Set(
    rows
      .map((row) => (row.appointment_time || "").slice(0, 5))
      .filter((value) => value)
  );

  const slots = [];
  for (let t = startMin; t < endMin; t += 60) {
    const slot = toTime(t);
    if (!occupied.has(slot)) slots.push(slot);
  }

  return slots.slice(0, 3);
}

module.exports = {
  getAvailableSlots,
};
