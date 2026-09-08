import * as forge from "node-forge";
import * as nodeCrypto from "crypto";
import { ForgeRsaSha1Signer } from "../../infrastructure/forge-rsa-sha1-signer.implementation";
import { NodeRsaSha1Signer } from "../../infrastructure/node-rsa-sha1-signer.implementation";

describe("NodeRsaSha1Signer", () => {
  let privateKey: forge.pki.rsa.PrivateKey;
  let privateKeyPem: string;

  beforeAll(() => {
    const keypair = forge.pki.rsa.generateKeyPair(1024);
    privateKey = keypair.privateKey;
    privateKeyPem = forge.pki.privateKeyToPem(privateKey);
  });

  it("produce exactamente la misma firma que forge (PKCS#1 v1.5 es determinista)", () => {
    const input =
      '<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature-SignedInfo123">áéíóú ñ</ds:SignedInfo>';

    const conForge = new ForgeRsaSha1Signer(privateKey).signSha1RsaBase64(input);
    const conNode = new NodeRsaSha1Signer(privateKeyPem, nodeCrypto).signSha1RsaBase64(input);

    expect(conNode).toBe(conForge);
  });

  it("parte la firma en líneas de máximo 76 caracteres, como forge", () => {
    const result = new NodeRsaSha1Signer(privateKeyPem, nodeCrypto).signSha1RsaBase64("dato");
    const lines = result.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= 76)).toBe(true);
    expect(result).toMatch(/^[A-Za-z0-9+/=\n]+$/);
  });

  it("la firma verifica con la clave pública", () => {
    const input = "contenido a firmar";
    const firma = new NodeRsaSha1Signer(privateKeyPem, nodeCrypto)
      .signSha1RsaBase64(input)
      .replace(/\n/g, "");
    const publicKeyPem = forge.pki.publicKeyToPem(
      forge.pki.setRsaPublicKey(privateKey.n, privateKey.e)
    );

    const verifier = nodeCrypto.createVerify("RSA-SHA1");
    verifier.update(input, "utf8");
    expect(verifier.verify(publicKeyPem, firma, "base64")).toBe(true);
  });
});
