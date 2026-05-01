// Lokalizace názvů vybavení (rental_amenities) – DB drží anglické názvy.
const map: Record<string, { cs: string; es: string }> = {
  "Air conditioning": { cs: "Klimatizace", es: "Aire acondicionado" },
  "Dryer": { cs: "Sušička", es: "Secadora" },
  "Heating": { cs: "Topení", es: "Calefacción" },
  "Kitchen": { cs: "Kuchyně", es: "Cocina" },
  "Washer": { cs: "Pračka", es: "Lavadora" },
  "WiFi": { cs: "Wi-Fi", es: "Wi-Fi" },
  "Workspace": { cs: "Pracovní místo", es: "Espacio de trabajo" },
  "TV": { cs: "Televize", es: "Televisión" },
  "Beach access": { cs: "Přístup na pláž", es: "Acceso a la playa" },
  "Breakfast": { cs: "Snídaně", es: "Desayuno" },
  "Free parking": { cs: "Parkování zdarma", es: "Aparcamiento gratis" },
  "Garden": { cs: "Zahrada", es: "Jardín" },
  "Gym": { cs: "Posilovna", es: "Gimnasio" },
  "Hot tub": { cs: "Vířivka", es: "Jacuzzi" },
  "Mountain view": { cs: "Výhled na hory", es: "Vista a la montaña" },
  "Ocean view": { cs: "Výhled na oceán", es: "Vista al océano" },
  "Pool": { cs: "Bazén", es: "Piscina" },
  "Self check-in": { cs: "Samoobslužný check-in", es: "Auto check-in" },
  "Pet friendly": { cs: "Domácí mazlíčci povoleni", es: "Admite mascotas" },
  "Smoking allowed": { cs: "Kouření povoleno", es: "Se permite fumar" },
};

export const localizeAmenity = (name: string, lang: string): string => {
  const l = (lang || "en").split("-")[0];
  if (l === "en") return name;
  const entry = map[name];
  if (!entry) return name;
  return l === "cs" ? entry.cs : l === "es" ? entry.es : name;
};
