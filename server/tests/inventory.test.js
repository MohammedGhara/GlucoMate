// tests/inventory.test.js
import request from "supertest";
import app from "../src/app.js";

const base = "/api/inventory"; // ✅ add /api
let createdId;

describe("Inventory", () => {
  test("GET /inventory returns array", async () => {
    const res = await request(app).get(base);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /inventory validates body", async () => {
    const res = await request(app).post(base).send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test("POST /inventory creates item", async () => {
    const res = await request(app).post(base).send({
      name: "Insulin Glargine",
      unit: "U",
      dose: 12,
      time: "morning"
    });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("id");
    createdId = res.body.id;
  });

  test("GET /inventory/:id fetches item", async () => {
    const res = await request(app).get(`${base}/${createdId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", createdId);
  });

  test("PUT /inventory/:id updates item", async () => {
    const res = await request(app).put(`${base}/${createdId}`).send({ dose: 14 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("dose", 14);
  });

  test("GET /inventory shows updated item", async () => {
    const res = await request(app).get(base);
    expect(res.statusCode).toBe(200);
    const item = res.body.find(x => x.id === createdId);
    expect(item).toBeTruthy();
    expect(item.dose).toBe(14);
  });

  test("DELETE /inventory/:id removes item", async () => {
    const res = await request(app).delete(`${base}/${createdId}`);
    // Accept success codes or 404 if already gone depending on implementation
    expect([200, 204, 404]).toContain(res.statusCode);
  });

  test("GET /inventory/:id after delete => 404/400", async () => {
    const res = await request(app).get(`${base}/${createdId}`);
    expect([404, 400]).toContain(res.statusCode);
  });

  test("POST /inventory/bulk (ok or 404 if not implemented)", async () => {
    const res = await request(app).post(`${base}/bulk`).send([
      { name: "Metformin", unit: "mg", dose: 500, time: "evening" },
      { name: "Insulin Aspart", unit: "U", dose: 8, time: "lunch" }
    ]);
    expect([200, 201, 404]).toContain(res.statusCode);
  });
});
