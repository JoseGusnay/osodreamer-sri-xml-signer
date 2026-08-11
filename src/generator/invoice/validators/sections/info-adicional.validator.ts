import { RUC_PROVEEDOR_CAMPO_NOMBRE } from "../../../const";
import { ComprobanteType } from "../../types";
import { esCampoRucProveedor } from "../../utils";

export function validateInfoAdicional(comprobante: ComprobanteType): string[] {
  const { infoAdicional, rucProveedor } = comprobante;
  const errors: string[] = [];

  if (!rucProveedor) {
    return errors;
  }

  const campoManual = infoAdicional?.campoAdicional?.find((campo) =>
    esCampoRucProveedor(campo.nombre)
  );

  if (campoManual && campoManual.value !== rucProveedor) {
    errors.push(
      `El campoAdicional "${RUC_PROVEEDOR_CAMPO_NOMBRE}" (${campoManual.value}) no coincide con "rucProveedor" (${rucProveedor}). Envie solo uno de los dos.`
    );
  }

  return errors;
}
