/**
 * Distance calculation & formatting utility for Remix SabaiDee Massage
 */

/**
 * Calculates geodesic distance between two latitude/longitude points in kilometers (Haversine formula).
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers with 2 decimal precision
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    typeof lat1 !== 'number' || isNaN(lat1) ||
    typeof lon1 !== 'number' || isNaN(lon1) ||
    typeof lat2 !== 'number' || isNaN(lat2) ||
    typeof lon2 !== 'number' || isNaN(lon2)
  ) {
    return 0;
  }

  // Same coordinates
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return parseFloat(distance.toFixed(2));
}

/**
 * Formats distance in kilometers into a human-friendly string (e.g. "350 เมตร" or "2.4 กม.").
 * @param distanceInKm Distance in kilometers
 * @returns Human-friendly formatted string
 */
export function formatDistance(distanceInKm: number): string {
  if (typeof distanceInKm !== 'number' || isNaN(distanceInKm) || distanceInKm <= 0) {
    return '0 ม.';
  }

  if (distanceInKm < 1) {
    const meters = Math.round(distanceInKm * 1000);
    return `${meters} เมตร (${distanceInKm.toFixed(2)} กม.)`;
  }

  return `${distanceInKm.toFixed(1)} กม.`;
}

/**
 * Formats distance compactly (e.g. "350ม." or "2.4กม.").
 */
export function formatDistanceCompact(distanceInKm: number): string {
  if (typeof distanceInKm !== 'number' || isNaN(distanceInKm) || distanceInKm <= 0) {
    return '0ม.';
  }

  if (distanceInKm < 1) {
    const meters = Math.round(distanceInKm * 1000);
    return `${meters} ม.`;
  }

  return `${distanceInKm.toFixed(1)} กม.`;
}

/**
 * Calculates travel fee based on settings and distance
 */
export function calculateTravelFee(
  distanceInKm: number,
  feePerKm: number,
  tiers?: Array<{ minKm: number; maxKm: number; fee: number }>
): { fee: number; description: string } {
  let fee = parseFloat((distanceInKm * feePerKm).toFixed(2));
  let description = `คิดค่าเดินทางกิโลเมตรละ ฿${feePerKm}`;

  if (tiers && tiers.length > 0) {
    const sortedTiers = [...tiers].sort((a, b) => a.maxKm - b.maxKm);
    let matchedTier = false;
    for (const tier of sortedTiers) {
      if (distanceInKm >= tier.minKm && distanceInKm <= tier.maxKm) {
        fee = tier.fee;
        description = `ค่าเดินทางช่วง ${tier.minKm}-${tier.maxKm} กม. (฿${tier.fee})`;
        matchedTier = true;
        break;
      }
    }
    if (!matchedTier && distanceInKm > sortedTiers[sortedTiers.length - 1].maxKm) {
      description = `เกินระยะขั้นบันได คิดกิโลเมตรละ ฿${feePerKm}`;
    }
  }

  return { fee: parseFloat(fee.toFixed(2)), description };
}

/**
 * Generates a Google Maps direction navigation URL
 */
export function getGoogleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
}
