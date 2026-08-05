import { useMemo } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";

import { buildCommunityMapHtml } from "@/lib/community-map-html";

type CommunityMapProps = {
  height?: number;
};

export default function CommunityMap({ height = 150 }: CommunityMapProps) {
  const mapHtml = useMemo(() => buildCommunityMapHtml(), []);

  return (
    <View style={{ height, width: "100%", backgroundColor: "#e2e8f0", overflow: "hidden" }}>
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