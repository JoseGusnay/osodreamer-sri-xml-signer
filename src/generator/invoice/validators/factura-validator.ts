import { ComprobanteType } from "../types";
import {
  validarDetalles,
  validateInfoAdicional,
  validateInfoFactura,
  validarRetenciones,
} from "./sections";

export function validateFactura(data: ComprobanteType): string[] {
  const errors: string[] = [];
  errors.push(...validarDetalles(data));
  errors.push(...validateInfoFactura(data));
  errors.push(...validarRetenciones(data));
  errors.push(...validateInfoAdicional(data));

  return errors;
}
