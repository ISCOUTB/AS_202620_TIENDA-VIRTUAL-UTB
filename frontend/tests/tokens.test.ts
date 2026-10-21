import { describe, expect, it } from "vitest";
import { colorDeToken } from "@/lib/tokens";

describe("colorDeToken", () => {
  it("lee el valor real desde app/tokens.css", () => {
    expect(colorDeToken("ambar")).toBe("#ffc300");
    expect(colorDeToken("superficie")).toBe("#ffffff");
    expect(colorDeToken("tinta")).toBe("#04060e");
  });

  it("cae al respaldo cuando el token no existe", () => {
    expect(colorDeToken("no-existe", "red")).toBe("red");
  });

  it("usa negro cuando no se da respaldo", () => {
    expect(colorDeToken("tampoco-existe")).toBe("black");
  });

  it("memoiza el resultado de cada token", () => {
    expect(colorDeToken("cyan")).toBe(colorDeToken("cyan"));
  });
});
