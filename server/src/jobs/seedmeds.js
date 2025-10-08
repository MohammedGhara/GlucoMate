// server/src/jobs/seedmeds.js
import { db } from "../config/db.js";

export function seedMedicationCatalog() {
  const meds = [
    // ── Diabetes core (big list; add more as needed) ─────────────
    { generic_name: "Metformin", brand_name: "Glucophage", form: "Tablet", strength: "500 mg", class: "Biguanide" },
    { generic_name: "Insulin glargine", brand_name: "Lantus", form: "Injection", strength: "100 U/mL", class: "Basal insulin" },
    { generic_name: "Insulin detemir", brand_name: "Levemir", form: "Injection", strength: "100 U/mL", class: "Basal insulin" },
    { generic_name: "Insulin degludec", brand_name: "Tresiba", form: "Injection", strength: "100 U/mL", class: "Basal insulin (ultra-long)" },
    { generic_name: "Insulin lispro", brand_name: "Humalog", form: "Injection", strength: "100 U/mL", class: "Rapid insulin" },
    { generic_name: "Insulin aspart", brand_name: "Novolog", form: "Injection", strength: "100 U/mL", class: "Rapid insulin" },
    { generic_name: "Insulin regular", brand_name: "Humulin R", form: "Injection", strength: "100 U/mL", class: "Short-acting insulin" },
    { generic_name: "Insulin NPH", brand_name: "Humulin N", form: "Injection", strength: "100 U/mL", class: "Intermediate insulin" },

    { generic_name: "Glimepiride", brand_name: "Amaryl", form: "Tablet", strength: "1–4 mg", class: "Sulfonylurea" },
    { generic_name: "Glipizide", brand_name: "Glucotrol", form: "Tablet", strength: "5–10 mg", class: "Sulfonylurea" },
    { generic_name: "Gliclazide", brand_name: "", form: "Tablet", strength: "30–80 mg", class: "Sulfonylurea" },

    { generic_name: "Sitagliptin", brand_name: "Januvia", form: "Tablet", strength: "100 mg", class: "DPP-4 inhibitor" },
    { generic_name: "Linagliptin", brand_name: "Tradjenta", form: "Tablet", strength: "5 mg", class: "DPP-4 inhibitor" },
    { generic_name: "Saxagliptin", brand_name: "Onglyza", form: "Tablet", strength: "5 mg", class: "DPP-4 inhibitor" },

    { generic_name: "Empagliflozin", brand_name: "Jardiance", form: "Tablet", strength: "10–25 mg", class: "SGLT2 inhibitor" },
    { generic_name: "Dapagliflozin", brand_name: "Farxiga", form: "Tablet", strength: "5–10 mg", class: "SGLT2 inhibitor" },
    { generic_name: "Canagliflozin", brand_name: "Invokana", form: "Tablet", strength: "100–300 mg", class: "SGLT2 inhibitor" },

    { generic_name: "Pioglitazone", brand_name: "Actos", form: "Tablet", strength: "15–45 mg", class: "TZD" },
    { generic_name: "Acarbose", brand_name: "Precose", form: "Tablet", strength: "50–100 mg", class: "Alpha-glucosidase inhibitor" },

    { generic_name: "Semaglutide", brand_name: "Ozempic", form: "Injection", strength: "0.25–2 mg", class: "GLP-1 RA" },
    { generic_name: "Liraglutide", brand_name: "Victoza", form: "Injection", strength: "0.6–1.8 mg", class: "GLP-1 RA" },
    { generic_name: "Dulaglutide", brand_name: "Trulicity", form: "Injection", strength: "0.75–4.5 mg", class: "GLP-1 RA" },
    { generic_name: "Tirzepatide", brand_name: "Mounjaro", form: "Injection", strength: "2.5–15 mg", class: "GIP/GLP-1" },
    // ── Add hypertension/lipids, etc., if you want broader catalog ──
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO medications (generic_name, brand_name, form, strength, class)
    VALUES (@generic_name, @brand_name, @form, @strength, @class)
  `);

  const txn = db.transaction((rows) => {
    for (const r of rows) insert.run(r);
  });

  txn(meds);
  console.log(`✅ Seeded medications (added up to ${meds.length})`);
}
