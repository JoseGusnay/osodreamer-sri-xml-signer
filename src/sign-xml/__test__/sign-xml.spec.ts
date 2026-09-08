import { signXml } from "./../sign-xml";
import { SignXmlRequest } from "../domain/interfaces";
import * as validation from "../infrastructure/validations/p12.validation";
import * as build from "../infrastructure/composition/buildSignXmlUseCase";
import { CertificateProviderImplement } from "../infrastructure/certificate/certificate-provider.implement";
import { XmlDomContext } from "../infrastructure/xml-dom-context/xml-dom.context";
import { ErrorHandler } from "../infrastructure/handlers";
import { InvalidP12PasswordError } from "../infrastructure/errors";
import { SignXmlError } from "../infrastructure/interfaces";
import { clearCertificateCache } from "../infrastructure/certificate/certificate-cache";


jest.mock("../infrastructure/validations/p12.validation");
jest.mock("../infrastructure/certificate/certificate-provider.implement");
jest.mock("../infrastructure/xml-dom-context/xml-dom.context");
jest.mock("../infrastructure/composition/buildSignXmlUseCase");

describe("signXml", () => {
  const fakeXml = "<Factura>contenido</Factura>";
  const fakeXmlBuffer = new TextEncoder().encode(fakeXml);
  const fakeCertData = {
    certificateX509: "cert",
    serialNumber: "123",
    base64Der: "hash",
    issuerName: "CN=Issuer",
    privateKey: "privateKey",
    publicKey: {
      modulus: "mod",
      exponent: "exp",
    },
    certificate: {} as any,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    // Cada prueba parte sin certificados recordados: la caché es global al proceso.
    clearCertificateCache();

    // Mock validación del P12
    (validation.assertIsValidP12OrThrow as jest.Mock).mockResolvedValue(undefined);

    // Mock proveedor de certificado
    (CertificateProviderImplement as jest.Mock).mockImplementation(() => ({
      getCertificateData: jest.fn().mockResolvedValue(fakeCertData),
    }));

    // Mock contexto XML
    (XmlDomContext as jest.Mock).mockImplementation(() => ({
      getDocument: () => ({}),
      getRootNode: () => ({ nodeName: "Factura" }),
    }));

    // Mock caso de uso de firma
    (build.buildSignXmlUseCase as jest.Mock).mockReturnValue({
      execute: jest.fn().mockResolvedValue("<FacturaFirmada/>"),
    });
  });

  it("debería firmar un XML correctamente", async () => {
    const input: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([0, 1, 2, 3]),
      password: "1234",
    };

    const result = await signXml(input);

    expect(validation.assertIsValidP12OrThrow).toHaveBeenCalledWith(
      input.p12Buffer,
      input.password
    );
    expect(result).toBe("<FacturaFirmada/>");
  });

  it("recuerda el certificado: la segunda firma con el mismo P12 no lo valida ni lo descifra otra vez", async () => {
    const input: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([9, 9, 9]),
      password: "1234",
    };

    await signXml(input);
    await signXml(input);

    expect(validation.assertIsValidP12OrThrow).toHaveBeenCalledTimes(1);
    expect(CertificateProviderImplement).toHaveBeenCalledTimes(1);
  });

  it("otra contraseña o otro P12 no reutilizan el certificado", async () => {
    const base: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([9, 9, 9]),
      password: "1234",
    };

    await signXml(base);
    await signXml({ ...base, password: "otra" });
    await signXml({ ...base, p12Buffer: new Uint8Array([9, 9, 8]) });

    expect(CertificateProviderImplement).toHaveBeenCalledTimes(3);
  });

  it("un P12 que falla no queda en la caché", async () => {
    (CertificateProviderImplement as jest.Mock).mockImplementationOnce(() => ({
      getCertificateData: jest.fn().mockRejectedValue(new Error("boom")),
    }));
    const input: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([7, 7, 7]),
      password: "1234",
    };

    await expect(signXml(input)).rejects.toThrow("boom");
    await expect(signXml(input)).resolves.toBe("<FacturaFirmada/>");

    expect(CertificateProviderImplement).toHaveBeenCalledTimes(2);
  });

  it("debería lanzar el error original si algo falla", async () => {
    const originalError = new Error("Algo salió mal");

    (CertificateProviderImplement as jest.Mock).mockImplementation(() => ({
      getCertificateData: jest.fn().mockRejectedValue(originalError),
    }));

    const input: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([0, 1, 2, 3]),
      password: "1234",
    };

    jest.spyOn(ErrorHandler, "handle").mockImplementation((err) => ({
      code: "UNHANDLED_ERROR",
      message: "custom msg",
      original: originalError, // ✅ aquí está el fix
    }));

    await expect(signXml(input)).rejects.toThrow("Algo salió mal");
    expect(ErrorHandler.handle).toHaveBeenCalledWith(originalError);
  });

  it("debería adjuntar el code al error lanzado", async () => {
    const originalError = new InvalidP12PasswordError();

    (CertificateProviderImplement as jest.Mock).mockImplementation(() => ({
      getCertificateData: jest.fn().mockRejectedValue(originalError),
    }));

    const input: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([0, 1, 2, 3]),
      password: "incorrecta",
    };

    jest.spyOn(ErrorHandler, "handle").mockImplementation(() => ({
      code: "P12_PASSWORD_ERROR",
      message: originalError.message,
      original: originalError,
    }));

    let error!: SignXmlError;
    try {
      await signXml(input);
    } catch (e) {
      error = e as SignXmlError;
    }

    expect(error.code).toBe("P12_PASSWORD_ERROR");
    // el error sigue siendo el original: instanceof debe seguir funcionando
    expect(error).toBeInstanceOf(InvalidP12PasswordError);
    expect(error.message).toBe(
      "El archivo P12 es válido, pero la contraseña es incorrecta."
    );
  });

  it("no debería escribir en la consola del consumidor", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (CertificateProviderImplement as jest.Mock).mockImplementation(() => ({
      getCertificateData: jest.fn().mockRejectedValue(new Error("boom")),
    }));

    const input: SignXmlRequest = {
      xmlBuffer: fakeXmlBuffer,
      p12Buffer: new Uint8Array([0, 1, 2, 3]),
      password: "1234",
    };

    await expect(signXml(input)).rejects.toThrow();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
