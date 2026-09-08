// src/infrastructure/composition/buildSignXmlUseCase.ts

import { SignXmlUseCase } from "../../application/use-cases";
import { SignerPort } from "../../domain/ports";
import { XadesSignatureService } from "../../domain/xades-signature.service";
import { CanonicalizerImplement } from "../canonicalizer/canonicalizer.implement";
import { ClockImplement } from "../clock/clock.implement";
import { ForgeRsaSha1Signer } from "../forge-rsa-sha1-signer.implementation";
import { HashProviderImplement } from "../hash/hash-provider.implement";
import { SignatureIdGeneratorImplement } from "../signature-generation/signature-id-generator.implement";
import { XmlDomContext } from "../xml-dom-context/xml-dom.context";
import { XmlSignatureInjector } from "../XmlSignatureInjector";
import * as forge from "node-forge";

/**
 * Arma el caso de uso de firma. Acepta un `SignerPort` ya elegido (nativo o
 * forge, ver signer.factory.ts) o, por compatibilidad, la clave privada de
 * forge de siempre, que se envuelve en `ForgeRsaSha1Signer`.
 */
export function buildSignXmlUseCase(
  signerOrPrivateKey: SignerPort | forge.pki.rsa.PrivateKey,
  context: XmlDomContext
): SignXmlUseCase {
  const clock = new ClockImplement();
  const canonicalizer = new CanonicalizerImplement(context);
  const hasher = new HashProviderImplement();
  const idGenerator = new SignatureIdGeneratorImplement();
  const signer = isSigner(signerOrPrivateKey)
    ? signerOrPrivateKey
    : new ForgeRsaSha1Signer(signerOrPrivateKey);
  const injector = new XmlSignatureInjector(context);

  const xadesService = new XadesSignatureService(
    clock,
    canonicalizer,
    hasher,
    idGenerator,
    signer
  );

  return new SignXmlUseCase(xadesService, injector);
}

function isSigner(value: unknown): value is SignerPort {
  return typeof (value as SignerPort)?.signSha1RsaBase64 === "function";
}
