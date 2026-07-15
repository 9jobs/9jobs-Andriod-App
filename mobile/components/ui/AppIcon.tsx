import Svg, { Circle, Path } from "react-native-svg";
import type { ColorValue } from "react-native";
import { colors } from "@/theme";

type AppIconProps = {
  name:
    | "home"
    | "search"
    | "saved"
    | "tracker"
    | "profile"
    | "spark"
    | "pin"
    | "grid"
    | "mail"
    | "mic"
    | "resume"
    | "bell"
    | "story"
    | "settings"
    | "info"
    | "briefcase"
    | "eye"
    | "eye-off";
  color?: ColorValue;
  size?: number;
  strokeWidth?: number;
};

export function AppIcon({
  name,
  color = colors.text,
  size = 20,
  strokeWidth = 2,
}: AppIconProps) {
  switch (name) {
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 10.8L12 4L20 10.8V19A1 1 0 0 1 19 20H5A1 1 0 0 1 4 19V10.8Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "search":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="6" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M16 16L20 20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "saved":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M7 4H17A1 1 0 0 1 18 5V20L12 16L6 20V5A1 1 0 0 1 7 4Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "tracker":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 18L10 13L13 16L18 9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M18 9H14"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "profile":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M5 19C6.8 16.3 8.9 15 12 15C15.1 15 17.2 16.3 19 19"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "spark":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L13.7 8.3L20 10L13.7 11.7L12 18L10.3 11.7L4 10L10.3 8.3L12 2Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "pin":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 21C15.5 16.8 18 13.7 18 10.5C18 6.9 15.3 4 12 4C8.7 4 6 6.9 6 10.5C6 13.7 8.5 16.8 12 21Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="10" r="2" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "grid":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 5H10V10H5V5Z" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M14 5H19V10H14V5Z" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M5 14H10V19H5V14Z" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M14 14H19V19H14V14Z" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "mail":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 7H20V17H4V7Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path
            d="M5 8L12 13L19 8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "mic":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4C10.3 4 9 5.3 9 7V11C9 12.7 10.3 14 12 14C13.7 14 15 12.7 15 11V7C15 5.3 13.7 4 12 4Z"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path d="M7 11C7 13.8 9.2 16 12 16C14.8 16 17 13.8 17 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M12 16V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "resume":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7 4H14L18 8V20H7V4Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M14 4V8H18" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M10 12H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M10 15H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "bell":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 9.5C18 6.46 15.99 4 12.95 4H11.05C8.01 4 6 6.46 6 9.5V13.32C6 14.13 5.72 14.91 5.21 15.54L4.32 16.62C3.61 17.49 4.23 18.8 5.35 18.8H18.65C19.77 18.8 20.39 17.49 19.68 16.62L18.79 15.54C18.28 14.91 18 14.13 18 13.32V9.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 20C10.48 21.08 11.12 21.6 12 21.6C12.88 21.6 13.52 21.08 14 20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "story":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 5H18V19H6V5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M9 9H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M9 12H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M9 15H13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "settings":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M12 4V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M12 18V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M4 12H6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M18 12H20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M6.3 6.3L7.7 7.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M16.3 16.3L17.7 17.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M16.3 7.7L17.7 6.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M6.3 17.7L7.7 16.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case "info":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M12 11V16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="12" cy="8" r="1" fill={color} />
        </Svg>
      );
    case "briefcase":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 8H20V18H4V8Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M9 8V6H15V8" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M4 12H20" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "eye":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case "eye-off":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}
