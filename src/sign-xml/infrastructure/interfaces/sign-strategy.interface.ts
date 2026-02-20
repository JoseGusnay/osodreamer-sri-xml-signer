import * as forge from "node-forge";

export interface SignStrategy {
  supports(friendlyName: string): boolean;

  getPrivateKey(bags: any[]): Promise<any>;

  overrideIssuerName(certBags: any): Promise<string>;
}
