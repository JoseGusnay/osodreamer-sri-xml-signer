import { CryptoUtils } from "../../../common/utils";

describe("CryptoUtils", () => {
  const utils = new CryptoUtils();

  describe("hexToBase64", () => {
    it("debería convertir hexadecimal a Base64 correctamente", async () => {
      // hex: 48656c6c6f → "Hello"
      const result = await utils.hexToBase64("48656c6c6f");
      expect(result).toBe("SGVsbG8="); // "Hello" en Base64
    });
  });

  describe("bigint3base64", () => {
    it("debería convertir bigint a Base64 con saltos de línea cada 76 caracteres", async () => {
      const bigint = BigInt("12345678901234567890");
      const result = await utils.bigint3base64(bigint);

      // Validar que sea Base64 y tenga saltos de línea válidos
      const lines = result.split("\n");
      expect(lines.every((line) => line.length <= 76)).toBe(true);
      expect(result).toMatch(/^[A-Za-z0-9+/=\n]+$/);
    });
  });

  describe("p_obtener_aleatorio", () => {
    it("debería generar un número entre 100000 y 9999999", () => {
      const result = utils.p_obtener_aleatorio();
      expect(result).toBeGreaterThanOrEqual(100000);
      expect(result).toBeLessThanOrEqual(9999999);
    });

    it("debería ser un número entero", () => {
      const result = utils.p_obtener_aleatorio();
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});
