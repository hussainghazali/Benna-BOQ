// Public product read — used by the product detail page and BOQ matcher.
const Product = require("../../vendor/model/product.model");

/** GET /api/users/website/products/:slug */
const getBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      uniqueProductSlug: req.params.slug,
      visible: true,
      status: { $in: ["approved", "published"] },
    }).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** GET /api/users/website/search?q=...&limit=8&page=1 — keyword search used by
 *  the BOQ catalog matcher. Multi-word tolerant: every token must hit a
 *  searchable field (name, brand, collections, keywords, sku). */
const search = async (req, res) => {
  try {
    const q = String(req.query.q || req.query.query || "").trim();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const fields = [
      "productName",
      "productNameArabic",
      "brandName",
      "sku",
      "tags",
      "keywords",
    ];
    const tokens = q ? q.split(/\s+/).filter(Boolean).slice(0, 8) : [];
    const filter = {
      visible: true,
      status: { $in: ["approved", "published"] },
      ...(tokens.length
        ? {
            $and: [
              {
                $or: tokens.map((t) => {
                  const re = new RegExp(escapeRegex(t), "i");
                  return {
                    $or: [
                      ...fields.map((f) => ({ [f]: re })),
                      { collections: { $in: [re] } },
                    ],
                  };
                }),
              },
            ],
          }
        : {}),
    };
    const [data, totalResults] = await Promise.all([
      Product.find(filter)
        .sort({ price: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data,
      totalResults,
      page,
      totalPages: Math.ceil(totalResults / limit),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBySlug, search };
