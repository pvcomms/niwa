import type { Metadata } from "next";
import HalfSecond from "@/components/HalfSecond";

export const metadata: Metadata = {
  title: "half-second · niwa",
};

export default function Page() {
  return <HalfSecond />;
}
