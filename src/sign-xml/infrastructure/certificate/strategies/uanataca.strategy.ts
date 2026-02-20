import { getForge } from "../../../../utils/forge-loader";
import { SignStrategy } from "../../interfaces";
import {
  PrivateKeyExtractionError,
  SigningKeyNotFoundError,
  UanatacaCertificateNotFoundError,
} from "../../errors";

export class UanatacaStrategy implements SignStrategy {
  supports(friendlyName: string): boolean {
    return /UANATACA/i.test(friendlyName);
  }

  async getPrivateKey(
    bags: any[]
  ): Promise<any> {
    const forge = await getForge();
    const item = bags[0];
    if (!item) throw new SigningKeyNotFoundError("UANATACA");
    if (item?.key) {
      return item.key;
    } else if (item?.asn1) {
      return forge.pki.privateKeyFromAsn1(item.asn1);
    } else {
      throw new PrivateKeyExtractionError();
    }
  }

  async overrideIssuerName(certBags: any): Promise<string> {
    const forge = await getForge();
    const certItems = certBags[forge.pki.oids.certBag];
    if (!certItems || !certItems.length) {
      throw new UanatacaCertificateNotFoundError();
    }
    const cert = certItems[0].cert;

    return await this.getX509IssuerName(cert);
  }

  private async getX509IssuerName(cert: any): Promise<string> {
    const forge = await getForge();
    const issuerName = cert.issuer.attributes
      .reverse()
      .filter((attr: any) => attr.shortName || attr.type)
      .map((attr: any) => {
        if (attr.shortName) {
          return `${attr.shortName}=${attr.value}`;
        } else {
          return `${attr.type}=${this.hexEncodeUtf8(attr.value, forge)}`;
        }
      })
      .join(",");

    return issuerName;
  }

  private hexEncodeUtf8(value: string, forge: any): string {
    const utf8Bytes = forge.util.encodeUtf8(value);
    const hex = forge.util.bytesToHex(utf8Bytes);
    return `#0c${utf8Bytes.length.toString(16).padStart(2, "0")}${hex}`;
  }
}
