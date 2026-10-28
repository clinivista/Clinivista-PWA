/** Paridad de textos de las pantallas de entrada: mismas claves y ningún texto vacío en los nueve idiomas. */
import { describe, it, expect } from "vitest";
import { LANGS } from "./language";
import { ACCESS_TEXT } from "./access-i18n";
import { PORTAL_HOME_TEXT } from "./portal-home-i18n";

const flatten = (value: unknown, prefix = ""): Record<string, string> =>
  typeof value === "string" ? { [prefix]: value }
    : Object.entries(value as Record<string, unknown>).reduce((acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }), {} as Record<string, string>);

describe.each([["ACCESS_TEXT", ACCESS_TEXT], ["PORTAL_HOME_TEXT", PORTAL_HOME_TEXT]] as const)("%s", (_name, table) => {
  const base = flatten(table.es);
  it.each(LANGS.map((l) => l.code))("%s tiene las mismas claves que es y ninguna vacía", (code) => {
    const current = flatten(table[code]);
    expect(Object.keys(current).sort()).toEqual(Object.keys(base).sort());
    for (const [key, text] of Object.entries(current)) expect(text.trim(), `${code}.${key}`).not.toBe("");
  });
  it("los textos no son copia del español (salvo nombres propios)", () => {
    for (const { code } of LANGS) if (code !== "es") expect(flatten(table[code]).titleLead ?? flatten(table[code]).loginTitle).not.toBe(base.titleLead ?? base.loginTitle);
  });
});
