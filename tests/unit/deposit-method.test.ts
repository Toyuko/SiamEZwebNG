import { describe, expect, it } from "vitest";
import {
  isOfficeCashDeposit,
  parseDepositPaymentMethod,
} from "@/lib/payments/deposit-method";

describe("deposit payment method", () => {
  it("defaults to online when unset", () => {
    expect(parseDepositPaymentMethod(undefined)).toBe("online");
    expect(parseDepositPaymentMethod({})).toBe("online");
  });

  it("reads top-level office cash preference", () => {
    expect(parseDepositPaymentMethod({ depositPaymentMethod: "office_cash" })).toBe("office_cash");
  });

  it("reads nested driver license office cash preference", () => {
    expect(
      parseDepositPaymentMethod({
        driverLicense: { depositPaymentMethod: "office_cash" },
      })
    ).toBe("office_cash");
  });

  it("detects office cash bookings", () => {
    expect(isOfficeCashDeposit({ depositPaymentMethod: "office_cash" })).toBe(true);
    expect(isOfficeCashDeposit({ depositPaymentMethod: "online" })).toBe(false);
  });
});
