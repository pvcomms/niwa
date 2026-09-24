import type { Metadata } from "next";
import Provenance from "@/components/Provenance";

export const metadata: Metadata = {
  title: "provenance · niwa",
};

export default function Page() {
  return <Provenance />;
}
