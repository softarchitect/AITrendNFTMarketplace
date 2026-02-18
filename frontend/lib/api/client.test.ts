import { ApiError, apiRequest } from "@/lib/api/client"

describe("apiRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns parsed json for successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, value: 42 }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiRequest<{ ok: boolean; value: number }>("/health")

    expect(result).toEqual({ ok: true, value: 42 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws ApiError for failed responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({ error: "Conflict" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest("/conflict")).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "Conflict",
    })
  })
})
