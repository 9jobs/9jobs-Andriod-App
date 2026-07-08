import { Text } from "react-native";
import { PremiumSecondaryScreen } from "@/components/premium/PremiumSecondaryScreen";
import { getPremiumScreenContent } from "@/lib/data/premium-content";

export default function PricingScreen() {
  const content = getPremiumScreenContent("pricing");
  if (!content) return <Text>Missing pricing content</Text>;
  return <PremiumSecondaryScreen content={content} />;
}
