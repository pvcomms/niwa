import type { Metadata } from "next";
import Act from "@/components/Act";

export const metadata: Metadata = {
  title: "act · niwa",
};

export default function Page() {
  return <Act />;
}
