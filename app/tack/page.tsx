import type { Metadata } from "next";
import Tack from "@/components/Tack";

export const metadata: Metadata = {
  title: "tack · niwa",
};

export default function Page() {
  return <Tack />;
}
