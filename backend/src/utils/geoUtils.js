function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const pLat1 = Number(lat1);
  const pLon1 = Number(lon1);
  const pLat2 = Number(lat2);
  const pLon2 = Number(lon2);

  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) {
    return 0;
  }

  const R = 6371e3; // Earth radius in meters
  const dLat = (pLat2 - pLat1) * (Math.PI / 180);
  const dLon = (pLon2 - pLon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(pLat1 * (Math.PI / 180)) * Math.cos(pLat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const clampedA = Math.min(1, Math.max(0, a));
  return R * 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
}

function formatDistance(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) return '0m';
  const m = Number(meters);
  if (m >= 1000) {
    return `${(m / 1000).toFixed(1)} km`;
  }
  return `${Math.round(m)}m`;
}

function getTravelSpeedKmh(lat1, lon1, time1, lat2, lon2, time2) {
  const distMeters = getDistanceInMeters(lat1, lon1, lat2, lon2);
  const timeDiffHours = Math.abs(time2 - time1) / 3_600_000;
  if (timeDiffHours === 0) return Infinity;
  return (distMeters / 1000) / timeDiffHours;
}

module.exports = { getDistanceInMeters, formatDistance, getTravelSpeedKmh };

