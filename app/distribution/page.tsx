import type { Metadata } from "next";
import Distribution from "@/components/Distribution";

export const metadata: Metadata = {
  title: "distribution · niwa",
};

export default function Page() {
  return <Distribution />;
}
