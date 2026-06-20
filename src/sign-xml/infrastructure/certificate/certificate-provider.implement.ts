import { getForge } from "../../../utils/forge-loader";
import { CertificateProviderPort } from "../../domain/ports";
import { ParsedP12Certificate } from "../../domain/interfaces/parsed-p12-certificate.interface";
import { SignStrategyFactory } from "./factories";
import { CryptoUtils } from "../../common/utils";

export class CertificateProviderImplement implements CertificateProviderPort {
  constructor(
    private readonly p12Buffer: Uint8Array,
    private readonly password: string,
    private readonly strategyFactory: SignStrategyFactory,
    private readonly crypto: CryptoUtils
  ) { }

  async getCertificateData(): Promise<ParsedP12Certificate> {
    const forge = await getForge();
    const uint8Array = new Uint8Array(this.p12Buffer);
    const p12Base64 = forge.util.binary.base64.encode(uint8Array);
    const p12Decoded = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Decoded);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);

    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificates = certBags[forge.oids.certBag];

    const friendlyName =
      certificates?.[1]?.attributes?.friendlyName?.[0] ??
      certificates?.[0]?.cert?.issuer?.attributes?.[2]?.value;

    const strategy = this.strategyFactory.getStrategy(friendlyName);

    console.log(`[CertProvider] strategy=${strategy.constructor.name} friendlyName="${friendlyName}"`);
    console.log(`[CertProvider] Total cert bags: ${certificates.length}`);
    certificates.forEach((bag: any, i: number) => {
      const cert = bag.cert;
      const bcExt = cert?.extensions?.find((e: any) => e.name === 'basicConstraints');
      const fn = bag?.attributes?.friendlyName?.[0] ?? 'n/a';
      const cn = cert?.subject?.attributes?.find((a: any) => a.name === 'commonName')?.value ?? 'n/a';
      const notAfter = cert?.validity?.notAfter?.toISOString() ?? 'n/a';
      const extCount = cert?.extensions?.length ?? 0;
      console.log(`[CertProvider]   cert[${i}] fn="${fn}" cn="${cn}" extensions=${extCount} notAfter=${notAfter} isCA=${!!bcExt?.cA}`);
    });

    const privateKey = await strategy.getPrivateKey(
      keyBags[forge.oids.pkcs8ShroudedKeyBag]
    );
    console.log(`[CertProvider] privateKey n length=${privateKey?.n?.toString(16)?.length}`);

    // Select the cert whose public key modulus matches the signing private key.
    // Fallback to max-extensions heuristic if no match found.
    const byKey = certificates.find((bag: any) => {
      try {
        return bag.cert?.publicKey?.n?.toString(16) === privateKey.n.toString(16);
      } catch (_) { return false; }
    });
    if (byKey) {
      const fn = byKey?.attributes?.friendlyName?.[0] ?? 'n/a';
      console.log(`[CertProvider] mainCertificate => BY KEY MATCH fn="${fn}"`);
    } else {
      console.warn('[CertProvider] mainCertificate => KEY MATCH failed, using max-extensions fallback');
    }
    const mainCertificate = byKey ?? certificates.reduce((prev: any, current: any) => {
      return current.cert.extensions.length > prev.cert.extensions.length ? current : prev;
    });

    // issuerName from mainCertificate to ensure IssuerSerial consistency in XAdES.
    const issuerName = mainCertificate.cert.issuer.attributes
      .slice()
      .reverse()
      .map((attr: any) => `${attr.shortName || attr.type}=${attr.value}`)
      .join(',');
    console.log(`[CertProvider] issuerName="${issuerName}"`);
    console.log(`[CertProvider] serialNumber="${mainCertificate.cert.serialNumber}"`);

    const certificate = mainCertificate.cert;
    const certificateX509_asn1 = forge.pki.certificateToAsn1(certificate);
    const certificateX509_der = forge.asn1.toDer(certificateX509_asn1);
    const certificateX509_der_hash = forge.util.encode64(
      forge.sha1.create().update(certificateX509_der.bytes()).digest().bytes()
    );

    const X509SerialNumber = new forge.jsbn.BigInteger(
      Array.from(Buffer.from(certificate.serialNumber, "hex"))
    ).toString();

    const certificateX509 = forge.util.encode64(certificateX509_der.bytes());
    const exponent = await this.crypto.hexToBase64(
      privateKey.e.data[0].toString(16)
    );
    const modulus = await this.crypto.bigint3base64(privateKey.n);

    return {
      certificate,
      certificateX509,
      privateKey,
      issuerName,
      serialNumber: X509SerialNumber,
      base64Der: certificateX509_der_hash,
      publicKey: {
        modulus,
        exponent,
      },
    };
  }
}
