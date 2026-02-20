/**
 * @jest-environment node
 */
import * as forge from "node-forge";
import { AnfacStrategy } from "../../../../infrastructure/certificate/strategies";

describe("AnfacStrategy.extra", () => {
  const strategy = new AnfacStrategy();

  function makeCert(issuerAttrs: any[]) {
    return { issuer: { attributes: issuerAttrs } } as forge.pki.Certificate;
  }
  function makeCertBagsWithCert(cert: forge.pki.Certificate): any {
    const bags: any = {};
    bags[forge.pki.oids.certBag] = [{ cert }];
    return bags;
  }

  // -------- supports() ----------
  test("supports() reconoce ANFAC (case-insensitive)", () => {
    expect(strategy.supports("ANFAC Autoridad")).toBe(true);
    expect(strategy.supports("anfac ec")).toBe(true);
    expect(strategy.supports("otra cosa")).toBe(false);
  });

  // -------- getPrivateKey() ----------
  test("getPrivateKey usa item.key si existe", async () => {
    const fakePrivKey = { k: "ok" };
    const bags = [{ key: fakePrivKey }] as any;

    expect(await strategy.getPrivateKey(bags)).toBe(fakePrivKey);
  });

  test("getPrivateKey usa item.asn1 si no hay key (llama forge.pki.privateKeyFromAsn1)", async () => {
    const fakeAsn1 = { asn1: "x" };
    const spy = jest
      .spyOn(forge.pki, "privateKeyFromAsn1")
      .mockReturnValue("DERIVED_KEY" as any);

    const bags = [{ asn1: fakeAsn1 }] as any;

    const res = await strategy.getPrivateKey(bags);
    expect(spy).toHaveBeenCalledWith(fakeAsn1);
    expect(res).toBe("DERIVED_KEY");

    spy.mockRestore();
  });

  test("getPrivateKey lanza si no hay bag[0] o no hay key/asn1", async () => {
    // sin item
    await expect(strategy.getPrivateKey([] as any)).rejects.toThrow();

    // con item sin key ni asn1

    await expect(strategy.getPrivateKey([{}])).rejects.toThrow();
  });

  // -------- overrideIssuerName(): ramas faltantes de attrName ----------
  test("attrName fallback: usa 'name' cuando no hay shortName ni OID mapeado", async () => {
    // OID 2.5.4.12 (title) NO está en tu mapa; sí trae 'name'
    const issuerAttributes = [
      { type: "2.5.4.6", value: "EC", shortName: "C" }, // C
      { type: "2.5.4.12", value: "Arquitecto Jefe", name: "title" }, // -> TITLE por fallback 'name'
      { type: "2.5.4.3", value: "CA Intermedia", shortName: "CN" }, // CN
    ];
    const cert = makeCert(issuerAttributes);
    const dn = await strategy.overrideIssuerName(makeCertBagsWithCert(cert));

    // Orden RFC4514: CN, TITLE, C
    expect(dn).toBe("CN=CA Intermedia,TITLE=Arquitecto Jefe,C=EC");
  });

  test("attrName fallback final: usa OID literal cuando no hay shortName ni name conocidos", async () => {
    // OID inventado (no mapeado) y sin shortName/name
    const issuerAttributes = [
      { type: "2.5.4.6", value: "EC", shortName: "C" }, // C
      { type: "1.2.3.4.5.6", value: "X" }, // -> "1.2.3.4.5.6"
      { type: "2.5.4.3", value: "CA Intermedia", shortName: "CN" }, // CN
    ];
    const cert = makeCert(issuerAttributes);
    const dn = await strategy.overrideIssuerName(makeCertBagsWithCert(cert));

    // Orden RFC4514: CN, 1.2.3.4.5.6, C
    expect(dn).toBe("CN=CA Intermedia,1.2.3.4.5.6=X,C=EC");
  });

  test("escape: respeta valores ASCII simples sin modificar ni agregar escapes", async () => {
    const issuerAttributes = [
      { type: "2.5.4.3", value: "CA", shortName: "CN" },
      { type: "2.5.4.10", value: "ORGANIZACION", shortName: "O" },
    ];
    const cert = makeCert(issuerAttributes);
    const dn = await strategy.overrideIssuerName(makeCertBagsWithCert(cert));

    expect(dn).toBe("O=ORGANIZACION,CN=CA"); // orden invertido por RFC4514
  });
});
