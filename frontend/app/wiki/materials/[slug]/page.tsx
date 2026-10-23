import Link from "next/link";
import { notFound } from "next/navigation";
import CraftingGrid from "../../../components/wiki/CraftingGrid";
import { WikiItemText, WikiPage, WikiSectionHeading } from "@/app/components/wiki";
import { getMaterialBySlug, materialCatalog } from "../../data";

export function generateStaticParams() {
  return Array.from(materialCatalog.values()).map((m) => ({ slug: m.slug }));
}

export default async function MaterialDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const material = getMaterialBySlug(slug);
  if (!material) notFound();
  const self = `/wiki/materials/${material.slug}`;

  return (
    <WikiPage
      lastModified="2026-10-23"
      title={material.name}
      beforeTitle={
        <Link href="/wiki/materials" className="text-xs text-[var(--tfmc-mist)] hover:text-[var(--tfmc-cream)]">
          &larr; Materials
        </Link>
      }
      titleVisual={
        material.texture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={material.texture} alt={material.name} className="h-16 w-16 [image-rendering:pixelated]" />
        ) : undefined
      }
      intro={material.lore ? <WikiItemText text={material.lore} excludeHref={self} /> : undefined}
    >
      {material.acquisition?.length || material.recipes.length ? (
        <WikiSectionHeading id="acquisition">Where to get it</WikiSectionHeading>
      ) : null}
      {material.acquisition?.length ? (
        <ul className="mt-4 space-y-3">
          {material.acquisition.map((source) => (
            <li
              key={source.method}
              className="rounded-md border border-[color-mix(in_srgb,var(--tfmc-cream)_12%,transparent)] p-4"
            >
              <h3 className="font-semibold text-[var(--tfmc-cream)]">
                <WikiItemText text={source.method} excludeHref={self} />
              </h3>
              <p className="mt-1 text-sm text-[var(--tfmc-mist)]">
                <WikiItemText text={source.detail} excludeHref={self} />
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {material.recipes.length ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {material.recipes.map((recipe) => (
            <CraftingGrid key={recipe.key} recipe={recipe} />
          ))}
        </div>
      ) : null}

      {material.unpackingRecipes.length ? (
        <section>
          <WikiSectionHeading id="unpacking" intro="Break a storage block you already own back into the material.">
            Unpacking a block
          </WikiSectionHeading>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {material.unpackingRecipes.map((recipe) => (
              <CraftingGrid key={recipe.key} recipe={recipe} />
            ))}
          </div>
        </section>
      ) : null}

      <WikiSectionHeading id="used-in">Used to make</WikiSectionHeading>
      {material.usedFor ? (
        <p className="mt-2 text-sm text-[var(--tfmc-mist)]">
          <WikiItemText text={material.usedFor} excludeHref={self} />
        </p>
      ) : null}
      {material.usedIn.length ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {material.usedIn.map((r) => (
            <CraftingGrid key={r.key} recipe={r} />
          ))}
        </div>
      ) : !material.usedFor ? (
        <p className="mt-2 text-sm text-[var(--tfmc-mist)]">No station recipe uses it.</p>
      ) : null}
    </WikiPage>
  );
}
