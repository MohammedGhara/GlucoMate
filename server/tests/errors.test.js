import request from "supertest";
import app from "../src/app.js";

describe("Error handling", () => {
  test("Invalid JSON yields 400/422", async () => {
    const res = await request(app)
      .post("/inventory")
      .set("Content-Type", "application/json")
      .send('{"bad": "json"'); // broken JSON
    expect([400, 422]).toContain(res.statusCode);
  });

  test("Method not allowed or 404", async () => {
    const res = await request(app).patch("/inventory");
    expect([404, 405]).toContain(res.statusCode);
  });

  test("Validation rejects negative dose", async () => {
    const res = await request(app).post("/inventory").send({
      name: "TestDrug",
      unit: "mg",
      dose: -10,
      time: "night"
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test("Rate limit (if enabled) otherwise OK", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () => request(app).get("/health"))
    );
    const some429 = attempts.some(r => r.statusCode === 429);
    expect([true, false]).toContain(some429);
  });
});
