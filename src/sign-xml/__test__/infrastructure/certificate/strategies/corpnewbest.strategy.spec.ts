import { CorpnewbestStrategy } from "../../../../infrastructure/certificate/strategies";
import * as forge from "node-forge";
import {
  PrivateKeyExtractionError,
  SigningKeyNotFoundError,
} from "../../../../infrastructure/errors";

describe("CorpnewbestStrategy", () => {
  const strategy = new CorpnewbestStrategy();

  describe("supports", () => {
    it("debería retornar true si el nombre contiene 'CORPNEWBEST'", () => {
      expect(
        strategy.supports("AUTORIDAD DE CERTIFICACION RAIZ CA-1EF CORPNEWBEST")
      ).toBe(true);
    });

    it("debería retornar false si el nombre no contiene 'CORPNEWBEST'", () => {
      expect(strategy.supports("Otro Certificado")).toBe(false);
    });
  });

  describe("getPrivateKey", () => {
    it("debería retornar item.key si está presente", () => {
      const fakeKey = { mock: "key" } as unknown as forge.pki.PrivateKey;
      const bags = [
        {
          key: fakeKey,
        } as unknown as forge.pkcs12.Bag,
      ];

      const result = strategy.getPrivateKey(bags);
      expect(result).toBe(fakeKey);
    });

    it("debería convertir y retornar item.asn1 si no hay key", () => {
      const fakeAsn1 = {} as forge.asn1.Asn1;
      const bags = [
        {
          asn1: fakeAsn1,
        } as unknown as forge.pkcs12.Bag,
      ];

      const spy = jest
        .spyOn(forge.pki, "privateKeyFromAsn1")
        .mockReturnValue("convertedKey" as any);

      const result = strategy.getPrivateKey(bags);
      expect(spy).toHaveBeenCalledWith(fakeAsn1);
      expect(result).toBe("convertedKey");
    });

    it("debería lanzar SigningKeyNotFoundError si no hay ningún bag", () => {
      const bags: forge.pkcs12.Bag[] = [];

      expect(() => strategy.getPrivateKey(bags)).toThrow(
        SigningKeyNotFoundError
      );
    });

    it("debería lanzar PrivateKeyExtractionError si no hay key ni asn1", () => {
      const bags = [{} as unknown as forge.pkcs12.Bag];

      expect(() => strategy.getPrivateKey(bags)).toThrow(
        PrivateKeyExtractionError
      );
    });
  });

  describe("overrideIssuerName", () => {
    it("debería retornar el issuer name formateado", () => {
      const certBags = {
        [forge.pki.oids.certBag]: [
          {
            cert: {
              issuer: {
                attributes: [
                  { shortName: "C", value: "EC" },
                  { shortName: "O", value: "CORPNEWBEST CIA. LTDA." },
                  {
                    shortName: "CN",
                    value: "AUTORIDAD DE CERTIFICACION RAIZ CA-1EF CORPNEWBEST",
                  },
                ],
              },
            },
          },
        ],
      };

      const result = strategy.overrideIssuerName(certBags as any);
      expect(result).toBe(
        "CN=AUTORIDAD DE CERTIFICACION RAIZ CA-1EF CORPNEWBEST,O=CORPNEWBEST CIA. LTDA.,C=EC"
      );
    });
  });
});
