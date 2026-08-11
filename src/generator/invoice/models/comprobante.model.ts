// models/invoice.export class.ts

import {
  Digits,
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsNumericString,
  IsOptional,
  IsRequired,
  IsString,
  Length,
  MaxDigits,
  ValidateNested,
} from "../../../lightweight-validator/decorators";

import {
  ENV_ENUM,
  TAX_CODE_ENUM,
  CONTRIBUYENTE_RIMPE_ENUM,
  OBLIGADO_CONTABILIDAD_ENUM,
  PAYMENT_METHOD_CODE_ENUM,
  IDENTIFICATION_CODE_ENUM,
  CODIGO_RETENCION_ENUM,
  IMPUESTO_A_RETENER_ENUM,
} from "../../enums";

export class InfoTributariaModel {
  @IsRequired()
  @IsEnum(ENV_ENUM)
  ambiente: ENV_ENUM;

  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  razonSocial: string;

  @IsString()
  @Length({ max: 300 })
  @IsOptional()
  nombreComercial?: string;

  @IsString()
  @Length({ exact: 13 })
  @IsNumericString()
  @IsRequired()
  ruc: string;

  @IsString()
  @Length({ exact: 3 })
  @IsNumericString()
  @IsRequired()
  estab: string;

  @IsString()
  @Length({ exact: 3 })
  @IsNumericString()
  @IsRequired()
  ptoEmi: string;

  @IsString()
  @Length({ exact: 9 })
  @IsNumericString()
  @IsRequired()
  secuencial: string;

  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  dirMatriz: string;

  @IsString()
  @Length({ min: 1, max: 8 })
  @IsNumericString()
  @IsOptional()
  agenteRetencion?: string;

  @IsEnum(CONTRIBUYENTE_RIMPE_ENUM)
  @IsOptional()
  contribuyenteRimpe?: CONTRIBUYENTE_RIMPE_ENUM;
}

export class TotalImpuestoModel {
  @IsEnum(TAX_CODE_ENUM)
  @IsRequired()
  codigo: TAX_CODE_ENUM;

  @IsNumber()
  @MaxDigits(4)
  @IsRequired()
  codigoPorcentaje: number; //TODO: VALIDAR ACORDE DEL CODIGO

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  baseImponible: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  valor: number;

  @IsNumber()
  @MaxDigits(14)
  @IsOptional()
  descuentoAdicional?: number; //TODO: SOLO PARA EL CODIGO TAX_CODE_ENUM VAT= 2
}

export class TotalConImpuestosModel {
  @IsArray(() => TotalImpuestoModel)
  @IsRequired()
  totalImpuesto: TotalImpuestoModel[];
}

export class PagoModel {
  @IsEnum(PAYMENT_METHOD_CODE_ENUM)
  @IsRequired()
  formaPago: PAYMENT_METHOD_CODE_ENUM;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  total: number;

  @IsNumber()
  @MaxDigits(14)
  @IsOptional()
  plazo?: number;

  @IsString()
  @Length({ max: 10 })
  @IsOptional()
  unidadTiempo?: string;
}

export class PagosModel {
  @IsArray(() => PagoModel)
  @IsRequired()
  pago: PagoModel[];
}

export class InfoFacturaModel {
  @IsDate()
  @IsRequired()
  fechaEmision: Date;

  @IsString()
  @Length({ max: 300 })
  @IsOptional()
  dirEstablecimiento: string;

  @IsString()
  @Length({ min: 3, max: 13 })
  @IsOptional()
  contribuyenteEspecial?: string;

  @IsEnum(OBLIGADO_CONTABILIDAD_ENUM)
  @IsOptional()
  obligadoContabilidad?: OBLIGADO_CONTABILIDAD_ENUM;

  // @IsBoolean()
  // @IsOptional()
  // EXPORTACION: boolean;

  // @IsString()
  // @IsOptional()
  // comercioExterior?: "EXPORTADOR";

  // @IsString()
  // @IsOptional()
  // incoTermFactura?: string;

  // @IsString()
  // @IsOptional()
  // lugarIncoTerm?: string;

  // @IsString()
  // @IsOptional()
  // paisOrigen?: string;

  // @IsString()
  // @IsOptional()
  // puertoEmbarque?: string;

  // @IsString()
  // @IsOptional()
  // puertoDestino?: string;

  // @IsString()
  // @IsOptional()
  // paisDestino?: string;

  // @IsString()
  // @IsOptional()
  // paisAdquisicion?: string;

  // @IsString()
  // @IsOptional()
  // incoTermTotalSinImpuestos?: string;

  // @IsNumber()
  // @IsOptional()
  // fleteInternacional?: number;

  // @IsNumber()
  // @IsOptional()
  // seguroInternacional?: number;

  // @IsNumber()
  // @IsOptional()
  // gastosAduaneros?: number;

  // @IsNumber()
  // @IsOptional()
  // gastosTransporteOtros?: number;

  @IsEnum(IDENTIFICATION_CODE_ENUM)
  @IsRequired()
  tipoIdentificacionComprador: IDENTIFICATION_CODE_ENUM;

  @IsString()
  @Length({ exact: 17 })
  @IsOptional()
  guiaRemision?: string; //TODO: validacion segun formato

  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  razonSocialComprador: string;

  @IsString()
  @Length({ max: 20 })
  @IsRequired()
  identificacionComprador: string;

  @IsString()
  @Length({ max: 300 })
  @IsOptional()
  direccionComprador?: string;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  totalSinImpuestos: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  totalDescuento: number;

  @ValidateNested(() => TotalConImpuestosModel)
  @IsRequired()
  totalConImpuestos: TotalConImpuestosModel;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  propina: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  importeTotal: number;

  @IsString()
  @MaxDigits(15)
  @IsOptional()
  moneda?: string;

  @ValidateNested(() => PagosModel)
  @IsRequired()
  pagos: PagosModel;

  @IsNumber()
  @Digits({ integer: 15, fraction: 2 })
  @IsOptional()
  valorRetIva?: number;

  @IsNumber()
  @Digits({ integer: 15, fraction: 2 })
  @IsOptional()
  valorRetRenta?: number;
}

export class DetAdicionalModel {
  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  nombre: string;

  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  valor: string;
}

export class ImpuestoDetalleModel {
  @IsEnum(TAX_CODE_ENUM)
  @IsRequired()
  codigo: TAX_CODE_ENUM;

  @IsNumber()
  @MaxDigits(4)
  @IsRequired()
  codigoPorcentaje: number; //TODO: validar tambien a corde con el TAX_CODE_ENUM vat = 2

  @IsNumber()
  @Digits({ integer: 2, fraction: 2 })
  @IsRequired()
  tarifa: number; //TODO: TIENE QUE TENER MAX 4 2 ENTEROS Y DOS DECIMALES

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  baseImponible: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  valor: number;
}

export class DetallesAdicionalesModel {
  @IsArray(() => DetAdicionalModel)
  @IsRequired()
  detAdicional: DetAdicionalModel[];
}

export class ImpuestosModel {
  @IsArray(() => ImpuestoDetalleModel)
  @IsRequired()
  impuesto: ImpuestoDetalleModel[];
}

export class DetalleModel {
  @IsString()
  @Length({ max: 25 })
  @IsRequired()
  codigoPrincipal: string;

  @IsString()
  @Length({ max: 25 })
  @IsOptional()
  codigoAuxiliar?: string;

  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  descripcion: string;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  cantidad: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  precioUnitario: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  descuento: number;

  @IsNumber()
  @MaxDigits(14)
  @IsRequired()
  precioTotalSinImpuesto: number;

  @ValidateNested(() => DetallesAdicionalesModel)
  @IsOptional()
  detallesAdicionales?: DetallesAdicionalesModel;

  @ValidateNested(() => ImpuestosModel)
  @IsRequired()
  impuestos: ImpuestosModel;
}

export class CampoAdicionalModel {
  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  nombre: string;

  @IsString()
  @Length({ max: 300 })
  @IsRequired()
  value: string;
}

export class InfoAdicionalModel {
  @IsArray(() => CampoAdicionalModel)
  @IsRequired()
  campoAdicional: CampoAdicionalModel[];
}

export class DetallesModel {
  @IsArray(() => DetalleModel)
  @IsRequired()
  detalle: DetalleModel[];
}

export class RetencionesModel {
  @IsArray(() => RetencionModel)
  @IsRequired()
  retencion: RetencionModel[];
}
export class RetencionModel {
  @IsEnum(IMPUESTO_A_RETENER_ENUM)
  @IsRequired()
  codigo: IMPUESTO_A_RETENER_ENUM;

  @IsEnum(CODIGO_RETENCION_ENUM)
  @IsRequired()
  codigoPorcentaje: CODIGO_RETENCION_ENUM; //TODO: validar tambien a corde con el TAX_CODE_ENUM vat = 2

  @IsNumber()
  @Digits({ integer: 3, fraction: 2 })
  @IsRequired()
  tarifa: number; //TODO: TIENE QUE TENER MAX 4 2 ENTEROS Y DOS DECIMALES

  @IsNumber()
  @Digits({ integer: 12, fraction: 2 })
  @IsRequired()
  valor: number;
}

export class ComprobanteModel {
  @ValidateNested(() => InfoTributariaModel)
  @IsRequired()
  infoTributaria: InfoTributariaModel;

  @ValidateNested(() => InfoFacturaModel)
  @IsRequired()
  infoFactura: InfoFacturaModel;

  @ValidateNested(() => DetallesModel)
  @IsRequired()
  detalles: DetallesModel;

  @ValidateNested(() => RetencionesModel)
  @IsOptional()
  retenciones?: RetencionesModel;

  @ValidateNested(() => InfoAdicionalModel)
  @IsOptional()
  infoAdicional?: InfoAdicionalModel;

  /**
   * Anexo 26: RUC del proveedor del sistema o servicio de facturacion
   * electronica. Se agrega automaticamente a infoAdicional como
   * <campoAdicional nombre="RUC Proveedor">.
   */
  @IsString()
  @Length({ exact: 13 })
  @IsNumericString()
  @IsOptional()
  rucProveedor?: string;
}
