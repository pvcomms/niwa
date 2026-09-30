import type { Metadata } from "next";
import Keel from "@/components/Keel";

export const metadata: Metadata = {
  title: "keel · niwa",
};

export default function Page() {
  return <Keel />;
}
