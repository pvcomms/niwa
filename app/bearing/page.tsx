import type { Metadata } from "next";
import Bearing from "@/components/Bearing";

export const metadata: Metadata = {
  title: "指針 bearing · 庭 niwa",
};

export default function Page() {
  return <Bearing />;
}
