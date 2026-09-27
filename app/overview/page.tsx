import type { Metadata } from "next";
import Overview from "@/components/Overview";

export const metadata: Metadata = {
  title: "overview · niwa",
};

export default function Page() {
  return <Overview />;
}
