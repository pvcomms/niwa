import type { Metadata } from "next";
import Course from "@/components/Course";

export const metadata: Metadata = {
  title: "course · niwa",
};

export default function Page() {
  return <Course />;
}
