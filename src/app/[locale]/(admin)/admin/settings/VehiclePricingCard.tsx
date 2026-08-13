"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { VehicleServicePricing } from "@/lib/vehicle-leads/pricing";
import { saveAdminVehiclePricing } from "@/actions/vehicle-leads";

export function VehiclePricingCard({ initial }: { initial: VehicleServicePricing }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function setNum(key: keyof VehicleServicePricing, value: string) {
    const n = Number(value);
    setForm((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Vehicle service pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted">
          Used for internal fee recommendations on vehicle leads. Not shown as a guaranteed quote on the public form.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Pricing mode</Label>
            <Select
              value={form.pricingMode}
              onChange={(e) =>
                setForm((p) => ({ ...p, pricingMode: e.target.value as VehicleServicePricing["pricingMode"] }))
              }
            >
              <option value="fixed">Fixed fee</option>
              <option value="percent">Percentage commission</option>
              <option value="hybrid">Hybrid (base + %)</option>
            </Select>
          </div>
          <div>
            <Label>Selling / listing fee (THB)</Label>
            <Input type="number" min={0} value={form.sellingFeeBaht} onChange={(e) => setNum("sellingFeeBaht", e.target.value)} />
          </div>
          <div>
            <Label>Vehicle sourcing fee (THB)</Label>
            <Input type="number" min={0} value={form.sourcingFeeBaht} onChange={(e) => setNum("sourcingFeeBaht", e.target.value)} />
          </div>
          <div>
            <Label>Commission %</Label>
            <Input type="number" min={0} step="0.1" value={form.commissionPercent} onChange={(e) => setNum("commissionPercent", e.target.value)} />
          </div>
          <div>
            <Label>Registration service (THB)</Label>
            <Input type="number" min={0} value={form.registrationFeeBaht} onChange={(e) => setNum("registrationFeeBaht", e.target.value)} />
          </div>
          <div>
            <Label>Delivery (THB)</Label>
            <Input type="number" min={0} value={form.deliveryFeeBaht} onChange={(e) => setNum("deliveryFeeBaht", e.target.value)} />
          </div>
          <div>
            <Label>Inspection (THB)</Label>
            <Input type="number" min={0} value={form.inspectionFeeBaht} onChange={(e) => setNum("inspectionFeeBaht", e.target.value)} />
          </div>
          <div>
            <Label>Other fees (THB)</Label>
            <Input type="number" min={0} value={form.otherFeeBaht} onChange={(e) => setNum("otherFeeBaht", e.target.value)} />
          </div>
          <div>
            <Label>Expected response hours (optional)</Label>
            <Input
              type="number"
              min={0}
              value={form.expectedResponseHours ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  expectedResponseHours: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <Label>Response timeframe copy (optional)</Label>
            <Input
              value={form.responseTimeframeCopy ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, responseTimeframeCopy: e.target.value || null }))}
              placeholder="Leave blank to avoid promising a specific time"
            />
          </div>
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await saveAdminVehiclePricing(form);
              setMessage("Vehicle pricing saved.");
            })
          }
        >
          Save vehicle pricing
        </Button>
        {message ? <p className="text-sm text-siam-blue">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
