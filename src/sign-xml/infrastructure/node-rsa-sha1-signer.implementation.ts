import { SignerPort } from "../domain/ports";
import { NodeCryptoLike } from "../../utils/node-crypto-loader";

/**
 * Firma RSA-SHA1 con el `crypto` nativo de Node (OpenSSL).
 *
 * Produce exactamente los mismos bytes que `ForgeRsaSha1Signer` (PKCS#1
 * v1.5 es determinista), pero en menos de un milisegundo en vez de decenas.
 * La prueba `node-rsa-sha1-signer.spec.ts` compara las dos salidas byte a
 * byte para que esa equivalencia no se pierda por accidente.
 */
export class NodeRsaSha1Signer implements SignerPort {
  constructor(
    private readonly privateKeyPem: string,
    private readonly crypto: NodeCryptoLike
  ) {}

  signSha1RsaBase64(input: string): string {
    const signer = this.crypto.createSign("RSA-SHA1");
    signer.update(input, "utf8");
    const base64Signature = signer.sign(this.privateKeyPem, "base64");

    // Mismo formato que forge: líneas de 76 caracteres, como pide XAdES.
    return base64Signature.match(/.{1,76}/g)?.join("\n") ?? base64Signature;
  }
}
