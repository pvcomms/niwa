import type { Metadata } from "next";
import Unison from "@/components/Unison";

export const metadata: Metadata = {
  title: "unison · niwa",
};

export default function Page() {
  return <Unison />;
}
