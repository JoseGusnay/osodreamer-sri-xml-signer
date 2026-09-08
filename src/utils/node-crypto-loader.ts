/**
 * Carga perezosa del módulo `crypto` de Node, si existe.
 *
 * La firma RSA-SHA1 con node-forge corre en JavaScript puro y cuesta decenas
 * de milisegundos por comprobante; `crypto.createSign` de Node hace lo mismo
 * en OpenSSL en menos de un milisegundo y produce exactamente los mismos bytes
 * (PKCS#1 v1.5, determinista). En un navegador no hay `crypto.createSign`, y
 * ahí la librería sigue firmando con forge: por eso se carga con tolerancia a
 * fallo y nunca se importa de forma estática.
 */
export interface NodeCryptoSigner {
  update(data: string, encoding: "utf8"): unknown;
  sign(privateKeyPem: string, encoding: "base64"): string;
}

export interface NodeCryptoLike {
  createSign(algorithm: string): NodeCryptoSigner;
}

// undefined = todavía no se intentó; null = no está disponible.
let instance: NodeCryptoLike | null | undefined;

export async function getNodeCrypto(): Promise<NodeCryptoLike | null> {
  if (instance !== undefined) return instance;
  instance = null;

  try {
    if (typeof require !== "undefined") {
      const mod = require("crypto");
      if (typeof mod?.createSign === "function") {
        instance = mod;
        return instance;
      }
    }
  } catch {
    // Sin require (ESM puro): se intenta con import dinámico.
  }

  try {
    const mod: any = await import("crypto");
    const candidate = mod?.default ?? mod;
    if (typeof candidate?.createSign === "function") instance = candidate;
  } catch {
    // Navegador u otro entorno sin crypto de Node: se queda en null.
  }

  return instance;
}

/** Solo para pruebas: obliga a volver a detectar el módulo. */
export function resetNodeCryptoLoader(): void {
  instance = undefined;
}
