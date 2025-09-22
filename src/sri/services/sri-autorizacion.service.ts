import { SRI_URLS } from "../const";
import {
  createSoapClient,
  extractAutorizacionXml,
  normalizeSriMessages,
} from "../helpers";

import {
  SRIAutorizacionError,
  SRIUnauthorizedError,
} from "../exceptions/sri-autorizacion.error";
import { SriAuthorizationResponse } from "../interfaces";
import { AuthorizeXmlCommand } from "../interfaces";

export async function authorizeXml(
  data: AuthorizeXmlCommand
): Promise<SriAuthorizationResponse> {
  const { claveAcceso, env } = data;
  const client = await createSoapClient(SRI_URLS[env].autorizacion);

  const [result, rawResponse] = await client.autorizacionComprobanteAsync({
    claveAccesoComprobante: claveAcceso,
  });
  const autorizacionXml = extractAutorizacionXml(rawResponse);

  const respuesta = result?.RespuestaAutorizacionComprobante;

  const autorizacion = respuesta?.autorizaciones?.autorizacion;

  if (!autorizacion || autorizacion.length === 0) {
    throw new Error("No se recibió información de autorización del SRI");
  }

  const estado = autorizacion.estado;

  if (estado === "AUTORIZADO") {
    return {
      claveAcceso: autorizacion.claveAcceso,
      estadoAutorizacion: estado,
      comprobante: autorizacion.comprobante,
      comprobanteCrudo: autorizacionXml,
      rucEmisor: autorizacion.numeroAutorizacion ?? "",
      fechaAutorizacion: autorizacion.fechaAutorizacion,
      ambiente: autorizacion.ambiente,
      mensajes: normalizeSriMessages(autorizacion.mensajes?.mensaje),
    };
  }

  if (estado === "NO AUTORIZADO" || estado === "RECHAZADA") {
    const mensaje = autorizacion.mensajes?.mensaje;
    const mensajeFinal = Array.isArray(mensaje) ? mensaje[0] : mensaje;

    if (mensajeFinal) {
      throw new SRIAutorizacionError({
        estado,
        identificador: mensajeFinal.identificador ?? "SIN_IDENTIFICADOR",
        mensaje: mensajeFinal.mensaje ?? "Mensaje no disponible",
        informacionAdicional:
          mensajeFinal.informacionAdicional ?? "Sin información adicional",
        tipo: mensajeFinal.tipo ?? "ERROR",
        claveAcceso: respuesta.claveAccesoConsultada ?? claveAcceso,
        ambiente: autorizacion.ambiente,
        comprobanteXml: autorizacion.comprobante,
      });
    }

    throw new SRIUnauthorizedError(estado);
  }

  throw new SRIUnauthorizedError(estado);
}
