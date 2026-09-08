import * as forge from "node-forge";
import { XmlDomContext } from "../../../infrastructure/xml-dom-context/xml-dom.context";
import { buildSignXmlUseCase } from "../../../infrastructure/composition/buildSignXmlUseCase";
import { SignXmlUseCase } from "../../../application/use-cases";

describe("buildSignXmlUseCase", () => {
  it("should build a SignXmlUseCase with all dependencies", () => {
    // Crear una clave privada de prueba
    const keyPair = forge.pki.rsa.generateKeyPair(512); // 512 solo para test
    const privateKey = keyPair.privateKey;

    // Crear un contexto XML básico
    const xml = `<?xml version="1.0" encoding="UTF-8"?><root></root>`;
    const context = new XmlDomContext(xml);

    const useCase = buildSignXmlUseCase(privateKey, context);

    expect(useCase).toBeInstanceOf(SignXmlUseCase);
    expect(typeof useCase.execute).toBe("function");
  });

  it("acepta un SignerPort ya elegido (nativo o forge) en vez de la clave", () => {
    const signer = { signSha1RsaBase64: jest.fn(() => "firma") };
    const xml = `<?xml version="1.0" encoding="UTF-8"?><root></root>`;
    const context = new XmlDomContext(xml);

    const useCase = buildSignXmlUseCase(signer, context);

    expect(useCase).toBeInstanceOf(SignXmlUseCase);
  });
});
