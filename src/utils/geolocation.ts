/**
 * Robust Geolocation helper for Remix SabaiDee Massage
 * Handles High-Accuracy GPS on mobile devices with fallback to network/cell positioning
 */

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Gets real current GPS location with high accuracy first, falling back to low accuracy if timeout/failure.
 */
export async function getRealCurrentLocation(timeoutMs: number = 8000): Promise<GeoLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("เบราว์เซอร์หรืออุปกรณ์นี้ไม่รองรับระบบ Geolocation GPS"));
      return;
    }

    let isResolved = false;

    // Try high accuracy first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        }
      },
      (errHigh) => {
        console.warn("High-accuracy GPS failed, trying fallback:", errHigh.message);
        // Fallback to standard/network positioning
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isResolved) {
              isResolved = true;
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              });
            }
          },
          (errLow) => {
            if (!isResolved) {
              isResolved = true;
              reject(new Error(errLow.message || "ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิดการอนุญาตตำแหน่งบนโทรศัพท์"));
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

/**
 * Watches real GPS location with continuous updates
 */
export function watchRealLocation(
  onLocation: (result: GeoLocationResult) => void,
  onError?: (err: Error) => void
): () => void {
  if (!navigator.geolocation) {
    if (onError) onError(new Error("Geolocation not supported"));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
    },
    (err) => {
      if (onError) onError(new Error(err.message));
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
