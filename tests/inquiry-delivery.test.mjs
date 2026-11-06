import assert from "node:assert/strict";
import test from "node:test";
import { inquiryDeliveryStatus } from "../lib/inquiry-delivery-status.ts";

test("inquiry delivery stays confirmed after an open or a click", () => {
  for (const event of ["delivered", "opened", "clicked"]) {
    assert.equal(inquiryDeliveryStatus(event), "delivered", event);
  }
});

test("inquiry delivery distinguishes provider errors, pending delivery and unreadable receipts", () => {
  for (const event of ["bounced", "canceled", "complained", "failed", "suppressed"]) {
    assert.equal(inquiryDeliveryStatus(event), "failed", event);
  }
  for (const event of ["sent", "queued", "scheduled", "delivery_delayed"]) {
    assert.equal(inquiryDeliveryStatus(event), "pending", event);
  }
  assert.equal(inquiryDeliveryStatus(null), "unavailable");
});
