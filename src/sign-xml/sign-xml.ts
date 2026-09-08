import { CryptoUtils } from "./common/utils";
import { ParsedP12Certificate, SignXmlRequest } from "./domain/interfaces";
import { SignStrategyFactory } from "./infrastructure/certificate/factories";
import { CertificateProviderImplement } from "./infrastructure/certificate/certificate-provider.implement";
import {
  CachedCertificate,
  certificateCacheKey,
  getCachedCertificate,
  setCachedCertificate,
} from "./infrastructure/certificate/certificate-cache";
import { buildSignXmlUseCase } from "./infrastructure/composition/buildSignXmlUseCase";
import { ErrorHandler } from "./infrastructure/handlers";
import { createRsaSha1Signer } from "./infrastructure/signer.factory";
import { assertIsValidP12OrThrow } from "./infrastructure/validations/p12.validation";
import { XmlDomContext } from "./infrastructure/xml-dom-context/xml-dom.context";
import { getForge } from "../utils/forge-loader";

export async function signXml(cmd: SignXmlRequest): Promise<string> {
  try {
    const { certData, privateKeyPem } = await loadCertificate(
      cmd.p12Buffer,
      cmd.password
    );
    const xmlToSign = new TextDecoder("utf-8").decode(cmd.xmlBuffer);
    const context = new XmlDomContext(xmlToSign);

    const signer = await createRsaSha1Signer(certData, privateKeyPem);
    const signXmlUseCase = buildSignXmlUseCase(signer, context);
    const finalXml = await signXmlUseCase.execute({
      xmlToSign,
      certData,
    });

    return finalXml;
  } catch (error) {
    const handled = ErrorHandler.handle(error);

    // Adjuntamos el codigo al error original para que quien llama pueda
    // discriminarlo sin depender del texto del mensaje.
    throw Object.assign(handled.original, { code: handled.code });
  }
}

/**
 * Certificado descifrado, de la caché o del P12.
 *
 * Descifrar el P12 es lo caro de toda la firma (ver certificate-cache.ts), y
 * antes se hacía dos veces por comprobante: una para validar contraseña y
 * estructura con sus errores propios, otra para leer clave y certificado.
 * Ahora las dos aperturas solo ocurren la PRIMERA vez que se ve un P12 en el
 * proceso; las siguientes firmas del mismo emisor no descifran nada.
 */
async function loadCertificate(
  p12Buffer: Uint8Array,
  password: string
): Promise<CachedCertificate> {
  const key = await certificateCacheKey(p12Buffer, password);
  const cached = getCachedCertificate(key);
  if (cached) return cached;

  await assertIsValidP12OrThrow(p12Buffer, password);
  const certProvider = new CertificateProviderImplement(
    p12Buffer,
    password,
    new SignStrategyFactory(),
    new CryptoUtils()
  );
  const certData = await certProvider.getCertificateData();

  const entry: CachedCertificate = {
    certData,
    privateKeyPem: await privateKeyToPem(certData),
  };
  // Solo se guarda lo que abrió bien: un fallo nunca queda cacheado.
  setCachedCertificate(key, entry);
  return entry;
}

/** PEM para el crypto nativo; si la clave no es RSA de forge, se firma con forge. */
async function privateKeyToPem(
  certData: ParsedP12Certificate
): Promise<string | undefined> {
  try {
    const forge = await getForge();
    return forge.pki.privateKeyToPem(certData.privateKey);
  } catch {
    return undefined;
  }
}
