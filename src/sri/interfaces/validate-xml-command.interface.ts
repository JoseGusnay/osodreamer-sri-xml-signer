import { SRIEnv } from "../const";

export interface ValidateXmlCommand {
  xml: Uint8Array;
  env: SRIEnv;
}
