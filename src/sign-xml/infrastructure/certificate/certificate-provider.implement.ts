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
    const privateKey = await strategy.getPrivateKey(
      keyBags[forge.oids.pkcs8ShroudedKeyBag]
    );
    const issuerName = await strategy.overrideIssuerName(certBags);

    const mainCertificate = certificates.reduce((prev, current) => {
      return current.cert.extensions.length > prev.cert.extensions.length
        ? current
        : prev;
    });
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
