import { SRIRejectedError } from "../../exceptions";
import * as helpers from "../../helpers";

import { validateXml } from "../../services";

// Mock helpers
jest.mock("../../helpers", () => ({
  createSoapClient: jest.fn(),
}));

jest.mock("../../../utils", () => ({
  uint8ArrayToBase64: jest.fn(() => "mockedBase64"),
}));

describe("validarComprobante", () => {
  const mockClient = {
    validarComprobanteAsync: jest.fn(),
  };

  const mockXml = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    jest.clearAllMocks();
    (helpers.createSoapClient as jest.Mock).mockResolvedValue(mockClient);
  });

  it("debería retornar estado RECIBIDA correctamente", async () => {
    const mockRespuesta = {
      RespuestaRecepcionComprobante: {
        estado: "RECIBIDA",
        comprobantes: {
          comprobante: {
            mensajes: {
              mensaje: {
                mensaje: "Comprobante recibido correctamente",
              },
            },
          },
        },
      },
    };

    mockClient.validarComprobanteAsync.mockResolvedValue([mockRespuesta]);

    const result = await validateXml({ xml: mockXml, env: "test" });

    expect(result.estado).toBe("RECIBIDA");
    expect(result.mensaje).toBe("Comprobante recibido correctamente");
  });

  it("debería lanzar SRIRejectedError si el comprobante no fue recibido con mensaje", async () => {
    const mockRespuesta = {
      RespuestaRecepcionComprobante: {
        estado: "DEVUELTA",
        comprobantes: {
          comprobante: {
            claveAcceso: "12345678901234567890",
            mensajes: {
              mensaje: {
                identificador: "45",
                mensaje: "XML mal formado",
                informacionAdicional: "Revisar estructura",
                tipo: "ERROR",
              },
            },
          },
        },
      },
    };

    mockClient.validarComprobanteAsync.mockResolvedValue([mockRespuesta]);

    await expect(validateXml({ xml: mockXml, env: "test" })).rejects.toThrow(
      SRIRejectedError
    );
  });

  it("debería lanzar Error si comprobante no fue recibido y no hay mensaje", async () => {
    const mockRespuesta = {
      RespuestaRecepcionComprobante: {
        estado: "DEVUELTA",
        comprobantes: {
          comprobante: {
            mensajes: null,
          },
        },
      },
    };

    mockClient.validarComprobanteAsync.mockResolvedValue([mockRespuesta]);

    await expect(validateXml({ xml: mockXml, env: "test" })).rejects.toThrow(
      "Comprobante no recibido y sin mensaje explicativo del SRI"
    );
  });

  it("debería lanzar Error si respuesta SOAP no tiene RespuestaRecepcionComprobante", async () => {
    const mockRespuesta = {
      otroCampo: {},
    };

    mockClient.validarComprobanteAsync.mockResolvedValue([mockRespuesta]);

    await expect(validateXml({ xml: mockXml, env: "test" })).rejects.toThrow(
      "Respuesta inválida del SRI"
    );
  });

  it("debería lanzar Error si hay un fallo en el cliente SOAP", async () => {
    mockClient.validarComprobanteAsync.mockRejectedValue(
      new Error("Conexión fallida")
    );

    await expect(validateXml({ xml: mockXml, env: "test" })).rejects.toThrow(
      "Error SOAP al validar comprobante: Conexión fallida"
    );
  });
});
