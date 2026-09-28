import type { Metadata } from "next";
import Fence from "@/components/Fence";

export const metadata: Metadata = {
  title: "fence · niwa",
};

export default function Page() {
  return <Fence />;
}
