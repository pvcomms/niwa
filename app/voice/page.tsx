import type { Metadata } from "next";
import FamiliarVoice from "@/components/FamiliarVoice";

export const metadata: Metadata = {
  title: "voice · niwa",
};

export default function Page() {
  return <FamiliarVoice />;
}
