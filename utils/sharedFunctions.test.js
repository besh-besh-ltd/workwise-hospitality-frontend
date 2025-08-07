import { handleNormalize, normalizeFlatQuotationData } from "@/utils/sharedFunctions";

//  test cases for handleNormalize
describe('handleNormalize', () => {
  it('should normalize missing freight/package/tax with average/median values', () => {
    const input = [
      {
        quotations: [
          {
            quote_details: [
              { freight_price: "10", package_price: "20", tax: "5" },
              { freight_price: "", package_price: "", tax: "" }
            ]
          }
        ]
      }
    ];

    const result = handleNormalize(input);

    expect(result[0].quotations[0].quote_details[1].freight_price).toBe(10);
    expect(result[0].quotations[0].quote_details[1].package_price).toBe(20);
    expect(result[0].quotations[0].quote_details[1].tax).toBe(5);
  });
});

//  test cases for normalizeFlatQuotationData
describe('normalizeFlatQuotationData', () => {
    it('should normalize missing freight/package/tax with average/median values', () => {
    const input = [
      {
        quotations: [
          { freight_price: "10", package_price: "20", tax: "5" },
          { freight_price: "", package_price: "", tax: "" }
        ]
      }
    ];

    const result = normalizeFlatQuotationData(input);

    expect(result[0].quotations[1].freight_price).toBe(10);
    expect(result[0].quotations[1].package_price).toBe(20);
    expect(result[0].quotations[1].tax).toBe(5);
  });
});
