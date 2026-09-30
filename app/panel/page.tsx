import type { Metadata } from "next";
import Panel from "@/components/Panel";

export const metadata: Metadata = {
  title: "panel · niwa",
};

export default function Page() {
  return <Panel />;
}
