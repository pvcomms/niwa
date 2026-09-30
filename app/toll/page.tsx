import type { Metadata } from "next";
import Toll from "@/components/Toll";

export const metadata: Metadata = {
  title: "toll · niwa",
};

export default function Page() {
  return <Toll />;
}
