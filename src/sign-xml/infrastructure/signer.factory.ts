import * as forge from "node-forge";
import { ParsedP12Certificate } from "../domain/interfaces";
import { SignerPort } from "../domain/ports";
import { getNodeCrypto } from "../../utils/node-crypto-loader";
import { ForgeRsaSha1Signer } from "./forge-rsa-sha1-signer.implementation";
import { NodeRsaSha1Signer } from "./node-rsa-sha1-signer.implementation";

/**
 * Elige con qué firmar el SignedInfo: el crypto nativo de Node cuando existe
 * (rápido) y forge en cualquier otro caso (navegador, o sin PEM disponible).
 *
 * `OSODREAMER_SIGNER_RSA=forge` obliga a usar forge aunque haya crypto
 * nativo: sirve para comparar salidas o aislar un problema sin recompilar.
 */
export async function createRsaSha1Signer(
  certData: ParsedP12Certificate,
  privateKeyPem?: string
): Promise<SignerPort> {
  if (privateKeyPem && !forgeForzado()) {
    const nodeCrypto = await getNodeCrypto();
    if (nodeCrypto) return new NodeRsaSha1Signer(privateKeyPem, nodeCrypto);
  }
  return new ForgeRsaSha1Signer(certData.privateKey as forge.pki.rsa.PrivateKey);
}

function forgeForzado(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env?.OSODREAMER_SIGNER_RSA === "forge"
  );
}
