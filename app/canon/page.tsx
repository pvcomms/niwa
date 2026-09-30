import type { Metadata } from "next";
import Canon from "@/components/Canon";

export const metadata: Metadata = {
  title: "canon · niwa",
};

export default function Page() {
  return <Canon />;
}
