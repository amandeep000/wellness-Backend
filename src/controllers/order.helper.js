export function calcPricing(subtotal) {
  const taxRate = 0.08;
  const freeShippingOver = 66;
  const flatShipping = 10;

  const tax = +(subtotal * taxRate).toFixed(2);
  const shipping = subtotal >= freeShippingOver ? 0 : flatShipping;
  const total = +(subtotal + tax + shipping).toFixed(2);

  return { tax, shipping, total };
}
