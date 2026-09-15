import type { PlaceCandidate } from "../../features/places/types.ts";
import type { BikePlace } from "./domain.ts";

/** Source-specific observations stay in BIKE; common place selection uses the existing DTO. */
export function toPlaceCandidate(place: BikePlace): PlaceCandidate {
  return {
    candidateId: place.id, placeId: null, name: place.name,
    address: place.tags["addr:full"] ?? null,
    coordinates: [place.position.longitude, place.position.latitude],
    categories: [place.category], provider: "openstreetmap",
    externalId: place.id.replace(/^osm:/, "").replace(":", "/"),
    buildingKey: null, sourceUrl: place.source.url, attribution: place.source.attribution,
    fetchedAt: place.source.fetchedAt, retention: "storable",
  };
}
