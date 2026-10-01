import { useMemo } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";

import { useAppTheme } from "@/contexts/app-theme-context";
import { buildCommunityMapHtml } from "@/lib/community-map-html";

type CommunityMapProps = {
  height?: number;
};

export default function CommunityMap({ height = 150 }: CommunityMapProps) {
  const { isDark, colors } = useAppTheme();
  const mapHtml = useMemo(() => buildCommunityMapHtml(undefined, undefined, undefined, isDark), [isDark]);

  return (
    <View style={{ height, width: "100%", backgroundColor: colors.chip, overflow: "hidden" }}>
      <WebView
        source={{ html: mapHtml }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
      />
    </View>
  );
}