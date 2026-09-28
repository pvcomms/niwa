import type { Metadata } from "next";
import Muster from "@/components/Muster";

export const metadata: Metadata = {
  title: "muster · niwa",
};

export default function Page() {
  return <Muster />;
}
