// __tests__/invoice-xml.factory.spec.ts
import {
  ENV_ENUM,
  IDENTIFICATION_CODE_ENUM,
  OBLIGADO_CONTABILIDAD_ENUM,
  PAYMENT_METHOD_CODE_ENUM,
  TAX_CODE_ENUM,
} from "../../../enums";
import { InvoiceXmlFactory } from "../../../invoice/factory";
import { ComprobanteType } from "../../../invoice/types";

describe("InvoiceXmlFactory", () => {
  let factory: InvoiceXmlFactory;
  const baseInvoice: ComprobanteType = {
    infoTributaria: {
      ambiente: ENV_ENUM.TEST,
      dirMatriz: "Av. Siempre Viva 123",
      estab: "001",
      ptoEmi: "002",
      razonSocial: "Mi Empresa S.A.",
      nombreComercial: "Mi Comercio",
      ruc: "1234567890001",
      secuencial: "000000123",
      agenteRetencion: null,
      contribuyenteRimpe: null,
    },
    infoFactura: {
      fechaEmision: new Date("2025-07-01"),
      dirEstablecimiento: "Av. Comercio 456",
      contribuyenteEspecial: null,
      obligadoContabilidad: OBLIGADO_CONTABILIDAD_ENUM.NO,
      tipoIdentificacionComprador: IDENTIFICATION_CODE_ENUM.CEDULA,
      razonSocialComprador: "Cliente Prueba",
      identificacionComprador: "0102030405",
      direccionComprador: "Calle Falsa 789",
      totalSinImpuestos: 100,
      totalDescuento: 5,
      totalConImpuestos: {
        totalImpuesto: [
          {
            codigo: TAX_CODE_ENUM.VAT,
            codigoPorcentaje: 0,
            descuentoAdicional: null,
            baseImponible: 100,
            valor: 12,
          },
        ],
      },
      propina: 0,
      importeTotal: 112,
      moneda: "USD",
      pagos: {
        pago: [
          {
            formaPago:
              PAYMENT_METHOD_CODE_ENUM.SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO,
            total: 112,
            plazo: null,
            unidadTiempo: null,
          },
        ],
      },
      guiaRemision: null,
      valorRetIva: 0,
      valorRetRenta: 0,
    },
    detalles: {
      detalle: [
        {
          codigoPrincipal: "A1",
          codigoAuxiliar: null,
          descripcion: "Producto A",
          cantidad: 2,
          precioUnitario: 10,
          descuento: 0,
          precioTotalSinImpuesto: 20,
          detallesAdicionales: { detAdicional: [] },
          impuestos: {
            impuesto: [
              {
                codigo: TAX_CODE_ENUM.VAT,
                codigoPorcentaje: 0,
                tarifa: 12,
                baseImponible: 20,
                valor: 2.4,
              },
            ],
          },
        },
      ],
    },
    infoAdicional: null,
    retenciones: null,
  };

  beforeAll(() => {
    factory = new InvoiceXmlFactory();
  });

  it("should build the minimal factura JSON correctly", () => {
    const result = factory.create(baseInvoice);

    expect(result.factura).toMatchObject({
      $: { id: "comprobante", version: "1.1.0" },

      infoTributaria: {
        ambiente: ENV_ENUM.TEST, // numeric
        tipoEmision: "1",
        razonSocial: "Mi Empresa S.A.",
        nombreComercial: "Mi Comercio",
        ruc: "1234567890001",
        codDoc: "01",
        estab: "001",
        ptoEmi: "002",
        secuencial: "000000123",
        dirMatriz: "Av. Siempre Viva 123",
        agenteRetencion: null,
        contribuyenteRimpe: null,
      },

      infoFactura: {
        fechaEmision: "30/06/2025",
        dirEstablecimiento: "Av. Comercio 456",
        contribuyenteEspecial: null,
        obligadoContabilidad: OBLIGADO_CONTABILIDAD_ENUM.NO, // "NO"
        tipoIdentificacionComprador: IDENTIFICATION_CODE_ENUM.CEDULA,
        razonSocialComprador: "Cliente Prueba",
        identificacionComprador: "0102030405",
        direccionComprador: "Calle Falsa 789",
        totalSinImpuestos: "100.00",
        totalDescuento: "5.00",
        totalConImpuestos: {
          totalImpuesto: [
            {
              codigo: TAX_CODE_ENUM.VAT, // numeric
              codigoPorcentaje: "0",
              descuentoAdicional: null,
              baseImponible: "100.00",
              valor: "12.00",
            },
          ],
        },
        propina: "0.00",
        importeTotal: "112.00",
        moneda: "USD",
        pagos: {
          pago: [
            {
              formaPago:
                PAYMENT_METHOD_CODE_ENUM.SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO,
              total: "112.00",
              plazo: null,
              unidadTiempo: null,
            },
          ],
        },
        valorRetIva: "0.00",
        valorRetRenta: "0.00",
        guiaRemision: null,
      },

      detalles: {
        detalle: [
          {
            codigoPrincipal: "A1",
            codigoAuxiliar: null,
            descripcion: "Producto A",
            cantidad: "2.000000",
            precioUnitario: "10.000000",
            descuento: "0.00",
            precioTotalSinImpuesto: "20.00",
            detallesAdicionales: { detAdicional: [] }, // objeto vacío, no null
            impuestos: {
              impuesto: [
                {
                  codigo: TAX_CODE_ENUM.VAT, // numeric
                  codigoPorcentaje: "0",
                  tarifa: "12",
                  baseImponible: "20.00",
                  valor: "2.40",
                },
              ],
            },
          },
        ],
      },

      retenciones: null,
      infoAdicional: null,
    });
  });

  it("should override identificacionComprador for CONSUMIDOR_FINAL", () => {
    const invoice = {
      ...baseInvoice,
      infoFactura: {
        ...baseInvoice.infoFactura,
        tipoIdentificacionComprador: IDENTIFICATION_CODE_ENUM.CONSUMIDOR_FINAL,
        identificacionComprador: "0000000000",
      },
    };
    const result = factory.create(invoice);
    expect(result.factura.infoFactura.identificacionComprador).toBe(
      "9999999999999"
    );
  });
  // 1) cobertura para descuentoAdicional != null
  it("should format descuentoAdicional when provided", () => {
    const invoice = {
      ...getBaseInvoice(),
      infoFactura: {
        ...getBaseInvoice().infoFactura,
        totalConImpuestos: {
          totalImpuesto: [
            {
              codigo: TAX_CODE_ENUM.VAT,
              codigoPorcentaje: 2,
              descuentoAdicional: 3.14159, // rama con valor
              baseImponible: 50,
              valor: 6,
            },
          ],
        },
      },
    };
    const result = factory.create(invoice);
    const ti = result.factura.infoFactura.totalConImpuestos.totalImpuesto[0];
    expect(ti.descuentoAdicional).toBe("3.14");
  });

  // 2) cobertura para retenciones no nulo
  it("should include retenciones when present", () => {
    const invoice = {
      ...getBaseInvoice(),
      retenciones: {
        retencion: [
          { codigo: "1", codigoPorcentaje: "2", tarifa: 12, valor: 5.5 },
        ],
      },
    };
    const result = factory.create(invoice as any);
    expect(result.factura.retenciones).not.toBeNull();
    expect(result.factura.retenciones!.retencion).toEqual([
      { codigo: "1", codigoPorcentaje: "2", tarifa: "12.00", valor: "5.50" },
    ]);
  });

  // 3) cobertura para infoAdicional no nulo
  it("should include infoAdicional when present", () => {
    const invoice = {
      ...getBaseInvoice(),
      infoAdicional: {
        campoAdicional: [{ nombre: "Nota", value: "Sin novedad" }],
      },
    };
    const result = factory.create(invoice);
    expect(result.factura.infoAdicional).not.toBeNull();
    expect(result.factura.infoAdicional!.campoAdicional).toEqual([
      { $: { nombre: "Nota" }, _: "Sin novedad" },
    ]);
  });

  // 4) cobertura para detallesAdicionales con entries
  it("should include detalle adicionales cuando hay valores", () => {
    const invoice = {
      ...getBaseInvoice(),
      detalles: {
        detalle: [
          {
            ...getBaseInvoice().detalles.detalle[0],
            detallesAdicionales: {
              detAdicional: [{ nombre: "Color", valor: "Rojo" }],
            },
          },
        ],
      },
    };
    const result = factory.create(invoice);
    const det = result.factura.detalles.detalle[0];
    expect(det.detallesAdicionales).toEqual({
      detAdicional: [{ $: { nombre: "Color", valor: "Rojo" } }],
    });
  });
  it("should set detallesAdicionales to null when not provided", () => {
    // Construimos un invoice igual al base, pero sin detallesAdicionales en el primer detalle
    const invoice: ComprobanteType = {
      ...getBaseInvoice(),
      detalles: {
        detalle: [
          {
            ...getBaseInvoice().detalles.detalle[0],
            detallesAdicionales: undefined as any, // simula que no viene
          },
        ],
      },
    };

    const result = factory.create(invoice);
    const det = result.factura.detalles.detalle[0];
    expect(det.detallesAdicionales).toBeNull();
  });
});
/** helper - copia aquí tu baseInvoice original */
function getBaseInvoice(): ComprobanteType {
  return {
    infoTributaria: {
      ambiente: ENV_ENUM.TEST,
      dirMatriz: "Av. Siempre Viva 123",
      estab: "001",
      ptoEmi: "002",
      razonSocial: "Mi Empresa S.A.",
      nombreComercial: "Mi Comercio",
      ruc: "1234567890001",
      secuencial: "000000123",
      agenteRetencion: null,
      contribuyenteRimpe: null,
    },
    infoFactura: {
      fechaEmision: new Date("2025-07-01T00:00:00"),
      dirEstablecimiento: "Av. Comercio 456",
      contribuyenteEspecial: null,
      obligadoContabilidad: OBLIGADO_CONTABILIDAD_ENUM.NO,
      tipoIdentificacionComprador: IDENTIFICATION_CODE_ENUM.CEDULA,
      razonSocialComprador: "Cliente Prueba",
      identificacionComprador: "0102030405",
      direccionComprador: "Calle Falsa 789",
      totalSinImpuestos: 100,
      totalDescuento: 5,
      totalConImpuestos: {
        totalImpuesto: [
          {
            codigo: TAX_CODE_ENUM.VAT,
            codigoPorcentaje: 0,
            descuentoAdicional: null,
            baseImponible: 100,
            valor: 12,
          },
        ],
      },
      propina: 0,
      importeTotal: 112,
      moneda: "USD",
      pagos: {
        pago: [
          {
            formaPago:
              PAYMENT_METHOD_CODE_ENUM.SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO,
            total: 112,
            plazo: null,
            unidadTiempo: null,
          },
        ],
      },
      guiaRemision: null,
      valorRetIva: 0,
      valorRetRenta: 0,
    },
    detalles: {
      detalle: [
        {
          codigoPrincipal: "A1",
          codigoAuxiliar: null,
          descripcion: "Producto A",
          cantidad: 2,
          precioUnitario: 10,
          descuento: 0,
          precioTotalSinImpuesto: 20,
          detallesAdicionales: { detAdicional: [] },
          impuestos: {
            impuesto: [
              {
                codigo: TAX_CODE_ENUM.VAT,
                codigoPorcentaje: 0,
                tarifa: 12,
                baseImponible: 20,
                valor: 2.4,
              },
            ],
          },
        },
      ],
    },
    infoAdicional: null,
    retenciones: null,
  };
}
