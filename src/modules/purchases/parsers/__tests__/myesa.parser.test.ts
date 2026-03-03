import { describe, expect, it } from "vitest";

import { applyKnownProductMatches, parseMyesaInvoice } from "@/modules/purchases/parsers/myesa.parser";

describe("parseMyesaInvoice", () => {
  it("parses MYESA invoice rows and computes default prices", () => {
    const rawText = `
No.COM CANTIDAD UNIDAD Descripción P.U. IMPORTE
ESTE DOCUMENTO ES UNA REPRESENTACION IMPRESA DE UN CFDI
** 5124-1037 5 H87 CANDADO DISCO FRENO PROMOTO CON ALARMA CDA1 CROMO
CLAVE PRODUCTO: 39121903 CLAVE PEDIMENTO: 25 16 1767 5003538
195.80 978.98
** 7101-2461 1 H87 CASCO ABATIBLE LS2 ADVANT X C FUTURE XXL BCO/AZL FF901
CLAVE PRODUCTO: 46181705 CLAVE PEDIMENTO: 25 16 1767 5003910
6,509.97 6,509.97
`;

    const result = parseMyesaInvoice(rawText);
    expect(result).toHaveLength(2);

    expect(result[0]).toMatchObject({
      sku: "5124-1037",
      qty: "5.00",
      unit_cost: "195.80",
      unit_price: "227.13",
      public_price: "295.27",
      brand_name: "PROMOTO",
      product_type_name: "CANDADOS",
      is_selected: true,
      match_status: "NEW_PRODUCT",
    });

    expect(result[1]).toMatchObject({
      sku: "7101-2461",
      qty: "1.00",
      unit_cost: "6509.97",
      unit_price: "7551.57",
      public_price: "9817.03",
      brand_name: "LS2",
      product_type_name: "CASCOS ABATIBLES",
    });
  });

  it("keeps uncompleted rows as editable invalid lines", () => {
    const rawText = `
** 5124-1037 5 H87 CANDADO DISCO FRENO PROMOTO CON ALARMA CDA1 CROMO
CLAVE PRODUCTO: 39121903 CLAVE PEDIMENTO: 25 16 1767 5003538
`;

    const result = parseMyesaInvoice(rawText);
    expect(result).toHaveLength(1);
    expect(result[0].match_status).toBe("INVALID");
    expect(result[0].is_selected).toBe(false);
    expect(result[0].unit_cost).toBeNull();
    expect(result[0].brand_name).toBe("");
    expect(result[0].product_type_name).toBe("");
  });

  it("uses known brands from catalog during inference", () => {
    const rawText = `
** 7101-1922 1 H87 CASCO ABATIBLE R7 RACING UNSCARRED CON LED DOBLE MICA DOT XXXL NEGRO
931.10 931.10
`;

    const result = parseMyesaInvoice(rawText, { knownBrands: ["R7", "LS2"] });
    expect(result).toHaveLength(1);
    expect(result[0].brand_name).toBe("R7");
    expect(result[0].product_type_name).toBe("CASCOS ABATIBLES");
  });

  it("parses invoice rows even when the sku row does not start with asterisks", () => {
    const rawText = `
6219-1001 12 H87 LIMPIADOR MOTUL M2 HELMET INTERIOR CLEAN DESINFECTANTE ATOMI
CLAVE PRODUCTO: 12163800
128.33 1,539.91
`;

    const result = parseMyesaInvoice(rawText, { knownBrands: ["MOTUL"] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sku: "6219-1001",
      qty: "12.00",
      unit_cost: "128.33",
      unit_price: "148.86",
      public_price: "193.52",
      brand_name: "MOTUL",
      is_selected: true,
      match_status: "NEW_PRODUCT",
    });
  });

  it("reconciles parsed lines with existing products by exact sku", () => {
    const parsed = parseMyesaInvoice(`
** 5124-1037 1 H87 CANDADO DISCO FRENO PROMOTO CON ALARMA CDA1 CROMO
195.80 195.80
`);

    const reconciled = applyKnownProductMatches(parsed, [
      {
        id: "product-1",
        sku: "5124-1037",
        brand_name: "PROMOTO",
        product_type_name: "CANDADOS",
      },
    ]);

    expect(reconciled[0].match_status).toBe("MATCHED_PRODUCT");
    expect(reconciled[0].matched_product).toBe("product-1");
    expect(reconciled[0].brand_name).toBe("PROMOTO");
    expect(reconciled[0].product_type_name).toBe("CANDADOS");
  });
});
