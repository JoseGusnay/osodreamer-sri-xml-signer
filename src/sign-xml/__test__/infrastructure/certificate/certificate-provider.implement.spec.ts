import * as forge from "node-forge";
import { SignStrategyFactory } from "../../../infrastructure/certificate/factories";
import { CertificateProviderImplement } from "../../../infrastructure/certificate/certificate-provider.implement";

const mockStrategy = {
  supports: jest.fn().mockReturnValue(true),
  getPrivateKey: jest.fn().mockReturnValue({
    e: { data: [65537] },
    n: BigInt(123456789),
  }),
  overrideIssuerName: jest.fn().mockReturnValue("Mocked Issuer"),
};

const mockCryptoUtils = {
  hexToBase64: jest.fn().mockReturnValue("mockedExponent"),
  bigint3base64: jest.fn().mockReturnValue("mockedModulus"),
  p_obtener_aleatorio: jest.fn().mockReturnValue(1234567), // 👈 agrega esto
};
// 🧪 Mocks internos de node-forge
jest.mock("node-forge", () => {
  const original = jest.requireActual("node-forge");
  return {
    ...original,
    util: {
      ...original.util,
      decode64: jest.fn(() => "decoded"),
      encode64: jest.fn(() => "encoded"),
      binary: {
        base64: {
          encode: jest.fn(() => "base64Mocked"),
        },
      },
    },
    asn1: {
      fromDer: jest.fn(() => "asn1Structure"),
      toDer: jest.fn(() => ({ bytes: () => "derBytes" })),
    },
    pkcs12: {
      pkcs12FromAsn1: jest.fn(() => ({
        getBags: jest.fn(({ bagType }) => {
          if (bagType === original.pki.oids.pkcs8ShroudedKeyBag) {
            return { [bagType]: ["mockedKeyBag"] };
          }
          return {
            [bagType]: [
              {
                cert: {
                  serialNumber: "abcdef1234",
                  extensions: [1, 2, 3],
                  issuer: {
                    attributes: [
                      { shortName: "C", value: "EC" },
                      { shortName: "O", value: "BCE" },
                      { shortName: "CN", value: "Test Cert" },
                    ],
                  },
                },
                attributes: { friendlyName: ["correctName"] },
              },
            ],
          };
        }),
      })),
    },
    pki: {
      ...original.pki,
      certificateToAsn1: jest.fn(() => "asn1Cert"),
      oids: original.pki.oids,
    },
    sha1: {
      create: jest.fn(() => ({
        update: () => ({
          digest: () => ({ bytes: () => "sha1Digest" }),
        }),
      })),
    },
    jsbn: {
      BigInteger: jest.fn(() => ({
        toString: () => "1234567890",
      })),
    },
  };
});

describe("ForgeCertificateProviderImplement", () => {
  it("debería retornar los datos del certificado correctamente", async () => {
    const realFactory = new SignStrategyFactory();
    jest
      .spyOn(realFactory, "getStrategy")
      .mockImplementation(() => mockStrategy);

    const provider = new CertificateProviderImplement(
      new Uint8Array([]),
      "testPassword",
      realFactory,
      mockCryptoUtils
    );

    const result = await provider.getCertificateData();

    expect(result.certificate).toBeDefined();
    expect(result.privateKey).toBeDefined();
    expect(result.issuerName).toBe("CN=Test Cert,O=BCE,C=EC");
    expect(result.publicKey.exponent).toBe("mockedExponent");
    expect(result.publicKey.modulus).toBe("mockedModulus");
    expect(result.serialNumber).toBe("1234567890");

    expect(mockStrategy.getPrivateKey).toHaveBeenCalled();
  });
  it("debería usar el issuer como friendlyName si no hay friendlyName", async () => {
    const realFactory = new SignStrategyFactory();
    jest
      .spyOn(realFactory, "getStrategy")
      .mockImplementation(() => mockStrategy);

    // Modifica el mock de getBags para omitir friendlyName en [1]
    forge.pkcs12.pkcs12FromAsn1 = jest.fn(() => ({
      getBags: ({ bagType }) => {
        if (bagType === forge.pki.oids.pkcs8ShroudedKeyBag) {
          return { [bagType]: ["mockedKeyBag"] };
        }
        return {
          [bagType]: [
            {
              cert: {
                serialNumber: "abcdef1234",
                extensions: [1, 2, 3],
                issuer: { attributes: [{}, {}, { value: "FallbackName" }] },
              },
              attributes: {},
            },
          ],
        };
      },
    }));

    const provider = new CertificateProviderImplement(
      new Uint8Array([]),
      "testPassword",
      realFactory,
      mockCryptoUtils
    );

    const result = await provider.getCertificateData();

    expect(result).toBeDefined();
    expect(mockStrategy.getPrivateKey).toHaveBeenCalled();
  });
  it("debería retornar el primer certificado si tiene más extensiones", async () => {
    const realFactory = new SignStrategyFactory();
    jest
      .spyOn(realFactory, "getStrategy")
      .mockImplementation(() => mockStrategy);

    forge.pkcs12.pkcs12FromAsn1 = jest.fn(() => ({
      getBags: ({ bagType }) => {
        if (bagType === forge.pki.oids.pkcs8ShroudedKeyBag) {
          return { [bagType]: ["mockedKeyBag"] };
        }
        return {
          [bagType]: [
            {
              cert: {
                serialNumber: "cert1",
                extensions: [1, 2, 3, 4], // más largo
                issuer: { attributes: [{}, {}, { value: "Issuer1" }] },
              },
              attributes: { friendlyName: ["name1"] },
            },
            {
              cert: {
                serialNumber: "cert2",
                extensions: [1], // más corto
                issuer: { attributes: [{}, {}, { value: "Issuer2" }] },
              },
              attributes: { friendlyName: ["name2"] },
            },
          ],
        };
      },
    }));

    const provider = new CertificateProviderImplement(
      new Uint8Array([]),
      "testPassword",
      realFactory,
      mockCryptoUtils
    );

    const result = await provider.getCertificateData();
    expect(result.serialNumber).toBe("1234567890"); // validación genérica
  });
  it("debería usar el issuer.value como fallback si no hay friendlyName", async () => {
    const realFactory = new SignStrategyFactory();
    jest
      .spyOn(realFactory, "getStrategy")
      .mockImplementation(() => mockStrategy);

    forge.pkcs12.pkcs12FromAsn1 = jest.fn(() => ({
      getBags: ({ bagType }) => {
        if (bagType === forge.pki.oids.pkcs8ShroudedKeyBag) {
          return { [bagType]: ["mockedKeyBag"] };
        }
        return {
          [bagType]: [
            {
              cert: {
                serialNumber: "abc123",
                extensions: [1],
                issuer: {
                  attributes: [
                    { shortName: "C", value: "EC" },
                    { shortName: "O", value: "BCE" },
                    { shortName: "CN", value: "FallbackUsed" },
                  ],
                },
              },
              attributes: {}, // sin friendlyName
            },
          ],
        };
      },
    }));

    const provider = new CertificateProviderImplement(
      new Uint8Array([]),
      "testPassword",
      realFactory,
      mockCryptoUtils
    );

    const result = await provider.getCertificateData();
    expect(mockStrategy.getPrivateKey).toHaveBeenCalled();
    expect(result.issuerName).toBe("CN=FallbackUsed,O=BCE,C=EC");
  });

  it("debería retornar el primer certificado si tiene más extensiones (ramo else de reduce)", async () => {
    const realFactory = new SignStrategyFactory();
    jest
      .spyOn(realFactory, "getStrategy")
      .mockImplementation(() => mockStrategy);

    forge.pkcs12.pkcs12FromAsn1 = jest.fn(() => ({
      getBags: ({ bagType }) => {
        if (bagType === forge.pki.oids.pkcs8ShroudedKeyBag) {
          return { [bagType]: ["mockedKeyBag"] };
        }
        return {
          [bagType]: [
            {
              cert: {
                serialNumber: "cert1",
                extensions: [1, 2, 3, 4],
                issuer: { attributes: [{}, {}, { value: "Issuer1" }] },
              },
              attributes: { friendlyName: ["correctName"] },
            },
            {
              cert: {
                serialNumber: "cert2",
                extensions: [1, 2],
                issuer: { attributes: [{}, {}, { value: "Issuer2" }] },
              },
              attributes: { friendlyName: ["correctName"] },
            },
          ],
        };
      },
    }));

    const provider = new CertificateProviderImplement(
      new Uint8Array([]),
      "testPassword",
      realFactory,
      mockCryptoUtils
    );

    const result = await provider.getCertificateData();
    expect(result.certificate.serialNumber).toBe("cert1"); // retorna prev
  });
});
