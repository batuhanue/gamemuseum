import { notFound } from "next/navigation";
import type { Metadata } from "next";

const GALLERIES = { xbox: "Xbox", playstation: "PlayStation", pc: "PC" } as const;

export async function generateMetadata({ params }: { params: Promise<{ gallery: string }> }): Promise<Metadata> {
  const { gallery } = await params;
  return { title: GALLERIES[gallery as keyof typeof GALLERIES] ?? "Museum" };
}

export default async function GalleryPage({ params }: { params: Promise<{ gallery: string }> }) {
  const { gallery } = await params;
  if (!(gallery in GALLERIES)) notFound();
  return null;
}
