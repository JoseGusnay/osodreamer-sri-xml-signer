import { ErrorCode } from "../types/error-code.type";

export interface HandledError {
  code: ErrorCode;
  message: string;
  original: Error;
}

/**
 * Forma del error que lanza `signXml`: el error original enriquecido con el
 * codigo que permite discriminarlo sin comparar el texto del mensaje.
 */
export interface SignXmlError extends Error {
  code: ErrorCode;
}
