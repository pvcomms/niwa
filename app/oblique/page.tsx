import type { Metadata } from "next";
import Oblique from "@/components/Oblique";

export const metadata: Metadata = {
  title: "oblique · niwa",
};

export default function Page() {
  return <Oblique />;
}
