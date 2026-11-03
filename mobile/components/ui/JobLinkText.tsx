import { Alert, Linking, Text, type TextProps } from "react-native";

// Shorten only the displayed URL; keep the original destination intact.
export function JobLinkText({ children, ...props }: Omit<TextProps, "children"> & { children: string }) {
  return (
    <Text {...props}>
      {children.split(/(https?:\/\/[^\s]+)/gi).map((part, index) => {
        if (!/^https?:\/\//i.test(part)) return part;
        return (
          <Text
            key={index}
            accessibilityRole="link"
            accessibilityLabel="Open job link"
            style={{ textDecorationLine: "underline" }}
            onPress={() => {
              void Linking.openURL(part).catch(() => {
                Alert.alert("Unable to open link", "Please try again.");
              });
            }}
          >
            Link
          </Text>
        );
      })}
    </Text>
  );
}
