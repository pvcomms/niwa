import { Suspense } from "react";
import type { Metadata } from "next";
import Catalogue from "@/components/Catalogue";

export const metadata: Metadata = {
  title: "catalogue · niwa",
};

// The catalogue keeps its state in the URL (?q, ?group, ?sort, ?id), and a
// client component reading search params needs a Suspense boundary above it.
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center">
          <span className="meta breathe" style={{ color: "var(--faint)" }}>
            reading the garden
          </span>
        </div>
      }
    >
      <Catalogue />
    </Suspense>
  );
}
