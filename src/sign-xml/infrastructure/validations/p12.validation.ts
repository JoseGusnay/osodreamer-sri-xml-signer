
import { getForge } from "../../../utils/forge-loader";
import { InvalidP12PasswordError, InvalidP12StructureError } from "../errors";

export async function assertIsValidP12OrThrow(
  buffer: Buffer | Uint8Array,
  password: string
): Promise<void> {
  const forge = await getForge();

  // 1. Convertir binario correctamente
  const binaryStr = Array.from(buffer)
    .map((b) => String.fromCharCode(b))
    .join("");

  let asn1: any;
  try {
    asn1 = forge.asn1.fromDer(forge.util.createBuffer(binaryStr, "binary"));
  } catch {
    throw new InvalidP12StructureError();
  }

  try {
    forge.pkcs12.pkcs12FromAsn1(asn1, password);
  } catch {
    throw new InvalidP12PasswordError();
  }
}
