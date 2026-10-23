import Link from "next/link";
import { notFound } from "next/navigation";
import { WikiItemText, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import CraftingGrid from "@/app/components/wiki/CraftingGrid";
import StationModelViewer from "@/app/components/wiki/StationModelViewer";
import SimpleCubeViewer from "@/app/components/wiki/SimpleCubeViewer";
import { getRecipesForStation, getStationBySlug, stationOpening, stations, type Recipe } from "@/app/wiki/data";

const body = "mt-3 text-sm text-[var(--tfmc-mist)]";
const link = "text-[var(--tfmc-accent)] underline underline-offset-2";

export function generateStaticParams() {
  return stations.map((station) => ({ slug: station.slug }));
}

function RecipeCards({ recipes }: { recipes: readonly Recipe[] }) {
  const groups = new Map<string, Recipe[]>();
  for (const recipe of recipes) {
    const name = recipe.category ?? "Other";
    groups.set(name, [...(groups.get(name) ?? []), recipe]);
  }

  if (recipes.length >= 24 && groups.size > 1) {
    return (
      <div className="mt-4 space-y-3">
        {[...groups].map(([name, entries], index) => (
          <details
            key={name}
            open={index === 0}
            className="rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_14%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_35%,transparent)]"
          >
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--tfmc-cream)]">
              {name} ({entries.length})
            </summary>
            <div className="grid gap-4 border-t border-[color-mix(in_srgb,var(--tfmc-cream)_10%,transparent)] p-4 md:grid-cols-2">
              {entries.map((recipe) => (
                <CraftingGrid key={recipe.key} recipe={recipe} />
              ))}
            </div>
          </details>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {recipes.map((recipe) => (
        <CraftingGrid key={recipe.key} recipe={recipe} />
      ))}
    </div>
  );
}

export default async function StationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = getStationBySlug(slug);
  if (!station) notFound();

  const self = `/wiki/stations/${station.slug}`;
  const recipes = getRecipesForStation(station.name);
  const acquisitionRecipe = station.craftRecipe ?? station.vanillaBlock?.recipe;

  return (
    <WikiPage
      lastModified="2026-10-23"
      title={station.name}
      beforeTitle={
        <Link href="/wiki/stations" className="text-xs text-[var(--tfmc-mist)] hover:text-[var(--tfmc-cream)]">
          &larr; Crafting Stations
        </Link>
      }
      intro={<WikiItemText text={station.blurb} excludeHref={self} />}
      width="lg"
    >
      <WikiSectionHeading id="obtaining">Getting one</WikiSectionHeading>
      <p className={body}>
        {station.vanillaBlock
          ? `This station is an ordinary ${station.vanillaBlock.name}. Craft one the usual way and place it.`
          : "Craft it at a crafting table, then place it on the ground."}
      </p>
      <div className={`mt-4 grid gap-4 ${acquisitionRecipe ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "max-w-sm"}`}>
        {acquisitionRecipe ? <CraftingGrid recipe={acquisitionRecipe} /> : null}
        <div aria-label={`3D preview of ${station.name}`}>
          {station.model ? (
            <StationModelViewer
              modelUrl={station.model.url}
              textureUrl={station.model.texture}
              textureUrls={station.model.textures}
              textureAnimationUrl={station.model.textureAnimationUrl}
            />
          ) : station.cubeFaces ? (
            <SimpleCubeViewer faces={station.cubeFaces} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] bg-[color-mix(in_srgb,var(--tfmc-forest-deep)_60%,transparent)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={station.fallbackTexture ?? station.icon}
                alt=""
                className="h-16 w-16 object-contain [image-rendering:pixelated]"
              />
            </div>
          )}
        </div>
      </div>

      <WikiSectionHeading id="using">Using it</WikiSectionHeading>
      <p className={body}>
        <WikiItemText text={stationOpening(station)} excludeHref={self} />
        {station.usage ? (
          <>
            {" "}
            <WikiItemText text={station.usage} excludeHref={self} />
          </>
        ) : null}
      </p>
      {station.guide ? (
        <p className={body}>
          The{" "}
          <Link href={station.guide.href} className={link}>
            {station.guide.label}
          </Link>{" "}
          explains the whole process.
        </p>
      ) : null}

      {recipes.length ? (
        <>
          <WikiSectionHeading
            id="recipes"
            intro="A recipe card shows the ingredients, how long the craft takes, and any profession perk or class it needs."
          >
            Recipes ({recipes.length})
          </WikiSectionHeading>
          <RecipeCards recipes={recipes} />
        </>
      ) : null}
    </WikiPage>
  );
}
