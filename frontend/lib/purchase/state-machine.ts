export type PurchaseStep = "idle" | "payment_pending" | "payment_confirmed" | "settling" | "completed" | "failed"

export type PurchaseEvent =
  | "session_created"
  | "payment_confirmed"
  | "payment_failed"
  | "settlement_started"
  | "settlement_confirmed"
  | "settlement_failed"
  | "reset"

export function transitionPurchaseStep(current: PurchaseStep, event: PurchaseEvent): PurchaseStep {
  if (event === "reset") return "idle"

  switch (current) {
    case "idle":
      return event === "session_created" ? "payment_pending" : current
    case "payment_pending":
      if (event === "payment_confirmed") return "payment_confirmed"
      if (event === "payment_failed") return "failed"
      return current
    case "payment_confirmed":
      return event === "settlement_started" ? "settling" : current
    case "settling":
      if (event === "settlement_confirmed") return "completed"
      if (event === "settlement_failed") return "failed"
      return current
    case "completed":
    case "failed":
      return current
    default:
      return current
  }
}
