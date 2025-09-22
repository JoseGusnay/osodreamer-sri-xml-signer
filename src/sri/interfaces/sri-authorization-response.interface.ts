export interface SriAuthorizationMessage {
  identificador: string;
  mensaje: string;
  tipo: string;
  informacionAdicional?: string;
}

export interface SriAuthorizationResponse {
  claveAcceso: string;
  estadoAutorizacion: string;
  comprobante: string;
  rucEmisor: string;
  fechaAutorizacion: string;
  ambiente: string;
  comprobanteCrudo: string;
  mensajes: SriAuthorizationMessage[] | null;
}
