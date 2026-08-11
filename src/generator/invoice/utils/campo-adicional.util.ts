import { RUC_PROVEEDOR_CAMPO_NOMBRE } from "../../const";

/**
 * Indica si el nombre de un campoAdicional corresponde al del Anexo 26
 * ("RUC Proveedor"), ignorando mayusculas y espacios sobrantes.
 */
export function esCampoRucProveedor(nombre: string): boolean {
  return (
    nombre?.trim().toLowerCase() === RUC_PROVEEDOR_CAMPO_NOMBRE.toLowerCase()
  );
}
