import { signXml } from "./../sign-xml";
import { SignXmlRequest } from "../domain/interfaces";
import * as validation from "../infrastructure/validations/p12.validation";
import * as build from "../infrastructure/composition/buildSignXmlUseCase";
import { CertificateProviderImplement } from "../infrastructure/certificate/certificate-provider.implement";
import { XmlDomContext } from "../infrastructure/xml-dom-context/xml-dom.context";
import { ErrorHandler } from "../infrastructure/handlers";


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
});
