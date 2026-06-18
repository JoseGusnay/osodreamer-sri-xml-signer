import { UanatacaStrategy } from "../../../../infrastructure/certificate/strategies";
import * as forge from "node-forge";
import {
  PrivateKeyExtractionError,
  SigningKeyNotFoundError,
  UanatacaCertificateNotFoundError,
} from "../../../../infrastructure/errors";

describe("UanatacaStrategy", () => {
  const strategy = new UanatacaStrategy();

  describe("supports", () => {
    it("debería retornar true si el nombre contiene 'UANATACA'", () => {
      expect(strategy.supports("Certificado UANATACA CA2 2016")).toBe(true);
    });

    it("debería retornar false si el nombre no contiene 'UANATACA'", () => {
      expect(strategy.supports("Certificado Otro")).toBe(false);
    });
  });

  describe("getPrivateKey", () => {
    it("debería retornar item.key si está presente", async () => {
      const fakeKey = { mock: "key" } as unknown as forge.pki.PrivateKey;
      const bags = [
        {
          key: fakeKey,
        } as unknown as forge.pkcs12.Bag,
      ];

      const result = await strategy.getPrivateKey(bags);
      expect(result).toBe(fakeKey);
    });

    it("debería convertir y retornar item.asn1 si no hay key", async () => {
      const fakeAsn1 = {} as forge.asn1.Asn1;
      const bags = [
        {
          asn1: fakeAsn1,
        } as unknown as forge.pkcs12.Bag,
      ];

      const spy = jest
        .spyOn(forge.pki, "privateKeyFromAsn1")
        .mockReturnValue("convertedKey" as any);

      const result = await strategy.getPrivateKey(bags);
      expect(spy).toHaveBeenCalledWith(fakeAsn1);
      expect(result).toBe("convertedKey");
    });

    it("debería lanzar SigningKeyNotFoundError si no hay ningún bag", async () => {
      const bags: forge.pkcs12.Bag[] = [];

      await expect(strategy.getPrivateKey(bags)).rejects.toThrow(
        SigningKeyNotFoundError
      );
    });

    it("debería lanzar PrivateKeyExtractionError si no hay key ni asn1", async () => {
      const bags = [{} as unknown as forge.pkcs12.Bag];

      await expect(strategy.getPrivateKey(bags)).rejects.toThrow(
        PrivateKeyExtractionError
      );
    });
  });

  describe("overrideIssuerName", () => {
    it("debería retornar el issuer name formateado con shortName", async () => {
      const certBags = {
        [forge.pki.oids.certBag]: [
          {
            cert: {
              issuer: {
                attributes: [
                  { shortName: "C", value: "ES" },
                  { shortName: "O", value: "UANATACA S.A." },
                  { shortName: "CN", value: "UANATACA CA2 2016" },
                ],
              },
            },
          },
        ],
      };

      const result = await strategy.overrideIssuerName(certBags as any);
      expect(result).toBe("CN=UANATACA CA2 2016,O=UANATACA S.A.,C=ES");
    });

    it("debería retornar el issuer name codificado en hex si no tiene shortName", async () => {
      const certBags = {
        [forge.pki.oids.certBag]: [
          {
            cert: {
              issuer: {
                attributes: [
                  {
                    type: "2.5.4.97",
                    value: "VATES-A66721499",
                  },
                ],
              },
            },
          },
        ],
      };

      const result = await strategy.overrideIssuerName(certBags as any);
      expect(result).toMatch(/^2.5.4.97=#0c/); // empieza con hex encoding
    });

    it("debería lanzar UanatacaCertificateNotFoundError si no hay certificados", async () => {
      const certBags = {
        [forge.pki.oids.certBag]: [],
      };

      await expect(strategy.overrideIssuerName(certBags as any)).rejects.toThrow(
        UanatacaCertificateNotFoundError
      );
    });
  });
});
