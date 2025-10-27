import request from "supertest";
import app from "../src/app.js";

describe("Health endpoint", () => {
  test("GET /api/health returns ok:true", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("Unknown route returns 404/400/401", async () => {
    const res = await request(app).get("/api/__nope__");
    expect([404, 400, 401]).toContain(res.statusCode); // allow 401 too
  });
});
