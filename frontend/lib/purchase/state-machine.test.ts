import { transitionPurchaseStep, type PurchaseStep } from "@/lib/purchase/state-machine"

describe("purchase state machine", () => {
  it("follows happy path from session to completion", () => {
    let step: PurchaseStep = "idle"
    step = transitionPurchaseStep(step, "session_created")
    step = transitionPurchaseStep(step, "payment_confirmed")
    step = transitionPurchaseStep(step, "settlement_started")
    step = transitionPurchaseStep(step, "settlement_confirmed")

    expect(step).toBe("completed")
  })

  it("moves to failed when payment or settlement fails", () => {
    const paymentFailure = transitionPurchaseStep("payment_pending", "payment_failed")
    const settlementFailure = transitionPurchaseStep("settling", "settlement_failed")

    expect(paymentFailure).toBe("failed")
    expect(settlementFailure).toBe("failed")
  })
})
