import { Text, View } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";

const GOLD = "#d98e2b";

type BrandMarkProps = {
  size?: number;
  color?: string;
};

export function BrandMark({ size = 72, color = "#ffffff" }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon fill={GOLD} points="50.0,17.0 50.0,0.0 72.7,5.45 64.98,20.6" />
      <Polygon fill={color} points="73.33,26.67 85.36,14.64 97.55,34.55 81.38,39.8" />
      <Polygon fill={color} points="83.0,50.0 100.0,50.0 94.55,72.7 79.4,64.98" />
      <Polygon fill={color} points="73.33,73.33 85.36,85.36 65.45,97.55 60.2,81.38" />
      <Polygon fill={color} points="50.0,83.0 50.0,100.0 27.3,94.55 35.02,79.4" />
      <Polygon fill={color} points="26.67,73.33 14.64,85.36 2.45,65.45 18.62,60.2" />
      <Polygon fill={color} points="17.0,50.0 0.0,50.0 5.45,27.3 20.6,35.02" />
      <Polygon fill={color} points="26.67,26.67 14.64,14.64 34.55,2.45 39.8,18.62" />
      <Circle fill={color} cx="50" cy="50" r="11" />
    </Svg>
  );
}

export function BrandLockup() {
  return (
    <View style={{ alignItems: "center" }}>
      <BrandMark size={72} />
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 10, gap: 6 }}>
        <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "800" }}>Sentinel</Text>
        <Text style={{ color: GOLD, fontSize: 18, fontWeight: "700" }}>360</Text>
      </View>
    </View>
  );
}
