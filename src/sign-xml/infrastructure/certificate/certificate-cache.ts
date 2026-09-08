import { getForge } from "../../../utils/forge-loader";
import { ParsedP12Certificate } from "../../domain/interfaces";

/**
 * Caché en memoria del certificado ya descifrado.
 *
 * Descifrar un PKCS#12 real es caro a propósito: la derivación de clave por
 * contraseña corre miles de iteraciones, y en node-forge eso es JavaScript
 * puro. Medido con un certificado de producción en un VPS: ~320 ms por
 * descifrado, y `signXml` lo hacía DOS veces por comprobante (validar y luego
 * leer). A 120 facturas por minuto era más de un hilo entero de Node solo
 * volviendo a leer el mismo archivo.
 *
 * Con esto el mismo certificado se descifra una vez por proceso y las firmas
 * siguientes solo pagan el RSA. La clave de caché es un hash del P12 y de la
 * contraseña juntos, así que una contraseña equivocada nunca reutiliza un
 * certificado abierto con la correcta, y un certificado renovado (bytes
 * distintos) entra como nuevo. Solo se guardan aperturas exitosas.
 */
export interface CachedCertificate {
  certData: ParsedP12Certificate;
  /** Clave privada en PEM para firmar con el crypto nativo de Node. */
  privateKeyPem?: string;
}

/**
 * Tope por omisión para que un proceso que firma para muchos emisores no
 * crezca sin fin. No limita cuántos emisores pueden firmar: al pasarse, sale
 * el que lleva más tiempo sin usarse y, si vuelve, se descifra otra vez.
 * Cada entrada pesa unos pocos KB.
 */
export const CERTIFICATE_CACHE_MAX_ENTRIES = 64;

/**
 * Tope vigente: `OSODREAMER_CERT_CACHE_MAX` en el entorno (entero ≥ 1) o el
 * valor por omisión. Se lee en cada inserción para que quien nos usa lo
 * ajuste por ambiente desde su `.env`, sin republicar la librería.
 */
export function certificateCacheMaxEntries(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env?.OSODREAMER_CERT_CACHE_MAX
      : undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : CERTIFICATE_CACHE_MAX_ENTRIES;
}

const cache = new Map<string, CachedCertificate>();

export async function certificateCacheKey(
  p12Buffer: Uint8Array,
  password: string
): Promise<string> {
  const forge = await getForge();
  const md = forge.md.sha256.create();
  md.update(forge.util.binary.raw.encode(new Uint8Array(p12Buffer)));
  md.update(":" + password, "utf8");
  return md.digest().toHex();
}

export function getCachedCertificate(key: string): CachedCertificate | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  // Reinsertar lo mueve al final: el más usado es el último en salir.
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

export function setCachedCertificate(key: string, entry: CachedCertificate): void {
  cache.set(key, entry);
  const max = certificateCacheMaxEntries();
  while (cache.size > max) {
    cache.delete(cache.keys().next().value);
  }
}

/**
 * Vacía la caché. Útil en pruebas y si un proceso de larga vida quiere soltar
 * certificados que ya no usa (por ejemplo tras rotar el P12 de un emisor).
 */
export function clearCertificateCache(): void {
  cache.clear();
}

export function certificateCacheSize(): number {
  return cache.size;
}
