import { describe, expect, it } from "vitest";
import { setNotificationPreferencesSchema, NOTIFICATION_TYPE_LABEL } from "./schemas";

describe("setNotificationPreferencesSchema", () => {
  it("aceita os 4 campos como boolean", () => {
    expect(
      setNotificationPreferencesSchema.safeParse({
        shopping_item_added: true,
        shopping_item_purchased: false,
        maintenance_registered: true,
        task_due_today: true,
      }).success,
    ).toBe(true);
  });
  it("rejeita quando falta um campo", () => {
    expect(
      setNotificationPreferencesSchema.safeParse({ shopping_item_added: true }).success,
    ).toBe(false);
  });
});

describe("NOTIFICATION_TYPE_LABEL", () => {
  it("tem rótulo para os 4 tipos", () => {
    expect(Object.keys(NOTIFICATION_TYPE_LABEL)).toHaveLength(4);
  });
});
