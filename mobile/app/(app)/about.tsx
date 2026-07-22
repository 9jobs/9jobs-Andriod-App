import { Text } from "react-native";
import { AboutPremiumScreen } from "@/components/premium/PremiumSecondaryScreen";
import { getPremiumScreenContent } from "@/lib/data/premium-content";

export default function AboutScreen() {
  const content = getPremiumScreenContent("about");
  if (!content) return <Text>Missing about content</Text>;
  return <AboutPremiumScreen content={content} />;
}
