import type { Metadata } from "next";
import Mask from "@/components/Mask";

export const metadata: Metadata = {
  title: "mask · niwa",
};

export default function Page() {
  return <Mask />;
}
