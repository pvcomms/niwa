import type { Metadata } from "next";
import Notice from "@/components/Notice";

export const metadata: Metadata = {
  title: "notice · niwa",
};

export default function Page() {
  return <Notice />;
}
