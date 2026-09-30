import type { Metadata } from "next";
import Genesis from "@/components/Genesis";

export const metadata: Metadata = {
  title: "the stones · provenance · niwa",
};

export default function Page() {
  return <Genesis />;
}
