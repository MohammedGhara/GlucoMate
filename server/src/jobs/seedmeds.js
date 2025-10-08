import { db } from "../config/db.js";

export function seedMedicationCatalog() {
  const count = db.prepare(`SELECT COUNT(*) c FROM medications`).get().c;
  if (count > 0) return;

  const meds = [
    { generic_name: "Metformin",  brand_name: "Glucophage", form:"tablet", strength:"500/850/1000 mg", class:"Biguanide", notes:"1–2 times daily with meals" },
    { generic_name: "Semaglutide",brand_name: "Ozempic",    form:"pen",    strength:"0.25/0.5/1 mg",    class:"GLP-1 agonist", notes:"Once weekly" },
    { generic_name: "Sitagliptin",brand_name: "Januvia",     form:"tablet", strength:"50/100 mg",       class:"DPP-4", notes:"Once daily" },
  ];

  const ins = db.prepare(`
    INSERT INTO medications (generic_name,brand_name,form,strength,class,notes)
    VALUES (@generic_name,@brand_name,@form,@strength,@class,@notes)
  `);
  const tx = db.transaction((rows) => rows.forEach(r => ins.run(r)));
  tx(meds);
  console.log("✅ Seeded medications:", meds.length);
}
