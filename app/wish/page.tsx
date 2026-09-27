import type { Metadata } from "next";
import Wish from "@/components/Wish";

export const metadata: Metadata = {
  title: "wish · niwa",
};

export default function Page() {
  return <Wish />;
}
