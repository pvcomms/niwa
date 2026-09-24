import type { Metadata } from "next";
import Chronology from "@/components/Chronology";

export const metadata: Metadata = {
  title: "chronology · niwa",
};

export default function Page() {
  return <Chronology />;
}
