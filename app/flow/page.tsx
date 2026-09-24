import type { Metadata } from "next";
import Flow from "@/components/Flow";

export const metadata: Metadata = {
  title: "flow · niwa",
};

export default function Page() {
  return <Flow />;
}
