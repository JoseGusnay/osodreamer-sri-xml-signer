import { ClockPort } from "../../domain/ports";

export class ClockImplement implements ClockPort {
  nowISO(): string {
    // Ecuador es siempre UTC-5 (sin DST).
    // Usamos getUTC* para que el resultado sea independiente del timezone del servidor.
    const utcMs = Date.now();
    const ecuadorMs = utcMs - 5 * 60 * 60 * 1000;
    const d = new Date(ecuadorMs);

    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    const s = String(d.getUTCSeconds()).padStart(2, "0");

    return `${y}-${mo}-${day}T${h}:${mi}:${s}-05:00`;
  }
}
