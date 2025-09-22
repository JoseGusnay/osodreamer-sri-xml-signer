// src/sri/__test__/services/sri-autorizacion.service.spec.ts

import { SRIAutorizacionError, SRIUnauthorizedError } from "../../exceptions";
import {
  createSoapClient,
  extractAutorizacionXml,
  normalizeSriMessages,
} from "../../helpers";
import { authorizeXml } from "../../services";

// --- Mocks de módulos usados por authorizeXml ---
jest.mock("../../const", () => ({
  SRI_URLS: {
    test: { autorizacion: "https://sri.example.test/autorizacion" },
    prod: { autorizacion: "https://sri.example.prod/autorizacion" },
  },
}));

const mockAutorizacionComprobanteAsync = jest.fn();

jest.mock("../../helpers", () => {
  // Si necesitas algunas utilidades reales de helpers, podrías importarlas aquí
  // const original = jest.requireActual("../../helpers");
  return {
    // ...original,
    createSoapClient: jest.fn(async () => ({
      autorizacionComprobanteAsync: mockAutorizacionComprobanteAsync,
    })),
    extractAutorizacionXml: jest.fn(() => "<autorizacion>xml</autorizacion>"),
    normalizeSriMessages: jest.fn((m) => m),
  };
});

describe("authorizeXml", () => {
  const claveAcceso = "1234567890123456789012345678901234567890123456789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe crear el cliente SOAP con la URL del env correcto", async () => {
    (createSoapClient as unknown as jest.Mock).mockResolvedValue({
      autorizacionComprobanteAsync: mockAutorizacionComprobanteAsync,
    });

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      {
        RespuestaAutorizacionComprobante: {
          autorizaciones: {
            autorizacion: {
              estado: "AUTORIZADO",
              claveAcceso: claveAcceso,
              comprobante: "<xml/>",
              numeroAutorizacion: "1790012345001",
              fechaAutorizacion: "2025-09-21T10:20:30-05:00",
              ambiente: "PRUEBAS",
              mensajes: { mensaje: [] },
            },
          },
        },
      },
      "<raw/>",
    ]);

    await authorizeXml({ claveAcceso, env: "test" } as any);

    expect(createSoapClient).toHaveBeenCalledWith(
      "https://sri.example.test/autorizacion"
    );
  });

  it("retorna respuesta cuando estado es AUTORIZADO", async () => {
    const respuestaOk = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: claveAcceso,
        autorizaciones: {
          autorizacion: {
            estado: "AUTORIZADO",
            claveAcceso,
            comprobante: "<comprobante/>",
            numeroAutorizacion: "1790012345001",
            fechaAutorizacion: "2025-09-21T10:20:30-05:00",
            ambiente: "PRUEBAS",
            mensajes: { mensaje: [{ mensaje: "OK" }] },
          },
        },
      },
    };

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      respuestaOk,
      "<raw/>",
    ]);

    const result = await authorizeXml({ claveAcceso, env: "test" } as any);

    expect(extractAutorizacionXml).toHaveBeenCalledWith("<raw/>");
    expect(normalizeSriMessages).toHaveBeenCalled();
    expect(result).toEqual({
      claveAcceso,
      estadoAutorizacion: "AUTORIZADO",
      comprobante: "<comprobante/>",
      comprobanteCrudo: "<autorizacion>xml</autorizacion>",
      rucEmisor: "1790012345001",
      fechaAutorizacion: "2025-09-21T10:20:30-05:00",
      ambiente: "PRUEBAS",
      mensajes: [{ mensaje: "OK" }],
    });
  });

  it("lanza SRIAutorizacionError cuando estado es NO AUTORIZADO con mensaje", async () => {
    const respuestaNoAut = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: claveAcceso,
        autorizaciones: {
          autorizacion: {
            estado: "NO AUTORIZADO",
            ambiente: "PRODUCCION",
            comprobante: "<comprobante/>",
            mensajes: {
              mensaje: [
                {
                  identificador: "45",
                  // mensaje: "Clave de acceso inválida",
                  informacionAdicional: "Detalle X",
                  tipo: "ERROR",
                },
              ],
            },
          },
        },
      },
    };

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      respuestaNoAut,
      "<raw/>",
    ]);

    const p = authorizeXml({ claveAcceso, env: "prod" } as any);

    await expect(p).rejects.toBeInstanceOf(SRIAutorizacionError);
    await expect(p).rejects.toMatchObject({
      estado: "NO AUTORIZADO",
      identificador: "45",
      // mensaje: "Clave de acceso inválida",
      informacionAdicional: "Detalle X",
      tipo: "ERROR",
      claveAcceso,
      ambiente: "PRODUCCION",
      comprobanteXml: "<comprobante/>",
    });
  });

  it("lanza SRIAutorizacionError cuando estado es RECHAZADA con mensaje único (no array)", async () => {
    const respuestaRech = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: claveAcceso,
        autorizaciones: {
          autorizacion: {
            estado: "RECHAZADA",
            ambiente: "PRODUCCION",
            comprobante: "<comprobante/>",
            mensajes: {
              mensaje: {
                identificador: "99",
                // mensaje: "Documento duplicado",
                informacionAdicional: "Ya fue autorizado antes",
                tipo: "ERROR",
              },
            },
          },
        },
      },
    };

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      respuestaRech,
      "<raw/>",
    ]);

    const p = authorizeXml({ claveAcceso, env: "prod" } as any);

    await expect(p).rejects.toBeInstanceOf(SRIAutorizacionError);
    await expect(p).rejects.toMatchObject({
      estado: "RECHAZADA",
      identificador: "99",
      // mensaje: "Documento duplicado",
    });
  });

  it("lanza SRIUnauthorizedError cuando NO AUTORIZADO sin mensajes", async () => {
    const respuestaSinMsg = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: claveAcceso,
        autorizaciones: {
          autorizacion: {
            estado: "NO AUTORIZADO",
            ambiente: "PRUEBAS",
            comprobante: "<comprobante/>",
            mensajes: undefined,
          },
        },
      },
    };

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      respuestaSinMsg,
      "<raw/>",
    ]);

    await expect(
      authorizeXml({ claveAcceso, env: "test" } as any)
    ).rejects.toBeInstanceOf(SRIUnauthorizedError);
  });

  it("lanza Error genérico cuando no hay autorizacion en la respuesta", async () => {
    const respuestaVacia = {
      RespuestaAutorizacionComprobante: {
        autorizaciones: {
          autorizacion: undefined,
        },
      },
    };

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      respuestaVacia,
      "<raw/>",
    ]);

    await expect(
      authorizeXml({ claveAcceso, env: "test" } as any)
    ).rejects.toThrow("No se recibió información de autorización del SRI");
  });

  it("lanza SRIUnauthorizedError en estado desconocido", async () => {
    const respuestaDesconocido = {
      RespuestaAutorizacionComprobante: {
        autorizaciones: {
          autorizacion: {
            estado: "PENDIENTE", // no contemplado por la función
            ambiente: "PRUEBAS",
          },
        },
      },
    };

    mockAutorizacionComprobanteAsync.mockResolvedValueOnce([
      respuestaDesconocido,
      "<raw/>",
    ]);

    await expect(
      authorizeXml({ claveAcceso, env: "test" } as any)
    ).rejects.toBeInstanceOf(SRIUnauthorizedError);
  });
});
