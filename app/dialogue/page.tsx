import type { Metadata } from "next";
import Dialogue from "@/components/Dialogue";

export const metadata: Metadata = {
  title: "dialogue · niwa",
};

export default function Page() {
  return <Dialogue />;
}
