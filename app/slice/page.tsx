import type { Metadata } from "next";
import Slice from "@/components/Slice";

export const metadata: Metadata = {
  title: "slice · niwa",
};

export default function Page() {
  return <Slice />;
}
