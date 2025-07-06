import { uint8ArrayToBase64 } from "../../utils";
import { SRI_URLS } from "../const";
import { SRIRejectedError } from "../exceptions";

import { createSoapClient } from "../helpers";
import { ValidateXmlCommand, ValidateXmlResponse } from "../interfaces";

export async function validateXml(
  data: ValidateXmlCommand
): Promise<ValidateXmlResponse> {
  const { env, xml } = data;
  const client = await createSoapClient(SRI_URLS[env].recepcion);
  const xmlBase64 = uint8ArrayToBase64(xml);

  let result: any;
  try {
    [result] = await client.validarComprobanteAsync({ xml: xmlBase64 });
  } catch (error) {
    throw new Error(`Error SOAP al validar comprobante: ${error.message}`);
  }

  const respuesta = result?.RespuestaRecepcionComprobante;

  if (!respuesta) {
    throw new Error(
      "Respuesta inválida del SRI (sin 'respuestaRecepcionComprobante')"
    );
  }

  const comprobante = Array.isArray(respuesta.comprobantes?.comprobante)
    ? respuesta.comprobantes.comprobante[0]
    : respuesta.comprobantes?.comprobante;

  const mensaje = comprobante?.mensajes?.mensaje;

  if (respuesta.estado !== "RECIBIDA") {
    if (mensaje) {
      throw new SRIRejectedError({
        estado: respuesta.estado,
        identificador: mensaje.identificador ?? "SIN_IDENTIFICADOR",
        mensaje: mensaje.mensaje ?? "Mensaje no disponible",
        informacionAdicional:
          mensaje.informacionAdicional ?? "Sin información adicional",
        tipo: mensaje.tipo ?? "ERROR",
        claveAcceso: comprobante?.claveAcceso ?? "SIN_CLAVE",
      });
    }

    throw new Error(
      "Comprobante no recibido y sin mensaje explicativo del SRI"
    );
  }

  return {
    estado: respuesta.estado,
    mensaje: mensaje?.mensaje ?? "Comprobante recibido correctamente",
  };
}
