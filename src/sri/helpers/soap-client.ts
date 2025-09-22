// src/helpers/soap-client.ts
import * as soap from "soap";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export async function createSoapClient(wsdlUrl: string): Promise<soap.Client> {
  return await soap.createClientAsync(wsdlUrl);
}

function unescapeXml(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
export function extractAutorizacionXml(rawResponse: string): string {
  const dom = new DOMParser().parseFromString(rawResponse, "text/xml");
  const autorizacion = dom.getElementsByTagName("autorizacion")[0];
  if (!autorizacion) {
    throw new Error("No se encontró <autorizacion> en la respuesta SOAP.");
  }

  // Busca <comprobante>
  const comprobanteNode = autorizacion.getElementsByTagName("comprobante")[0];
  if (comprobanteNode && comprobanteNode.textContent) {
    const comprobanteXml = unescapeXml(comprobanteNode.textContent);
    // Reemplazar contenido por el XML real
    comprobanteNode.textContent = "";
    comprobanteNode.appendChild(
      new DOMParser().parseFromString(comprobanteXml, "text/xml")
        .documentElement
    );
  }

  const xml = new XMLSerializer().serializeToString(autorizacion);
  return xml;
}
