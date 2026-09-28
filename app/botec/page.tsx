import type { Metadata } from "next";
import Botec from "@/components/Botec";

export const metadata: Metadata = {
  title: "botec · niwa",
};

export default function Page() {
  return <Botec />;
}
