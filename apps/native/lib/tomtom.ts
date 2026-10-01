const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;

export type ReverseGeocodeResult = {
  label: string;
  address: string;
};

type TomTomAddress = {
  freeformAddress?: string;
  municipalitySubdivision?: string;
  localName?: string;
  municipality?: string;
};

type TomTomReverseResponse = {
  addresses?: Array<{ address?: TomTomAddress }>;
};

function pickLabel(address: TomTomAddress): string {
  return (
    address.municipalitySubdivision?.trim() ||
    address.localName?.trim() ||
    address.municipality?.trim() ||
    address.freeformAddress?.trim() ||
    "Your area"
  );
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  if (!TOMTOM_KEY) {
    throw new Error("Add EXPO_PUBLIC_TOMTOM_API_KEY to the native app environment.");
  }

  const position = `${latitude},${longitude}`;
  const url =
    `https://api.tomtom.com/search/2/reverseGeocode/${encodeURIComponent(position)}.json` +
    `?key=${encodeURIComponent(TOMTOM_KEY)}&language=en-GB`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("TomTom could not look up this location.");
  }

  const data = (await response.json()) as TomTomReverseResponse;
  const address = data.addresses?.[0]?.address;
  if (!address) {
    const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    return { label: "Your area", address: coordinates };
  }

  const label = pickLabel(address);
  return {
    label,
    address: address.freeformAddress?.trim() || label,
  };
}
