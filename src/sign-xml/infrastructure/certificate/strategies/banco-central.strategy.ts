import { getForge } from "../../../../utils/forge-loader";
import { SignStrategy } from "../../interfaces";
import {
  PrivateKeyExtractionError,
  SigningKeyNotFoundError,
} from "../../errors";

export class BancoCentralStrategy implements SignStrategy {
  supports(friendlyName: string): boolean {
    return /BANCO CENTRAL/i.test(friendlyName);
  }

  async getPrivateKey(
    bags: any[]
  ): Promise<any> {
    const forge = await getForge();
    console.log(`[BancoCentral] Total key bags: ${bags.length}`);
    bags.forEach((bag: any, i: number) => {
      const fn = bag?.attributes?.friendlyName?.[0] ?? 'n/a';
      console.log(`[BancoCentral]   key[${i}] fn="${fn}"`);
    });

    const item = bags.find((bag) =>
      /Signing Key/i.test(bag.attributes?.friendlyName?.[0])
    );

    if (!item) {
      console.error('[BancoCentral] ERROR: No key bag with "Signing Key" found!');
      throw new SigningKeyNotFoundError("BANCO CENTRAL");
    }
    console.log(`[BancoCentral] Signing key found: fn="${item?.attributes?.friendlyName?.[0]}"`)

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
    const cert = certBags[forge.pki.oids.certBag][0].cert;
    return cert.issuer.attributes
      .reverse()
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(",");
  }
}
