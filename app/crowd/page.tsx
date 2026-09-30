import type { Metadata } from "next";
import Crowd from "@/components/Crowd";

export const metadata: Metadata = {
  title: "crowd · niwa",
};

export default function Page() {
  return <Crowd />;
}
