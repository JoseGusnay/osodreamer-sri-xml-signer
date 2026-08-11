import {
  documentTypeCodes,
  documentTypeName,
  RUC_PROVEEDOR_CAMPO_NOMBRE,
} from "../../const";
import { IDENTIFICATION_CODE_ENUM } from "../../enums";

import { InvoiceSriBuilder, Detalle } from "../models";
import { ComprobanteType } from "../types";

import {
  esCampoRucProveedor,
  p_obtener_codigo_autorizacion,
  pad,
} from "../utils";

export class InvoiceXmlFactory {
  create(invoice: ComprobanteType): InvoiceSriBuilder {
    const {
      detalles,
      infoFactura,
      infoTributaria,
      infoAdicional,
      retenciones,
      rucProveedor,
    } = invoice;
    const {
      ambiente,
      dirMatriz,
      estab,
      ptoEmi,
      razonSocial,
      ruc,
      secuencial,
      agenteRetencion,
      contribuyenteRimpe,
      nombreComercial,
    } = infoTributaria;

    const {
      dirEstablecimiento,
      identificacionComprador,
      importeTotal,
      pagos,
      propina,
      razonSocialComprador,
      tipoIdentificacionComprador,
      totalConImpuestos,
      totalDescuento,
      totalSinImpuestos,
      contribuyenteEspecial,
      direccionComprador,
      guiaRemision,
      moneda,
      obligadoContabilidad,
      fechaEmision,
      valorRetIva,
      valorRetRenta,
    } = infoFactura;
    let fechaClave = new Date(fechaEmision);
    const fechaEmisionParseada = [
      ("0" + fechaClave.getDate()).slice(-2),
      ("0" + (fechaClave.getMonth() + 1)).slice(-2),
      fechaClave.getFullYear(),
    ].join("/");

    const tipoEmision = "1"; // online u offline
    const codDoc = pad(documentTypeCodes.factura, 2); //tipo de comprobande 01 corresponde a factura

    const clave = p_obtener_codigo_autorizacion(
      fechaClave,
      documentTypeName[1],
      infoTributaria.ruc,
      infoTributaria.ambiente,
      Number(estab),
      Number(ptoEmi),
      infoTributaria.secuencial,
      null,
      Number(tipoEmision)
    );
    let claveAcceso = clave;
    const jsonFactura: InvoiceSriBuilder = {
      factura: {
        $: { id: "comprobante", version: "1.1.0" },
        infoTributaria: {
          ambiente,
          tipoEmision,
          razonSocial,
          nombreComercial,
          ruc,
          claveAcceso,
          codDoc,
          estab,
          ptoEmi,
          secuencial,
          dirMatriz,
          agenteRetencion,
          contribuyenteRimpe,
        },
        infoFactura: {
          fechaEmision: fechaEmisionParseada,
          dirEstablecimiento,
          contribuyenteEspecial,
          obligadoContabilidad,
          tipoIdentificacionComprador,
          guiaRemision,
          razonSocialComprador,
          identificacionComprador:
            tipoIdentificacionComprador ===
            IDENTIFICATION_CODE_ENUM.CONSUMIDOR_FINAL
              ? "9999999999999"
              : identificacionComprador,
          direccionComprador,
          totalSinImpuestos: totalSinImpuestos.toFixed(2),
          totalDescuento: totalDescuento.toFixed(2),
          totalConImpuestos: {
            totalImpuesto: [],
          },
          propina: propina.toFixed(2),
          importeTotal: importeTotal.toFixed(2),
          moneda: moneda || "DOLAR",
          pagos: {
            pago: [],
          },
          valorRetIva: valorRetIva != null ? valorRetIva.toFixed(2) : null,
          valorRetRenta:
            valorRetRenta != null ? valorRetRenta.toFixed(2) : null,
        },
        detalles: {
          detalle: [],
        },
        retenciones: {
          retencion: [],
        },
        infoAdicional: {
          campoAdicional: [],
        },
      },
    };

    // 1. Tomamos la lista (o único objeto) si existe
    const retencion = retenciones?.retencion;

    if (retencion) {
      for (const campo of retencion) {
        jsonFactura.factura.retenciones.retencion.push({
          codigo: campo.codigo,
          codigoPorcentaje: campo.codigoPorcentaje,
          tarifa: campo.tarifa.toFixed(2),
          valor: campo.valor.toFixed(2),
        });
      }
    } else {
      jsonFactura.factura.retenciones = null;
    }

    // 1. Tomamos la lista (o único objeto) si existe
    const campoAdicional = infoAdicional?.campoAdicional;

    if (campoAdicional || rucProveedor) {
      for (const campo of campoAdicional ?? []) {
        // Anexo 26: si viene "rucProveedor" es la fuente de verdad, evitamos duplicar el campo
        if (rucProveedor && esCampoRucProveedor(campo.nombre)) {
          continue;
        }
        jsonFactura.factura.infoAdicional.campoAdicional.push({
          $: { nombre: campo.nombre },
          _: campo.value,
        });
      }

      // Anexo 26: RUC del proveedor del sistema de facturación electrónica
      if (rucProveedor) {
        jsonFactura.factura.infoAdicional.campoAdicional.push({
          $: { nombre: RUC_PROVEEDOR_CAMPO_NOMBRE },
          _: rucProveedor,
        });
      }
    } else {
      jsonFactura.factura.infoAdicional = null;
    }
    for (const impuesto of totalConImpuestos.totalImpuesto) {
      jsonFactura.factura.infoFactura.totalConImpuestos.totalImpuesto.push({
        codigo: impuesto.codigo,
        codigoPorcentaje: impuesto.codigoPorcentaje.toString(),
        descuentoAdicional: impuesto.descuentoAdicional
          ? impuesto.descuentoAdicional.toFixed(2)
          : null,
        baseImponible: impuesto.baseImponible.toFixed(2),
        valor: impuesto.valor.toFixed(2),
      });
    }

    for (const pago of pagos.pago) {
      jsonFactura.factura.infoFactura.pagos.pago.push({
        formaPago: pago.formaPago,
        total: Number(pago.total).toFixed(2),
        plazo: pago.plazo,
        unidadTiempo: pago.unidadTiempo,
      });
    }
    for (const detalle of detalles.detalle) {
      const detalleFactura: Detalle = {
        codigoPrincipal: detalle.codigoPrincipal,
        codigoAuxiliar: detalle.codigoAuxiliar,
        descripcion: detalle.descripcion,
        cantidad: detalle.cantidad.toFixed(6),
        precioUnitario: Number(detalle.precioUnitario).toFixed(6),
        descuento: detalle.descuento.toFixed(2),
        precioTotalSinImpuesto: detalle.precioTotalSinImpuesto.toFixed(2),
        detallesAdicionales: { detAdicional: [] },
        impuestos: {
          impuesto: [],
        },
      };

      const detAdicionales = detalle.detallesAdicionales?.detAdicional;
      if (detAdicionales) {
        for (const det of detAdicionales) {
          detalleFactura.detallesAdicionales.detAdicional.push({
            $: { nombre: det.nombre, valor: det.valor },
          });
        }
      } else {
        detalleFactura.detallesAdicionales = null;
      }

      for (const impuesto of detalle.impuestos.impuesto) {
        detalleFactura.impuestos.impuesto.push({
          codigo: impuesto.codigo,
          codigoPorcentaje: impuesto.codigoPorcentaje.toString(),
          tarifa: impuesto.tarifa.toString(),
          baseImponible: impuesto.baseImponible.toFixed(2),
          valor: impuesto.valor.toFixed(2),
        });
      }
      jsonFactura.factura.detalles.detalle.push(detalleFactura);
    }

    return { factura: jsonFactura.factura };
  }
}
