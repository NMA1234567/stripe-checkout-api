// /api/create-checkout.js  (CommonJS)
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_ID_SERVICE = "price_1SMWXBATCRer0biJy7mb9BpG";

const SHIPPING_PRICE_ID_BY_QTY = {
  1:"price_1SMWaoATCRer0biJMUD40Jpk",2:"price_1SMZaKATCRer0biJ4wODpPRz",3:"price_1SMZafATCRer0biJq4dI3jeg",
  4:"price_1SMZb7ATCRer0biJMmoH7AkF",5:"price_1SMZbQATCRer0biJ5yx4lTjE",6:"price_1SMZbiATCRer0biJR2AWhlv2",
  7:"price_1SMZc0ATCRer0biJo5RYcyn3",8:"price_1SMZcVATCRer0biJH4sYP7h6",9:"price_1SMZcrATCRer0biJiISyIU0M"
};
const SLAB_PRICE_ID_BY_QTY = {
  1:"price_1SMZdoATCRer0biJVM3uN39K",2:"price_1SMZeFATCRer0biJG64jmpsp",3:"price_1SMZeTATCRer0biJxTTOTi3i",
  4:"price_1SMZeTATCRer0biJxTTOTi3i",5:"price_1SMZr1ATCRer0biJ9Yh1GhOK",6:"price_1SMZr8ATCRer0biJEtt6cfk0",
  7:"price_1SMZrGATCRer0biJaqcMKVoI",8:"price_1SMZrOATCRer0biJpzC8I9XN",9:"price_1SMZrWATCRer0biJQwdjOvfe"
};
const GRADE_PRICE_ID_BY_QTY = {
  1:"price_1SMZtJATCRer0biJcZD8GOcx",2:"price_1SMZtXATCRer0biJWDNfN0K1",3:"price_1SMZtfATCRer0biJWgU1AIuH",
  4:"price_1SMZtvATCRer0biJPnHyssCD",5:"price_1SMZu3ATCRer0biJZ8OFRBkl",6:"price_1SMZuAATCRer0biJAGOfERJZ",
  7:"price_1SMZuOATCRer0biJPE6p8MuC",8:"price_1SMZuWATCRer0biJsxwtQ2DE",9:"price_1SMZudATCRer0biJJG7fdksL"
};

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    const { cards, slabQty, gradeOn, email } = req.body || {};
    const qty = Array.isArray(cards) ? cards.length : 0;
    if (!Array.isArray(cards)) return res.status(400).json({ error: "missing_cards" });
    if (qty < 1 || qty > 9) return res.status(400).json({ error: "qty_out_of_range" });

    const sQty = Math.max(0, Math.min(Number(slabQty || 0), qty));
    const shipPrice = SHIPPING_PRICE_ID_BY_QTY[qty];
    if (!shipPrice) return res.status(400).json({ error: "missing_price_map" });

    const line_items = [
      { price: PRICE_ID_SERVICE, quantity: qty },
      { price: shipPrice, quantity: 1 }
    ];

    if (sQty > 0) line_items.push({ price: SLAB_PRICE_ID_BY_QTY[sQty], quantity: 1 });
    if (gradeOn) line_items.push({ price: GRADE_PRICE_ID_BY_QTY[qty], quantity: 1 });

    const order_payload = JSON.stringify({
      qty, slabQty: sQty, gradeOn: !!gradeOn, cards: cards.slice(0, 50)
    }).slice(0, 450);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      ...(email ? { customer_email: email } : {}),
      customer_creation: "if_required",
      success_url: "https://YOURDOMAIN.com/thanks?sid={CHECKOUT_SESSION_ID}",
      cancel_url:  "https://YOURDOMAIN.com/cancelled",
      metadata: { order_payload }
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("checkout error", e);
    res.status(500).json({ error: "server_error", message: e.message });
  }
};
