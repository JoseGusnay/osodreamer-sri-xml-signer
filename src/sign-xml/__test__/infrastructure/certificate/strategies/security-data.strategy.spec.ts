import { SecurityDataStrategy } from "../../../../infrastructure/certificate/strategies";
import * as forge from "node-forge";
import {
  PrivateKeyExtractionError,
  SigningKeyNotFoundError,
} from "../../../../infrastructure/errors";

describe("SecurityDataStrategy", () => {
  const strategy = new SecurityDataStrategy();

  describe("supports", () => {
    it("debería retornar true si el nombre contiene 'SECURITY DATA'", () => {
      expect(strategy.supports("Certificado SECURITY DATA SA")).toBe(true);
    });

    it("debería retornar false si el nombre no contiene 'SECURITY DATA'", () => {
      expect(strategy.supports("Otro Certificado")).toBe(false);
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
    it("debería retornar el issuer name formateado", async () => {
      const certBags = {
        [forge.pki.oids.certBag]: [
          {
            cert: {
              issuer: {
                attributes: [
                  { shortName: "C", value: "EC" },
                  { shortName: "O", value: "Security Data" },
                  { shortName: "CN", value: "Autoridad Certificadora" },
                ],
              },
            },
          },
        ],
      };

      const result = await strategy.overrideIssuerName(certBags as any);
      expect(result).toBe("CN=Autoridad Certificadora,O=Security Data,C=EC");
    });
  });
});
