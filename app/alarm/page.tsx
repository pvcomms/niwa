import type { Metadata } from "next";
import Alarm from "@/components/Alarm";

export const metadata: Metadata = {
  title: "alarm · niwa",
};

export default function Page() {
  return <Alarm />;
}
