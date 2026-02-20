import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { InMemoryStore } from "../src/store/inMemoryStore";
import { createServices } from "../src/services/serviceContainer";

function setup() {
  const db = new InMemoryStore();
  const services = createServices(db, { forceMock: true });
  const app = createApp(services);
  return { app };
}

describe("automation lifecycle configuration", () => {
  it("updates and reads series lifecycle config", async () => {
    const { app } = setup();
    const update = await request(app).post("/api/admin/series-lifecycle-config").send({
      autoSeriesEnabled: true,
      seriesIdTemplate: "list:200,201,202",
      defaultSeriesMaxSupply: 15,
      seriesMetadataRootTemplate: "ipfs://series/{seriesId}/"
    });
    expect(update.status).toBe(200);
    expect(update.body.autoSeriesEnabled).toBe(true);
    expect(update.body.seriesIdTemplate).toBe("list:200,201,202");

    const read = await request(app).get("/api/admin/series-lifecycle-config");
    expect(read.status).toBe(200);
    expect(read.body.defaultSeriesMaxSupply).toBe(15);
    expect(read.body.seriesMetadataRootTemplate).toContain("{seriesId}");
  });

  it("applies manual theme override during run-cycle", async () => {
    const { app } = setup();
    const response = await request(app).post("/api/admin/run-cycle").send({
      themeOverride: "Client Special Theme",
      limit: 5
    });
    expect(response.status).toBe(200);
    expect(response.body.topic.topic).toBe("Client Special Theme");
  });

  it("exposes trend source health telemetry endpoint", async () => {
    const { app } = setup();
    await request(app).post("/api/admin/run-cycle").send({});
    const response = await request(app).get("/api/admin/trend-source-health");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
