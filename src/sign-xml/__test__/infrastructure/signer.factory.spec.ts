import * as forge from "node-forge";
import { createRsaSha1Signer } from "../../infrastructure/signer.factory";
import { ForgeRsaSha1Signer } from "../../infrastructure/forge-rsa-sha1-signer.implementation";
import { NodeRsaSha1Signer } from "../../infrastructure/node-rsa-sha1-signer.implementation";
import { resetNodeCryptoLoader } from "../../../utils/node-crypto-loader";

describe("createRsaSha1Signer", () => {
  const keypair = forge.pki.rsa.generateKeyPair(512);
  const certData = { privateKey: keypair.privateKey } as any;
  const pem = forge.pki.privateKeyToPem(keypair.privateKey);

  afterEach(() => {
    delete process.env.OSODREAMER_SIGNER_RSA;
    resetNodeCryptoLoader();
  });

  it("en Node, con PEM, firma con el crypto nativo", async () => {
    const signer = await createRsaSha1Signer(certData, pem);
    expect(signer).toBeInstanceOf(NodeRsaSha1Signer);
  });

  it("sin PEM cae a forge", async () => {
    const signer = await createRsaSha1Signer(certData, undefined);
    expect(signer).toBeInstanceOf(ForgeRsaSha1Signer);
  });

  it("OSODREAMER_SIGNER_RSA=forge obliga a forge aunque haya crypto nativo", async () => {
    process.env.OSODREAMER_SIGNER_RSA = "forge";
    const signer = await createRsaSha1Signer(certData, pem);
    expect(signer).toBeInstanceOf(ForgeRsaSha1Signer);
  });

  it("los dos firmadores dan la misma firma para el mismo SignedInfo", async () => {
    const nativo = await createRsaSha1Signer(certData, pem);
    process.env.OSODREAMER_SIGNER_RSA = "forge";
    const conForge = await createRsaSha1Signer(certData, pem);

    const input = "<ds:SignedInfo>x</ds:SignedInfo>";
    expect(nativo.signSha1RsaBase64(input)).toBe(conForge.signSha1RsaBase64(input));
  });
});
