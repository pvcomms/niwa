import type { Metadata } from "next";
import Sieve from "@/components/Sieve";

export const metadata: Metadata = {
  title: "sieve · niwa",
};

export default function Page() {
  return <Sieve />;
}
