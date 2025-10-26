// /api/create-checkout.js  (Vercel serverless function)
import Stripe from "stripe";

// uses your secret key from Vercel env vars (you'll add that in Part B)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * REPLACE THESE WITH YOUR REAL PRICE IDs FROM STRIPE
 * Service is per card. Shipping/Slab/Grading are one price per exact quantity (1–9).
 */
const PRICE_ID_SERVICE = "price_SERVICE_per_card"; // e.g. price_1SMWXB...

const SHIPPING_PRICE_ID_BY_QTY = {
  1:"price_ship_q1_1195", 2:"price_ship_q2_1495", 3:"price_ship_q3_1995",
  4:"price_ship_q4_2495", 5:"price_ship_q5_2995", 6:"price_ship_q6_3495",
  7:"price_ship_q7_3995", 8:"price_ship_q8_4495", 9:"price_ship_q9_4995"
};

const SLAB_PRICE_ID_BY_QTY = {
  1:"price_slab_q1_995",  2:"price_slab_q2_1495", 3:"price_slab_q3_1995",
  4:"price_slab_q4_2495", 5:"price_slab_q5_2995", 6:"price_slab_q6_3245",
  7:"price_slab_q7_3495", 8:"price_slab_q8_3745", 9:"price_slab_q9_3995"
};

const GRADE_PRICE_ID_BY_QTY = {
  1:"price_grade_q1_595",  2:"price_grade_q2_1190", 3:"price_grade_q3_1785",
  4:"price_grade_q4_2035", 5:"price_grade_q5_2285", 6:"price_grade_q6_2535",
  7:"price_grade_q7_2785", 8:"price_grade_q8_3035", 9:"price_grade_q9_3285"
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    // what your front-end will send:
    const { cards, slabQty, gradeOn, email } = req.body || {};
    const qty = Array.isArray(cards) ? cards.length : 0;

    // guard rails
    if (!Array.isArray(cards)) return res.status(400).json({ error: "missing_cards" });
    if (qty < 1 || qty > 9)     return res.status(400).json({ error: "qty_out_of_range" });

    const sQty = Math.max(0, Math.min(Number(slabQty || 0), qty)); // slab can't exceed total cards

    const servicePrice = PRICE_ID_SERVICE;
    const shipPrice    = SHIPPING_PRICE_ID_BY_QTY[qty];
    if (!servicePrice || !shipPrice) return res.status(400).json({ error: "missing_price_map" });

    const line_items = [
      { price: servicePrice, quantity: qty }, // per-card service
      { price: shipPrice,    quantity: 1   }  // shipping total for that qty
    ];

    if (sQty > 0) {
      const slabPrice = SLAB_PRICE_ID_BY_QTY[sQty];
      if (!slabPrice) return res.status(400).json({ error: "no_slab_price_for_qty" });
      line_items.push({ price: slabPrice, quantity: 1 });
    }

    if (gradeOn) {
      const gradePrice = GRADE_PRICE_ID_BY_QTY[qty];
      if (!gradePrice) return res.status(400).json({ error: "no_grade_price_for_qty" });
      line_items.push({ price: gradePrice, quantity: 1 });
    }

    // keep metadata short (Stripe value limit ~500 chars)
    const order_payload = JSON.stringify({
      qty,
      slabQty: sQty,
      gradeOn: !!gradeOn,
      cards: cards.slice(0, 50)
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
    console.error("[create-checkout] error", e);
    return res.status(400).json({ error: "checkout_error", message: e.message });
  }
}

