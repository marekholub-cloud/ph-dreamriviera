
Uživatel se ptá, kde najde formulář pro přidání nové nemovitosti hostitele. Toto je čistě informační dotaz – není potřeba žádná implementace, jen vysvětlení.

Z kódu vím:
- `MyRentalsSection.tsx` má tlačítko "Přidat pronájem" v pravém horním rohu karty, které otevírá `RentalPropertyFormDialog`.
- Sekce je dostupná v `UnifiedDashboard` pod routou `my-rentals`.
- Admin alternativa: `RentalPropertiesManager` v sekci `rental-properties` (jen pro adminy) s tlačítkem "Nová nemovitost".

## Kde najdete formulář pro přidání nemovitosti

**Jako hostitel (jakýkoli přihlášený uživatel):**
1. Přejděte do `/admin` (Můj dashboard)
2. V postranním menu otevřete sekci **„Moje pronájmy"**
3. Vpravo nahoře v kartě klikněte na tlačítko **„Přidat pronájem"** (s ikonou +)
4. Otevře se dialog s formulářem pro vytvoření listingu

**Jako administrátor (správa všech nemovitostí):**
1. V postranním menu admin sekce otevřete **„Pronájmy – nemovitosti"**
2. Vpravo nahoře klikněte na **„Nová nemovitost"**
3. Otevře se stejný formulář s admin oprávněními (možnost nastavit Featured, vlastníka apod.)

Oba vstupy používají stejnou komponentu `RentalPropertyFormDialog`, takže formulář vypadá a chová se stejně – liší se jen rozsah práv.

Pokud by tlačítko nebylo v menu vidět, dejte mi vědět – mohu zkontrolovat, zda je sekce `my-rentals` správně registrovaná v `useRoleBasedSections` pro vaši roli.
