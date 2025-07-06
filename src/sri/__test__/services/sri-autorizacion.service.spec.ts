import {
  SRIAutorizacionError,
  SRIUnauthorizedError,
} from "../../exceptions/sri-autorizacion.error";
import * as helpers from "../../helpers";
import { authorizeXml } from "../../services";

// Mock helpers
jest.mock("../../helpers", () => ({
  ...jest.requireActual("../../helpers"),
  createSoapClient: jest.fn(),
  normalizeSriMessages: jest.fn(() => []),
}));

describe("authorizeXml", () => {
  const mockClave = "1234567890123456789012345678901234567890123456";

  const mockClient = {
    autorizacionComprobanteAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debería devolver resultado autorizado correctamente", async () => {
    const mockRespuesta = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: mockClave,
        autorizaciones: {
          autorizacion: {
            estado: "AUTORIZADO",
            claveAcceso: mockClave,
            comprobante: "<xml>Comprobante</xml>",
            numeroAutorizacion: "9999999999",
            fechaAutorizacion: "2025-07-01T12:00:00Z",
            ambiente: "1",
            mensajes: {
              mensaje: [
                {
                  identificador: "00",
                  mensaje: "Autorizado correctamente",
                  tipo: "INFO",
                },
              ],
            },
          },
        },
      },
    };

    (helpers.createSoapClient as jest.Mock).mockResolvedValue(mockClient);
    mockClient.autorizacionComprobanteAsync.mockResolvedValue([mockRespuesta]);

    const result = await authorizeXml({ claveAcceso: mockClave, env: "test" });

    expect(result.estadoAutorizacion).toBe("AUTORIZADO");
    expect(result.claveAcceso).toBe(mockClave);
    expect(result.comprobante).toBe("<xml>Comprobante</xml>");
    expect(result.rucEmisor).toBe("9999999999");
    expect(result.fechaAutorizacion).toBe("2025-07-01T12:00:00Z");
    expect(result.ambiente).toBe("1");
    expect(helpers.normalizeSriMessages).toHaveBeenCalled();
  });

  it("debería lanzar SRIAutorizacionError si está NO AUTORIZADO con mensaje", async () => {
    const mockRespuesta = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: mockClave,
        autorizaciones: {
          autorizacion: {
            estado: "NO AUTORIZADO",
            ambiente: "2",
            comprobante: "<xml>Error</xml>",
            mensajes: {
              mensaje: {
                identificador: "45",
                mensaje: "Comprobante no autorizado",
                tipo: "ERROR",
                informacionAdicional: "Datos incorrectos",
              },
            },
          },
        },
      },
    };

    (helpers.createSoapClient as jest.Mock).mockResolvedValue(mockClient);
    mockClient.autorizacionComprobanteAsync.mockResolvedValue([mockRespuesta]);

    await expect(
      authorizeXml({ claveAcceso: mockClave, env: "prod" })
    ).rejects.toThrow(SRIAutorizacionError);
  });

  it("debería lanzar SRIUnauthorizedError si estado no autorizado sin mensaje", async () => {
    const mockRespuesta = {
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: mockClave,
        autorizaciones: {
          autorizacion: {
            estado: "RECHAZADA",
            mensajes: null,
          },
        },
      },
    };

    (helpers.createSoapClient as jest.Mock).mockResolvedValue(mockClient);
    mockClient.autorizacionComprobanteAsync.mockResolvedValue([mockRespuesta]);

    await expect(
      authorizeXml({ claveAcceso: mockClave, env: "test" })
    ).rejects.toThrow(SRIUnauthorizedError);
  });

  it("debería lanzar error si no hay autorizaciones en la respuesta", async () => {
    const mockRespuesta = {
      RespuestaAutorizacionComprobante: {
        autorizaciones: null,
      },
    };

    (helpers.createSoapClient as jest.Mock).mockResolvedValue(mockClient);
    mockClient.autorizacionComprobanteAsync.mockResolvedValue([mockRespuesta]);

    await expect(
      authorizeXml({ claveAcceso: mockClave, env: "test" })
    ).rejects.toThrow("No se recibió información de autorización del SRI");
  });
});
