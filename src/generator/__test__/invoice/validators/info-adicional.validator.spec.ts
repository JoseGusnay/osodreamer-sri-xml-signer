import { ComprobanteType } from "../../../invoice/types";
import { validateInfoAdicional } from "../../../invoice/validators/sections";

function buildComprobante(overrides: Partial<ComprobanteType>) {
  return { infoAdicional: null, ...overrides } as ComprobanteType;
}

describe("validateInfoAdicional (Anexo 26)", () => {
  it("returns no errors when rucProveedor is not provided", () => {
    const errors = validateInfoAdicional(
      buildComprobante({
        infoAdicional: {
          campoAdicional: [{ nombre: "RUC Proveedor", value: "1719369561001" }],
        },
      })
    );

    expect(errors).toEqual([]);
  });

  it("returns no errors when rucProveedor matches the manual campoAdicional", () => {
    const errors = validateInfoAdicional(
      buildComprobante({
        infoAdicional: {
          campoAdicional: [{ nombre: "RUC Proveedor", value: "1719369561001" }],
        },
        rucProveedor: "1719369561001",
      })
    );

    expect(errors).toEqual([]);
  });

  it("reports a conflict when rucProveedor differs from the manual campoAdicional", () => {
    const errors = validateInfoAdicional(
      buildComprobante({
        infoAdicional: {
          campoAdicional: [{ nombre: "RUC Proveedor", value: "0999999999001" }],
        },
        rucProveedor: "1719369561001",
      })
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("RUC Proveedor");
  });

  it("returns no errors when only rucProveedor is provided", () => {
    const errors = validateInfoAdicional(
      buildComprobante({ rucProveedor: "1719369561001" })
    );

    expect(errors).toEqual([]);
  });
});
