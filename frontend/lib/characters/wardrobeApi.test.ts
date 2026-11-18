import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getWardrobe } from "./api";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://www.tfminecraft.net/api/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubWardrobe(body: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
}

it("keeps the skin description flag and texts from the wardrobe response", async () => {
  stubWardrobe({
    character_id: "c",
    active_slot: "base",
    swappable_slots: 2,
    descriptions: true,
    slots: [{ slot: "extra_1", filled: true, unlocked: true, description: "A hooded figure." }],
  });
  const wardrobe = await getWardrobe("token", "c");
  expect(wardrobe.descriptions).toBe(true);
  expect(wardrobe.slots[0].description).toBe("A hooded figure.");
});

it("leaves the flag out for a pending character or an older site", async () => {
  stubWardrobe({ character_id: "c", active_slot: null, swappable_slots: 1, slots: [], pending_create: true });
  expect((await getWardrobe("token", "c")).descriptions).toBeUndefined();
});
