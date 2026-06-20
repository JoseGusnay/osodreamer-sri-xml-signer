import { CryptoUtils } from "./common/utils";
import { SignXmlRequest } from "./domain/interfaces";
import { SignStrategyFactory } from "./infrastructure/certificate/factories";
import { CertificateProviderImplement } from "./infrastructure/certificate/certificate-provider.implement";
import { buildSignXmlUseCase } from "./infrastructure/composition/buildSignXmlUseCase";

import { ErrorHandler } from "./infrastructure/handlers";
import { assertIsValidP12OrThrow } from "./infrastructure/validations/p12.validation";
import { XmlDomContext } from "./infrastructure/xml-dom-context/xml-dom.context";

export async function signXml(cmd: SignXmlRequest): Promise<string> {
  try {
    await assertIsValidP12OrThrow(cmd.p12Buffer, cmd.password);
    const certProvider = new CertificateProviderImplement(
      cmd.p12Buffer,
      cmd.password,
      new SignStrategyFactory(),
      new CryptoUtils()
    );
    const certData = await certProvider.getCertificateData();
    const xmlToSign = new TextDecoder("utf-8").decode(cmd.xmlBuffer);
    const context = new XmlDomContext(xmlToSign);

    const signXmlUseCase = buildSignXmlUseCase(certData.privateKey, context);
    const finalXml = await signXmlUseCase.execute({
      xmlToSign,
      certData,
    });

    return finalXml;
  } catch (error) {
    const handled = ErrorHandler.handle(error);

    console.error(`[${handled.code}] ${handled.message}`);

    throw handled.original;
  }
}
