import type { Metadata } from "next";
import Way from "@/components/Way";

export const metadata: Metadata = {
  title: "way · niwa",
};

export default function Page() {
  return <Way />;
}
