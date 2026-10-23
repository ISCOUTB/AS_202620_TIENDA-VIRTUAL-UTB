import { describe, expect, it } from "vitest";
import { colorDeToken } from "@/lib/tokens";

describe("colorDeToken", () => {
  it("lee el valor real desde app/tokens.css", () => {
    expect(colorDeToken("p-azul")).toBe("#093ad8");
    expect(colorDeToken("p-blanco")).toBe("#ffffff");
    expect(colorDeToken("p-sabana-1")).toBe("#0a3fe0");
    expect(colorDeToken("p-sabana-noche-2")).toBe("#030b45");
  });

  it("de un token con tema devuelve el valor claro (el primero del archivo)", () => {
    expect(colorDeToken("fondo")).toBe("#f3f5fa");
    expect(colorDeToken("tinta")).toBe("#0a1330");
  });

  it("cae al respaldo cuando el token no existe", () => {
    expect(colorDeToken("no-existe", "red")).toBe("red");
  });

  it("usa negro cuando no se da respaldo", () => {
    expect(colorDeToken("tampoco-existe")).toBe("black");
  });

  it("memoiza el resultado de cada token", () => {
    expect(colorDeToken("t-antojos")).toBe(colorDeToken("t-antojos"));
  });
});
