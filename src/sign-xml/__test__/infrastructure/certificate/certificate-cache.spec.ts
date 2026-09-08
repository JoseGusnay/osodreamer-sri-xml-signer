import {
  CERTIFICATE_CACHE_MAX_ENTRIES,
  certificateCacheKey,
  certificateCacheMaxEntries,
  certificateCacheSize,
  clearCertificateCache,
  getCachedCertificate,
  setCachedCertificate,
} from "../../../infrastructure/certificate/certificate-cache";

const entrada = (marca: string) =>
  ({ certData: { issuerName: marca } as any, privateKeyPem: marca } as any);

describe("certificate-cache", () => {
  beforeEach(() => {
    clearCertificateCache();
    delete process.env.OSODREAMER_CERT_CACHE_MAX;
  });

  it("el tope es 64 por omisión y OSODREAMER_CERT_CACHE_MAX lo cambia", () => {
    expect(certificateCacheMaxEntries()).toBe(64);
    expect(CERTIFICATE_CACHE_MAX_ENTRIES).toBe(64);

    process.env.OSODREAMER_CERT_CACHE_MAX = "3";
    expect(certificateCacheMaxEntries()).toBe(3);
    for (let i = 0; i < 5; i++) setCachedCertificate(`k${i}`, entrada(`v${i}`));
    expect(certificateCacheSize()).toBe(3);
    expect(getCachedCertificate("k0")).toBeUndefined();
    expect(getCachedCertificate("k4")).toBeDefined();
  });

  it("un valor inválido en OSODREAMER_CERT_CACHE_MAX vuelve al tope por omisión", () => {
    for (const malo of ["0", "-5", "abc", "2.5", ""]) {
      process.env.OSODREAMER_CERT_CACHE_MAX = malo;
      expect(certificateCacheMaxEntries()).toBe(64);
    }
  });

  it("la clave cambia con la contraseña: una clave errada nunca reutiliza el certificado abierto con la buena", async () => {
    const p12 = new Uint8Array([1, 2, 3, 4]);
    const buena = await certificateCacheKey(p12, "correcta");
    const mala = await certificateCacheKey(p12, "incorrecta");
    const otraVez = await certificateCacheKey(new Uint8Array([1, 2, 3, 4]), "correcta");

    expect(buena).not.toBe(mala);
    expect(otraVez).toBe(buena);
    expect(buena).toMatch(/^[0-9a-f]{64}$/);
  });

  it("la clave cambia con los bytes del P12: un certificado renovado entra como nuevo", async () => {
    const a = await certificateCacheKey(new Uint8Array([1, 2, 3]), "x");
    const b = await certificateCacheKey(new Uint8Array([1, 2, 4]), "x");
    expect(a).not.toBe(b);
  });

  it("guarda y devuelve la entrada", () => {
    setCachedCertificate("k1", entrada("uno"));
    expect(getCachedCertificate("k1")?.privateKeyPem).toBe("uno");
    expect(getCachedCertificate("nada")).toBeUndefined();
    expect(certificateCacheSize()).toBe(1);
  });

  it("no crece sin tope: al pasarse expulsa el menos usado", () => {
    for (let i = 0; i < CERTIFICATE_CACHE_MAX_ENTRIES; i++) {
      setCachedCertificate(`k${i}`, entrada(`v${i}`));
    }
    // k0 se acaba de usar: pasa a ser el más reciente y no debe salir.
    getCachedCertificate("k0");
    setCachedCertificate("extra", entrada("extra"));

    expect(certificateCacheSize()).toBe(CERTIFICATE_CACHE_MAX_ENTRIES);
    expect(getCachedCertificate("k0")).toBeDefined();
    expect(getCachedCertificate("k1")).toBeUndefined();
    expect(getCachedCertificate("extra")).toBeDefined();
  });

  it("clearCertificateCache la vacía", () => {
    setCachedCertificate("k1", entrada("uno"));
    clearCertificateCache();
    expect(certificateCacheSize()).toBe(0);
  });
});
