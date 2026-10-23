import Link from "next/link";
import { notFound } from "next/navigation";
import CraftingGrid from "../../../components/wiki/CraftingGrid";
import RecipeItemIcon from "../../../components/wiki/RecipeItemIcon";
import { WikiItemText, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { getItemBySlug, itemDetails } from "../../data/items";
import { stations } from "../../data";

export function generateStaticParams() {
  return itemDetails.map((item) => ({ slug: item.slug }));
}

export default async function ItemDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();
  // Back to the station that makes it, or to the station list for items nothing here makes.
  const station = stations.find((candidate) => candidate.name === item.recipes[0]?.station);
  const back = station
    ? { href: `/wiki/stations/${station.slug}`, label: station.name }
    : { href: "/wiki/stations", label: "Crafting Stations" };
  return (
    <WikiPage
      lastModified="2026-10-23"
      title={item.name}
      beforeTitle={
        <Link href={back.href} className="text-xs text-[var(--tfmc-mist)] hover:text-[var(--tfmc-cream)]">
          &larr; {back.label}
        </Link>
      }
      titleVisual={
        item.model ? undefined : item.texture ? <RecipeItemIcon src={item.texture} alt={item.name} /> : undefined
      }
      intro={item.description ? <WikiItemText text={item.description} excludeHref={item.href} /> : undefined}
    >
      {item.recipes.length ? (
        <>
          <WikiSectionHeading id="acquisition">How to craft</WikiSectionHeading>
          <div className="mt-4 space-y-4">
            {item.recipes.map((recipe) => (
              <CraftingGrid key={recipe.key} recipe={recipe} />
            ))}
          </div>
        </>
      ) : null}
      <WikiSectionHeading id="used-in">Used to make</WikiSectionHeading>
      {item.usedIn.length ? (
        <div className="mt-4 space-y-4">
          {item.usedIn.map((recipe) => (
            <CraftingGrid key={recipe.key} recipe={recipe} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--tfmc-mist)]">No station recipe uses it.</p>
      )}
    </WikiPage>
  );
}
