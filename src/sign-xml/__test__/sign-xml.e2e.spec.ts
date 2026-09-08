import * as forge from "node-forge";
import { signXml } from "../sign-xml";
import { clearCertificateCache } from "../infrastructure/certificate/certificate-cache";
import { resetNodeCryptoLoader } from "../../utils/node-crypto-loader";

/**
 * Punta a punta con un P12 de verdad (generado aquí, con estrategia SECURITY
 * DATA por el nombre del emisor) para comprobar lo que las pruebas con mocks
 * no pueden: que el certificado se descifra una sola vez por proceso y que
 * la firma sale bien tanto con el crypto nativo como con forge.
 */
function generarP12(password: string): Uint8Array {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "0a1b2c";
  cert.validity.notBefore = new Date(2020, 0, 1);
  cert.validity.notAfter = new Date(2035, 0, 1);
  // El proveedor elige la estrategia por issuer.attributes[2] cuando el P12
  // trae un solo certificado: ahí va el nombre de la certificadora.
  const issuer = [
    { name: "commonName", value: "AC PRUEBAS" },
    { name: "organizationName", value: "PRUEBAS S.A." },
    { name: "organizationalUnitName", value: "SECURITY DATA CA" },
  ];
  cert.setSubject([{ name: "commonName", value: "FIRMANTE DE PRUEBA" }]);
  cert.setIssuer(issuer);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
    // Más vueltas de KDF que el default (2048): imita, a escala, lo caro que
    // es un certificado real y hace visible el ahorro de la caché.
    count: 20000,
  });
  return new Uint8Array(Buffer.from(forge.asn1.toDer(asn1).getBytes(), "binary"));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria><ambiente>1</ambiente><razonSocial>PRUEBAS S.A.</razonSocial></infoTributaria>
  <infoFactura><totalSinImpuestos>10.00</totalSinImpuestos></infoFactura>
</factura>`;

describe("signXml · punta a punta", () => {
  const password = "clave-de-prueba";
  let p12: Uint8Array;

  beforeAll(() => {
    p12 = generarP12(password);
  });

  beforeEach(() => {
    clearCertificateCache();
    resetNodeCryptoLoader();
    delete process.env.OSODREAMER_SIGNER_RSA;
  });

  it("firma con el crypto nativo y descifra el P12 una sola vez por proceso", async () => {
    const descifrar = jest.spyOn(forge.pkcs12, "pkcs12FromAsn1");

    const primera = await signXml({ p12Buffer: p12, password, xmlBuffer: Buffer.from(xml) });
    const descifradosPrimera = descifrar.mock.calls.length;
    const segunda = await signXml({ p12Buffer: p12, password, xmlBuffer: Buffer.from(xml) });

    expect(primera).toContain("<ds:Signature");
    expect(primera).toContain("<ds:SignatureValue");
    expect(primera).toContain("SECURITY DATA CA");
    expect(segunda).toContain("<ds:SignatureValue");
    // La primera vez abre el P12 (validar + leer); la segunda no lo toca.
    expect(descifradosPrimera).toBeGreaterThanOrEqual(1);
    expect(descifrar.mock.calls.length).toBe(descifradosPrimera);

    descifrar.mockRestore();
  });

  it("con OSODREAMER_SIGNER_RSA=forge firma igual de bien", async () => {
    process.env.OSODREAMER_SIGNER_RSA = "forge";
    const firmado = await signXml({ p12Buffer: p12, password, xmlBuffer: Buffer.from(xml) });
    expect(firmado).toContain("<ds:SignatureValue");
  });

  it("una contraseña incorrecta sigue dando P12_PASSWORD_ERROR y no envenena la caché", async () => {
    await expect(
      signXml({ p12Buffer: p12, password: "otra", xmlBuffer: Buffer.from(xml) })
    ).rejects.toMatchObject({ code: "P12_PASSWORD_ERROR" });

    const firmado = await signXml({ p12Buffer: p12, password, xmlBuffer: Buffer.from(xml) });
    expect(firmado).toContain("<ds:SignatureValue");
  });
});
