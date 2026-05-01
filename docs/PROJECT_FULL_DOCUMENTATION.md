---
title: DREAM RIVIERA — Full Project Documentation
generated_by: Lovable AI
generated_at: 2026-05-01T20:14:23Z
version: 1.0
source: full chat history + current codebase snapshot
---

# DREAM RIVIERA — Kompletní projektová dokumentace

> **Pozn. ke zdrojům:** Chat historie je dostupná pouze ve formě shrnutí předchozích iterací (summary messages) — přesné timestampy jednotlivých zpráv nejsou v kontextu k dispozici. Citace z chatu jsou tedy parafrázované ze summary blocků. Kódová báze je čtena přímo ze stavu repa v okamžiku generování.
> **INFO CHYBÍ: přesné timestampy chat zpráv** — bylo by potřeba získat z exportu konverzace mimo Lovable kontext.
> **INFO CHYBÍ: git commit hashy** — git příkazy jsou v Lovable sandboxu zakázané, není možné získat SHA jednotlivých commitů.

---

## 1. HISTORIE PROJEKTU

### 1.1 První zadání uživatele

První prompty v aktuálně dostupné historii se týkají úprav existujícího projektu (původně **go2dubai.online**, Dubaj/UAE realitní portál) směrem k novému brandu **DREAM RIVIERA** / **OsaBooking.com** zaměřenému na **Filipíny** a **Costa Rica** villy.

> **INFO CHYBÍ: úplně první prompt projektu** — v dostupném summary kontextu jsou k dispozici pouze pozdější iterace (rebrand z Dubaje na Filipíny / Costa Rica). Originální zadání projektu go2dubai.online není v této session dostupné.
> Zdroj: `mem://index.md` zmiňuje "OsaBooking.com: Costa Rica villa rentals" jako Core memory — tedy projekt prošel pivotem.

### 1.2 Chronologie milníků (z chat summary)

| # | Co bylo požadováno | Co bylo dodáno | Změna směru |
|---|---|---|---|
| M1 | Upravit logo ve footer sekci tak, aby nebylo zdeformované | Edit `src/components/Footer.tsx` — opraveno zobrazení loga | ne |
| M2 | Změnit text pod logem na "DreamRiviera.com is a premium platform connecting international investors with curated private villa opportunities in the Philippines…" | Aktualizovány i18n překlady cs/en/es v `src/i18n/locales/*/common.json` | **Pivot brandu z Dubaje na Filipíny** |
| M3 | Roztáhnout footer pouze na 3 sloupce | Edit `src/components/Footer.tsx` — grid layout změněn | ne |
| M4 | Změnit kontakt na +420 727 822 988 a info@dreamriviera.com | Edit `src/components/Footer.tsx` (`tel:` a `mailto:` linky) | ne |
| M5 | Vyměnit hero video na /why-dubai a přesměrovat na /why-philippines, změnit text patičky z WHY DUBAI na WHY PHILIPPINES | Nový asset `src/assets/why-philippines-hero.mp4`, route `/why-philippines` v `src/App.tsx`, edit `Footer.tsx`, edit `src/pages/WhyDubai.tsx` | **Pivot Dubai → Philippines** |
| M6 | Změnit texty v hero sekci /why-philippines (eyebrow, title, subtitle, CTA) | Edit `src/pages/WhyDubai.tsx` — heroEyebrow/Title/Subtitle/Cta | ne |
| M7 | Sestavit kompletní projektovou dokumentaci do `docs/PROJECT_FULL_DOCUMENTATION.md` | (tento soubor) | ne |

### 1.3 Major pivots

- **Pivot 1:** `go2dubai.online` (Dubai realitní investice) → `DreamRiviera.com` (Filipíny villa investice).  
  Důkaz v kódu: `src/pages/Auth.tsx` stále obsahuje hardcoded brand "go2dubai.online" a "Your gateway to Dubai" (řádky ~280, 295). Logo asset `src/assets/produbai-logo-white.svg` zůstal. Routes `/why-dubai` i `/why-philippines` i `/why-costa-rica` všechny mapují na stejnou komponentu `WhyDubai`. To znamená, že **rebrand je nedokončený**.
- **Pivot 2 (částečný):** Memory `mem://index.md` říká "OsaBooking.com: Costa Rica villa rentals" — což naznačuje, že existoval ještě stav cílení na Costa Rica. Aktuální texty v hero referují Filipíny.

### 1.4 Zamítnuté funkce (z memory)

- **Boční ovládací prvky** (sharing, consultation, WhatsApp tab) — z `mem://index.md` Core: "Hide side controls for sharing, consultation, and WhatsApp. Do not re-add."  
  Zdroj: `src/App.tsx:91` — komentář "Bočná tlačítka skryta na přání: ShareSidebar, WhatsAppSidebarTab, ConsultationSidebarTab".

---

## 2. PRODUKT — CO TO JE

### 2.1 Identifikace
- **Aktuální brand:** DreamRiviera.com (zobrazený v footeru i18n textech).
- **Sekundární brand v kódu:** go2dubai.online (`src/pages/Auth.tsx`), produbai-logo-white.svg.
- **Memory brand:** OsaBooking.com (Costa Rica) — `mem://index.md`.
- **Doména produkční:** `https://ph-dreamriviera.lovable.app` (z `<project_urls>`).
- **Custom domain:** žádná (z `<project_urls>`).
- **Project ID (Lovable):** 68abf57f-bb15-4689-8703-40838e8c1bbc.

### 2.2 Cílová skupina
Mezinárodní investoři do private villa opportunities na Filipínách (per i18n footer text).  
Sekundárně (per memory): Costa Rica villa rentals, všichni přihlášení uživatelé mohou být hosty a spravovat své pronájmy.

### 2.3 Problem statement
Z i18n textu footeru: "premium platform connecting international investors with curated private villa opportunities in the Philippines, combining local expertise, carefully selected projects, and a seamless end-to-end investment experience."

### 2.4 Unique value proposition
**INFO CHYBÍ: explicitní UVP** — v chatu nebylo formulováno mimo footer text. Z kódu lze odvodit: kurátorovaný výběr projektů, lokální expertýza, end-to-end investiční zážitek, AI chatbot pro investorský profil, dual role (investor + host pro villa rentals).

### 2.5 Konkurence
**INFO CHYBÍ: konkurence v chatu nezmíněna.**

### 2.6 Business model / monetizace
Z DB schématu (tabulky `deals`, `commission_payouts`, `lead_commission_splits`):
- Provize z dealů (sloupec `commission_total`, `commission_rate` default 0.01 = 1 %).
- Multi-tier referral / affiliate systém (tabulky `affiliate_clicks`, `coordinator_assignments`, `lead_commission_splits` s `recipient_type`).
- Role obchodník / senior obchodnik / tipar / influencer_coordinator dostávají podíl z provize.
- Vedlejší: villa rentals (tabulky `rental_*`, `commission_payouts`, `rental_payouts`).

**INFO CHYBÍ: konkrétní pricing pro koncové uživatele, free vs paid tier.**

---

## 3. KOMPLETNÍ SEZNAM FUNKCIONALIT

### 3.1 Routes / stránky

| Path | Komponenta | Účel | Přístup |
|---|---|---|---|
| `/` | Index | Landing page | veřejné |
| `/villas` | Projects | Výpis villa projektů | veřejné |
| `/map`, `/map-for-sale`, `/nemovitosti-mapa` | PropertiesMap | Mapa nemovitostí | veřejné |
| `/nemovitost/:slug` | PropertyDetail | Detail nemovitosti | veřejné |
| `/oblasti` | Areas | Výpis oblastí | veřejné |
| `/oblast/:slug` | AreaDetail | Detail oblasti | veřejné |
| `/blog` | Blog | Blog | veřejné |
| `/download-catalog` | DownloadCatalog | Stažení katalogu (form gate) | veřejné |
| `/download-file` | DownloadFile | Stažení souboru | veřejné |
| `/dl` | DirectDownload | Direct download | veřejné |
| `/auth` | Auth | Login/Signup/Reset | veřejné |
| `/tipar-verification` | TiparVerification | Verifikace tiparů | veřejné |
| `/admin` | UnifiedDashboard | Sjednocený dashboard | role: admin, obchodnik, senior_obchodnik, tipar, influencer_coordinator |
| `/lead/:id` | LeadDetail | Detail leadu | role: viz výše |
| `/investor-profil` | InvestorProfile | Investorský profil | veřejné (kontroluje uvnitř) |
| `/embed/investor-form` | EmbedInvestorForm | Embed formulář pro 3rd party weby | veřejné |
| `/doporucene-projekty` | RecommendedProjects | AI doporučení | veřejné |
| `/rentals` | Rentals | Výpis pronájmů (villa rentals) | veřejné |
| `/rentals/host/:hostId` | RentalHostProfile | Profil hosta | veřejné |
| `/rentals/:slug` | RentalDetail | Detail pronájmu | veřejné |
| `/become-host` | BecomeHost | CTA stát se hostem | veřejné |
| `/host` | HostDashboard | Dashboard hosta | uvnitř ProtectedRoute? — z kódu `src/App.tsx:159` BEZ ProtectedRoute. **Bug**. |
| `/manager` | ManagerDashboard | Manager dashboard | role: admin, moderator |
| `/guest` | GuestDashboard | Guest (rental) dashboard | autentizovaný uživatel |
| `/why-philippines` | WhyDubai | Why Philippines (po rebrandu) | veřejné |
| `/why-dubai` | WhyDubai | (legacy alias) | veřejné |
| `/why-costa-rica` | WhyDubai | (alias na stejnou komponentu) | veřejné |
| `/invest` | Invest | Investování | veřejné |
| `/island-nest` | IslandNest | Island Nest | veřejné |
| `/muj-profil` | ObchodnikProfile | Profil obchodníka | autentizovaný uživatel |
| `*` | NotFound | 404 | veřejné |

Zdroj: `src/App.tsx:88-185`.

### 3.2 React komponenty

#### 3.2.1 Top-level (`src/components/`)
- `BecomeHostButton.tsx`
- `BecomeHostDialog.tsx`
- `BlogArticlesSection.tsx`
- `BlogBreadcrumb.tsx`
- `BlogHero.tsx`
- `BrochureRequestDialog.tsx`
- `CatalogDownloadDialog.tsx`
- `ConsultationRequestDialog.tsx`
- `ConsultationSidebarTab.tsx`
- `ContactDialog.tsx`
- `DashboardSwitcher.tsx`
- `DevelopersCarousel.tsx`
- `ErrorBoundary.tsx`
- `EventRegistrationSuccess.tsx`
- `FavoriteButton.tsx`
- `Footer.tsx`
- `HamburgerMenu.tsx`
- `InvestorChatbot.tsx`
- `NavLink.tsx`
- `Navbar.tsx`
- `NavbarUserAvatar.tsx`
- `NotificationCenter.tsx`
- `PhoneInputWithValidation.tsx`
- `PresentationDownloadDialog.tsx`
- `PrivacyPolicyDialog.tsx`
- `PropertiesGoogleMap.tsx`
- `PropertyBrochureDialog.tsx`
- `PropertyMap.tsx`
- `ProtectedRoute.tsx`
- `RegisterDialog.tsx`
- `SEO.tsx`
- `ScrollToTop.tsx`
- `SeminarCountdown.tsx`
- `ShareSidebar.tsx`
- `TermsOfServiceDialog.tsx`
- `WLMSeminarsWidget.tsx`
- `WhatsAppCheckbox.tsx`
- `WhatsAppSidebarTab.tsx`

#### 3.2.2 Admin (`src/components/admin/`)
- `admin/AdminLayout.tsx`
- `admin/AdminSidebar.tsx`
- `admin/AffiliateAnalytics.tsx`
- `admin/AllLeadsSection.tsx`
- `admin/AreasManager.tsx`
- `admin/BrochureRequestsManager.tsx`
- `admin/ChatbotConversationsManager.tsx`
- `admin/ChatbotHistoryManager.tsx`
- `admin/ChatbotSettingsManager.tsx`
- `admin/CircularProgress.tsx`
- `admin/ConsultationSlotsManager.tsx`
- `admin/ContactsAssignmentManager.tsx`
- `admin/DevelopersManager.tsx`
- `admin/EmailTemplatesManager.tsx`
- `admin/EventsManager.tsx`
- `admin/LocationPicker.tsx`
- `admin/LocationPickerMap.tsx`
- `admin/MyLeadsSection.tsx`
- `admin/NotificationDropdown.tsx`
- `admin/ObchodnikProfileCard.tsx`
- `admin/PropertiesManager.tsx`
- `admin/PropertyImagesManager.tsx`
- `admin/PropertyImporter.tsx`
- `admin/RentalAmenitiesManager.tsx`
- `admin/RentalPayoutsManager.tsx`
- `admin/RentalPropertiesManager.tsx`
- `admin/RentalReservationsManager.tsx`
- `admin/RentalReviewsManager.tsx`
- `admin/RentalStatsManager.tsx`
- `admin/SortableImageItem.tsx`
- `admin/StatCard.tsx`
- `admin/StatsDashboard.tsx`
- `admin/SuperhostManager.tsx`
- `admin/UnitPricesManager.tsx`
- `admin/UnitTypesManager.tsx`
- `admin/UserRegistrationManager.tsx`
- `admin/UserRolesManager.tsx`
- `admin/UsersManager.tsx`
- `admin/WLMSyncManager.tsx`
- `admin/XMLPropertyImporter.tsx`

#### 3.2.3 Dashboard (`src/components/dashboard/`)
- `dashboard/CoordinatorNetwork.tsx`
- `dashboard/FinancesSection.tsx`
- `dashboard/HostAvailabilitySection.tsx`
- `dashboard/LeadsOverview.tsx`
- `dashboard/MilestoneBanners.tsx`
- `dashboard/MyGuestStaysSection.tsx`
- `dashboard/MyPayoutsSection.tsx`
- `dashboard/MyProfileSection.tsx`
- `dashboard/MyRentalReservationsSection.tsx`
- `dashboard/MyRentalsSection.tsx`
- `dashboard/MyWishlistSection.tsx`
- `dashboard/ObchodnikEventRegistration.tsx`
- `dashboard/OfflineReservationSection.tsx`
- `dashboard/SeniorObchodnikDashboard.tsx`
- `dashboard/SuperhostStatusSection.tsx`
- `dashboard/TiparEventInvite.tsx`
- `dashboard/UserStatusCard.tsx`

#### 3.2.4 Rentals (`src/components/rentals/`)
- `rentals/CancelReservationDialog.tsx`
- `rentals/ContactHostButton.tsx`
- `rentals/ImportFromProjectButton.tsx`
- `rentals/PublicAvailabilityCalendar.tsx`
- `rentals/RentalAmenitiesAndRulesManager.tsx`
- `rentals/RentalAvailabilityManager.tsx`
- `rentals/RentalBookingDialog.tsx`
- `rentals/RentalFavoriteButton.tsx`
- `rentals/RentalGallery.tsx`
- `rentals/RentalMediaManager.tsx`
- `rentals/RentalMessageThread.tsx`
- `rentals/RentalMessagesInbox.tsx`
- `rentals/RentalPricingManager.tsx`
- `rentals/RentalPropertyFormDialog.tsx`
- `rentals/RentalReviewForm.tsx`
- `rentals/RentalReviewsList.tsx`
- `rentals/RentalRoomsManager.tsx`
- `rentals/RentalSpecialOffers.tsx`
- `rentals/RentalTransactionDialog.tsx`
- `rentals/RentalsMap.tsx`
- `rentals/SmartPricingCalendar.tsx`
- `rentals/SmartPricingCalendarTabs.tsx`
- `rentals/SuperhostBadge.tsx`

#### 3.2.5 Lead (`src/components/lead/`)
- `lead/AssignObchodnikDialog.tsx`
- `lead/ConsultationBookingTab.tsx`
- `lead/LeadActionButtons.tsx`
- `lead/RescheduleConsultationDialog.tsx`
- `lead/ScheduleConsultationDialog.tsx`

#### 3.2.6 Tipar (`src/components/tipar/`)
- `tipar/AddLeadDialog.tsx`
- `tipar/EmbeddableSupertipForm.tsx`
- `tipar/LeadsTable.tsx`
- `tipar/NewLeadNotification.tsx`
- `tipar/ReferrerLeadsTable.tsx`
- `tipar/SupertipForm.tsx`

#### 3.2.7 UI primitives (`src/components/ui/`)
Standardní shadcn/ui set — přibližně 50 souborů (accordion, alert-dialog, button, card, dialog, dropdown-menu, form, input, popover, select, sheet, sidebar, table, tabs, toast, toaster, tooltip, atd.). Není modifikováno mimo standardní shadcn.

### 3.3 UI funkce (zjištěno z komponent / dependencies)
- Search, filter (Projects, Rentals, Areas, AdminDashboard sekce)
- Pagination (admin tabulky)
- Drag & drop (`@dnd-kit/core`, `@dnd-kit/sortable`) — `SortableImageItem.tsx`, řazení obrázků
- File upload (PropertyImagesManager, RentalMediaManager)
- Carousel (`embla-carousel-react`) — DevelopersCarousel, RentalGallery
- Modaly/dialogy (Radix Dialog) — ContactDialog, BecomeHostDialog, BrochureRequestDialog, RegisterDialog, atd.
- Toast notifikace (`sonner`)
- Confetti (`canvas-confetti`) — pravděpodobně milestone celebrations
- Date picker (`react-day-picker`, `date-fns`) — kalendář dostupnosti pronájmů
- Mapy: Leaflet + Google Maps (`@react-google-maps/api`, `leaflet`, `react-leaflet`, `@googlemaps/markerclusterer`)
- Charts (`recharts`) — admin statistiky
- Forms (`react-hook-form` + `zod` validation)
- i18n (`i18next`, `react-i18next`) — cs / en / es
- Phone input s validací (PhoneInputWithValidation.tsx)
- AI chatbot pro investorský profil (InvestorChatbot.tsx + edge function `investor-chatbot`)

### 3.4 API volání

#### 3.4.1 Interní (Supabase Edge Functions)
- `admin-bulk-import`
- `admin-insert-property`
- `admin-manage-user`
- `admin-register-user`
- `book-consultation`
- `bootstrap-admin`
- `bulk-sync-leads-to-wlm`
- `create-or-update-lead`
- `custom-email-hook`
- `embed-investor-form`
- `external-lead-sync`
- `extract-property-data`
- `finalize-chatbot-profile`
- `generate-og-image`
- `generate-property-description`
- `get-ai-recommendations`
- `get-brochure-request`
- `get-chatbot-conversation`
- `get-google-maps-key`
- `get-public-rental-reservations`
- `get-wlm-api-key`
- `investor-chatbot`
- `landing-pages-api`
- `moviari-lead-capture`
- `og-renderer`
- `pull-leads-from-dubajreality`
- `save-chatbot-conversation`
- `save-investor-profile`
- `save-property`
- `send-brochure-notification`
- `send-contact-message`
- `send-event-registration-emails`
- `send-lead-to-wlm`
- `send-milestone-notification`
- `send-whatsapp-message`
- `submit-catalog-request`
- `subscribe-newsletter`
- `sync-to-preston`
- `track-affiliate-click`
- `track-download`
- `track-influencer-lead`

#### 3.4.2 Externí integrace (z env proměnných)
- **Lovable AI Gateway** (`LOVABLE_API_KEY`) — modely Gemini, GPT-5 — chatbot, get-ai-recommendations, generate-property-description, generate-og-image
- **Resend** (`RESEND_API_KEY`) — odesílání emailů (send-brochure-notification, send-event-registration-emails, send-contact-message, send-milestone-notification, custom-email-hook)
- **Twilio WhatsApp** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`) — send-whatsapp-message
- **Google Maps** (`GOOGLE_MAPS_API_KEY`) — mapy, get-google-maps-key
- **WLM API** (`WLM_API_KEY`, `WLM_EXTERNAL_API_KEY`) — sync leadů (send-lead-to-wlm, bulk-sync-leads-to-wlm, get-wlm-api-key) — **INFO CHYBÍ: co je WLM**, pravděpodobně externí CRM
- **DubajReality API** (`DUBAJREALITY_API_KEY`, `DUBAJREALITY_API_URL`) — pull-leads-from-dubajreality (legacy z Dubai éry)
- **Preston API** (`PRESTON_API_KEY`, `PRESTON_API_URL`, `PRESTON_OUTBOUND_API_KEY`) — sync-to-preston — **INFO CHYBÍ: co je Preston**

### 3.5 Dialogs / Modals
ContactDialog, BecomeHostDialog, BrochureRequestDialog, CatalogDownloadDialog, ConsultationRequestDialog, PresentationDownloadDialog, PrivacyPolicyDialog, PropertyBrochureDialog, RegisterDialog, TermsOfServiceDialog, RentalBookingDialog, RentalTransactionDialog, CancelReservationDialog, AssignObchodnikDialog, RescheduleConsultationDialog, ScheduleConsultationDialog, AddLeadDialog, RentalPropertyFormDialog.

### 3.6 Toast & error states
Globální `Toaster` (shadcn) + `Sonner` v `src/App.tsx`. ErrorBoundary v `src/components/ErrorBoundary.tsx`.

---

## 4. UŽIVATELSKÉ ROLE + OPRÁVNĚNÍ

### 4.1 Typologie rolí (enum `app_role`)
Z migrace `20260112180124_remix_migration_from_pg_dump.sql` a kontroly v `src/App.tsx`:

| Role | Popis |
|---|---|
| `admin` | Plný přístup, manage all |
| `senior_obchodnik` | Vedoucí obchodního týmu — vidí všechny leady, payouty, audit log |
| `obchodnik` | Obchodník — vidí pouze přiřazené leady |
| `tipar` | Tipař — generuje doporučení (referrals) |
| `influencer_coordinator` | Koordinátor influencerů — má pod sebou tipary (tabulka `coordinator_assignments`) |
| `moderator` | Moderátor (přístup k `/manager`) |
| `user` | Standardní uživatel (default) |

### 4.2 Matice oprávnění (zkrácená — odvozeno z RLS politik)

| Tabulka | admin | senior_obchodnik | obchodnik | tipar | user/anon |
|---|---|---|---|---|---|
| leads | CRUD | R (vše) | R/U vlastní (assigned) | R vlastní (referrer) | — |
| consultation_bookings | CRUD | R/U/I vše | R/U vlastní | I vlastní lead | — |
| consultation_slots | CRUD | R | own CRUD (obchodnik_id) | R available | — |
| brochure_requests | R/U/D | R | R vlastní (assigned) | — | — |
| chatbot_conversations | R | R | R | — | own (auth users) |
| commission_payouts | CRUD | R | R vlastní | — | — |
| favorites | — | — | — | — | own CRUD |
| areas, developers | CRUD | R | R | R | R |
| audit_log | R | R (lead/questionnaire) | — | — | — |
| events, event_slots | CRUD | — | — | — | R (active) |
| event_registrations | R/U/D | — | — | own I/R | — |
| user_roles | manage | — | — | — | own R (předpokládáno) |

Kompletní RLS politiky viz sekce 5.3.

### 4.3 Autentizace flow (z `src/pages/Auth.tsx` + `src/contexts/AuthContext.tsx`)
1. Uživatel přejde na `/auth`.
2. Mode = `login` | `signup` | `reset` | `update-password`.
3. Login: `signInWithPassword(email, password)` → AuthContext → `supabase.auth`.
4. Signup: `signUp(email, password)`, validace min 6 znaků hesla. **Bez automatického potvrzení emailu** (per Lovable Cloud guideline).
5. Reset: `supabase.auth.resetPasswordForEmail()` → email s redirectem na `/auth`.
6. Update password: po PASSWORD_RECOVERY eventu se přepne mode.
7. Po úspěšném loginu: pokud má team roli → redirect na `/admin`, jinak `/`.

### 4.4 Autorizace
- Klient: komponenta `ProtectedRoute` kontroluje `userRoles` z `AuthContext`.
- Server: RLS politiky + `has_role(auth.uid(), 'role'::app_role)` security definer funkce.

### 4.5 OAuth providers
**INFO CHYBÍ: konkrétní konfigurace OAuth** — v kódu `Auth.tsx` není OAuth tlačítko (Google/GitHub) implementované. Memory Lovable Cloud doporučuje Google OAuth, ale **není zapnuto**.

---

## 5. DATOVÝ MODEL

### 5.1 Tabulky (z `<supabase-tables>` v kontextu + migrace)

Hlavní entity — kompletní seznam (44 tabulek odhadováno z RLS výpisu, zde top-level):

| Tabulka | Účel |
|---|---|
| `affiliate_clicks` | Tracking affiliate kliků (referrer_id, affiliate_code) |
| `areas` | Oblasti / lokality (multi-country: UAE, PH, CR) |
| `audit_log` | Audit změn (entity_type, action, old/new values) |
| `brochure_requests` | Žádosti o katalog (jméno, email, telefon, vybrané brožury) |
| `catalog_downloads` | Tracking stažení katalogů |
| `chatbot_conversations` | AI chatbot konverzace (messages, investor_data JSON, branch quick/detailed) |
| `chatbot_settings` | Konfigurace chatbotu (system_prompt) |
| `clients` | Klienti (rozšíření leadů — investment_horizon, risk_tolerance, budget) |
| `commission_payouts` | Vyplacené provize (recipient_id, deal_id, amount, status) |
| `consultation_bookings` | Rezervace konzultací (lead_id, slot_id, status enum) |
| `consultation_slots` | Sloty obchodníků (capacity, booked_count) |
| `contact_messages` | Zprávy z kontaktního formuláře |
| `coordinator_assignments` | Mapping coordinator ↔ tipar |
| `deals` | Uzavřené dealy (lead_id, property_id, deal_value, commission_total) |
| `developers` | Developeři / značky |
| `email_templates` | Email šablony (category enum, trigger enum, html_content) |
| `event_registrations` | Registrace na eventy |
| `event_slots` | Časové sloty pro eventy |
| `events` | Eventy / semináře |
| `favorites` | Oblíbené nemovitosti uživatele |
| `investor_questionnaires` | Investorské dotazníky (responses JSON, target_markets, budget_min/max) |
| `lead_audit_log` | Audit změn leadů (samostatně od `audit_log`) |
| `lead_commission_splits` | Rozdělení provize na příjemce (percentage, recipient_type) |
| `lead_interactions` | Interakce s leadem (interaction_type, message, source_page) |
| `lead_notes` | Poznámky k leadu (note_type: standard/managerial, is_internal) |
| `leads` | Leads (lead_number serial, status, warmth_level, utm_*, click_history) |

**INFO CHYBÍ: kompletní výpis tabulek** — kontext byl ořezán u tabulky `leads`. Z migrací a RLS výpisu lze dovodit ještě tabulky pro: `properties`, `unit_types`, `unit_prices`, `property_images`, `rental_properties`, `rental_reservations`, `rental_reviews`, `rental_payouts`, `rental_messages`, `rental_amenities`, `rental_rooms`, `rental_special_offers`, `rental_pricing`, `rental_availability`, `superhost_status`, `notifications`, `user_roles`, `profiles`, `landing_pages`, `download_tracking`, `og_images`, `seminars`, `milestone_banners`. Pro úplný seznam je třeba projít všech 26 migrací.

### 5.2 Enumerace (custom types)
- `app_role` — admin, moderator, obchodnik, senior_obchodnik, tipar, influencer_coordinator, user
- `consultation_booking_status` — pending, confirmed, completed, cancelled (odhad)

### 5.3 RLS politiky
Všechny hlavní tabulky mají RLS zapnutou. Pattern:
- **Admin:** plný CRUD přes `has_role(auth.uid(), 'admin')`
- **Senior obchodník:** read all + některé write
- **Obchodník:** R/U pouze přiřazené (`assigned_obchodnik_id = auth.uid()`)
- **Tipař (referrer):** R vlastní (`referrer_id = auth.uid()`)
- **Anonymous:** zablokováno explicitními "Block anonymous *" politikami
- **Edge function only inserts:** `contact_messages`, `affiliate_clicks` mají `WITH CHECK false` na klient INSERTu — vstupují pouze přes edge funkce s service role

Detailní výpis: viz `<supabase-tables>` v kontextu (přibližně 200 politik celkově).

### 5.4 Foreign keys
Z výpisu RLS politik FK explicitně neuvedené (`No foreign keys for the table X`) — relace jsou implementované pouze na úrovni aplikační logiky a RLS expressions (např. `lead_id IN (SELECT id FROM leads WHERE …)`). **To je technický dluh** — viz sekce 10.

### 5.5 Migrace (chronologicky)

| # | Soubor | Popis (z názvu) |
|---|---|---|
| 1 | `20260112180124_remix_migration_from_pg_dump.sql` | 20260112180124_remix_migration_from_pg_dump |
| 2 | `20260419093411_eb61e405-e625-4cc1-8e5e-448f908d228a.sql` | 20260419093411_eb61e405-e625-4cc1-8e5e-448f908d228a |
| 3 | `20260419094600_146054a1-34d1-4001-86ae-602a120d421f.sql` | 20260419094600_146054a1-34d1-4001-86ae-602a120d421f |
| 4 | `20260419095801_8bd6cb3a-5b96-4f4a-8043-82852f15a140.sql` | 20260419095801_8bd6cb3a-5b96-4f4a-8043-82852f15a140 |
| 5 | `20260419101644_79807873-3209-42fa-8c00-1b8a3bb09f83.sql` | 20260419101644_79807873-3209-42fa-8c00-1b8a3bb09f83 |
| 6 | `20260419103746_e8f5f22d-8fb2-4b70-bd30-8bbf13510b9c.sql` | 20260419103746_e8f5f22d-8fb2-4b70-bd30-8bbf13510b9c |
| 7 | `20260419104351_ed8901ba-ed21-42fc-9743-6e8729bbe952.sql` | 20260419104351_ed8901ba-ed21-42fc-9743-6e8729bbe952 |
| 8 | `20260419105522_96b37d6e-fdec-4ec1-806e-f8e7751cee69.sql` | 20260419105522_96b37d6e-fdec-4ec1-806e-f8e7751cee69 |
| 9 | `20260419110737_f3ce0b27-b5eb-4119-b71c-c3d601e010db.sql` | 20260419110737_f3ce0b27-b5eb-4119-b71c-c3d601e010db |
| 10 | `20260419111726_acd40132-3c7c-4863-83d2-46b997bd5f22.sql` | 20260419111726_acd40132-3c7c-4863-83d2-46b997bd5f22 |
| 11 | `20260419112334_78152f75-680b-4f87-9b06-88f059b17d73.sql` | 20260419112334_78152f75-680b-4f87-9b06-88f059b17d73 |
| 12 | `20260419134948_ab79e5fd-00d7-4c73-aec1-b6a86efd5892.sql` | 20260419134948_ab79e5fd-00d7-4c73-aec1-b6a86efd5892 |
| 13 | `20260419141035_86f7fe96-0559-4deb-aca8-dfa4b3749eeb.sql` | 20260419141035_86f7fe96-0559-4deb-aca8-dfa4b3749eeb |
| 14 | `20260419152704_d80eb7c8-5603-4607-a7ee-ae3b7ddaad0b.sql` | 20260419152704_d80eb7c8-5603-4607-a7ee-ae3b7ddaad0b |
| 15 | `20260419210339_cb11fa7a-d528-4de5-b88f-6ae20367b799.sql` | 20260419210339_cb11fa7a-d528-4de5-b88f-6ae20367b799 |
| 16 | `20260419221432_a3633318-4d25-4709-b455-384e51a7220b.sql` | 20260419221432_a3633318-4d25-4709-b455-384e51a7220b |
| 17 | `20260420042939_613fbdb3-eec4-414c-9dd8-604467828cf0.sql` | 20260420042939_613fbdb3-eec4-414c-9dd8-604467828cf0 |
| 18 | `20260420092429_1a54bcd2-1fa3-47d0-a9bc-846d45bf78d9.sql` | 20260420092429_1a54bcd2-1fa3-47d0-a9bc-846d45bf78d9 |
| 19 | `20260420093056_24fd1781-ef0a-4a79-81e7-eaf14e0355a7.sql` | 20260420093056_24fd1781-ef0a-4a79-81e7-eaf14e0355a7 |
| 20 | `20260420094520_f54d2523-29d6-4f92-b3a3-2bd2cbbba8c3.sql` | 20260420094520_f54d2523-29d6-4f92-b3a3-2bd2cbbba8c3 |
| 21 | `20260420102438_78793caa-6acc-45fe-bcca-762a34a1c0d9.sql` | 20260420102438_78793caa-6acc-45fe-bcca-762a34a1c0d9 |
| 22 | `20260420103340_ed311529-1182-4aa5-a13f-5ca94f63a8d9.sql` | 20260420103340_ed311529-1182-4aa5-a13f-5ca94f63a8d9 |
| 23 | `20260420232809_f65be988-ff8f-4f41-9a01-a9f316f034c1.sql` | 20260420232809_f65be988-ff8f-4f41-9a01-a9f316f034c1 |
| 24 | `20260421003358_afd61d28-1af2-4f96-9077-58c9425505d5.sql` | 20260421003358_afd61d28-1af2-4f96-9077-58c9425505d5 |
| 25 | `20260421003711_6cd535e0-c5a4-46e1-8a67-284ae605bb42.sql` | 20260421003711_6cd535e0-c5a4-46e1-8a67-284ae605bb42 |
| 26 | `20260421022358_7f7dabc9-3c2a-437b-a085-3763033f94ee.sql` | 20260421022358_7f7dabc9-3c2a-437b-a085-3763033f94ee |


Celkem **26 migrací**. První je `remix_migration_from_pg_dump` (full dump z původního projektu), zbylých 25 jsou inkrementální změny z 19.–21. dubna 2026.

**INFO CHYBÍ: human-readable popis každé migrace** — názvy obsahují pouze UUID. Pro přesný popis je třeba otevřít každý SQL soubor.

### 5.6 Storage buckety
**INFO CHYBÍ: výpis storage bucketů** — v kontextu nejsou. Z kódu lze předpokládat buckety pro: property images, rental media, brochures, OG images, avatary. Získat lze přes Supabase storage API.

### 5.7 Seed data
**INFO CHYBÍ: seed data** — v repu není adresář `supabase/seed.sql`. Default záznamy pravděpodobně vkládá `bootstrap-admin` edge funkce a první migrace.

---

## 6. STATISTIKY A METRIKY

### 6.1 Co aplikace měří
- **affiliate_clicks** — kliky přes affiliate kód (page_url, ip_address, user_agent, was_first_click)
- **catalog_downloads** — kdo stáhl katalog (brochure_request_id, client_id, ip)
- **lead_interactions** — interakce s leadem (interaction_type, source_page)
- **audit_log** / **lead_audit_log** — kompletní audit změn entity
- **leads.click_history** — JSON s historií kliků
- **leads.utm_source/medium/campaign/term/content** — UTM tracking
- **track-affiliate-click**, **track-download**, **track-influencer-lead** edge funkce

### 6.2 Dashboard / reporty
Komponenty: `StatsDashboard.tsx`, `AffiliateAnalytics.tsx`, `RentalStatsManager.tsx`, `LeadsOverview.tsx`, `MyPayoutsSection.tsx`, `FinancesSection.tsx`, `SeniorObchodnikDashboard.tsx`. Charts přes `recharts`.

### 6.3 Externí analytics
**INFO CHYBÍ: GA4 / Plausible / PostHog integrace** — v `index.html` ani v package.json nejsou (nutno ověřit `index.html`).

### 6.4 KPIs
**INFO CHYBÍ: explicitně definované business KPIs** — v chatu nezmíněno. Implicitní z DB: počet leadů, conversion rate (lead → deal), průměrná hodnota dealu, provize per obchodník, rezervační rate u rentals, superhost status.

---

## 7. TECHNICKÝ STACK

### 7.1 Frontend
- **React 18.3.1**, **TypeScript 5.8.3**, **Vite 5.4.19** (`@vitejs/plugin-react-swc`)
- **Tailwind CSS 3.4.17** + **tailwindcss-animate** + **@tailwindcss/typography**
- **shadcn/ui** (Radix UI primitives — accordion, dialog, dropdown-menu, popover, select, atd.)
- **react-router-dom 6.30.1** — client-side routing
- **@tanstack/react-query 5.83.0** — server state
- **react-hook-form 7.61.1** + **zod 3.25.76** + **@hookform/resolvers** — forms / validation
- **i18next 26 + react-i18next 17** — i18n (cs / en / es)
- **framer-motion 12** — animace
- **lucide-react** — ikony
- **sonner** + shadcn toaster — notifikace
- **recharts** — charts
- **date-fns 4** + **react-day-picker 8** — kalendář
- **leaflet 1.9 + react-leaflet 5 + @react-google-maps/api 2.20** — mapy
- **embla-carousel-react** — carousel
- **@dnd-kit** — drag & drop
- **dompurify** — sanitace HTML
- **canvas-confetti** — efekty

### 7.2 Backend
- **Lovable Cloud** (Supabase pod kapotou)
  - Projekt ref: `bbgmibcvlmrmblbmwrjv`
  - URL: `https://bbgmibcvlmrmblbmwrjv.supabase.co`
- **Postgres** + **Row-Level Security**
- **41 Edge Functions** (Deno) — viz 3.4.1
- **@supabase/supabase-js 2.86**

### 7.3 Deployment
- **Lovable** (preview + published URL `https://ph-dreamriviera.lovable.app`)
- `vercel.json` přítomný — konfigurace pro Vercel deployment (rewrites pro `/og/*` na external Supabase OG renderer, security headers, edge middleware `middleware.ts`)
- **Build:** `vite build` (standardní)
- **Domain config:** custom doména nenastavena.

### 7.4 Third-party SaaS
| Služba | K čemu | ENV |
|---|---|---|
| Lovable AI Gateway | LLM | `LOVABLE_API_KEY` |
| Resend | Transactional emails | `RESEND_API_KEY` |
| Twilio | WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` |
| Google Maps | Mapy | `GOOGLE_MAPS_API_KEY` |
| WLM | Externí CRM | `WLM_API_KEY`, `WLM_EXTERNAL_API_KEY` |
| Preston | Externí systém (legacy?) | `PRESTON_API_KEY`, `PRESTON_API_URL`, `PRESTON_OUTBOUND_API_KEY` |
| DubajReality | Legacy lead source | `DUBAJREALITY_API_KEY`, `DUBAJREALITY_API_URL` |

### 7.5 ENV proměnné (názvy pouze)
Frontend (`.env`, prefix `VITE_`):
- `VITE_SUPABASE_URL` — URL backendu
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon klíč
- `VITE_SUPABASE_PROJECT_ID` — project ref

Backend (Deno edge functions, automaticky injektované):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Backend (custom secrets — nutno mít nakonfigurované):
- `LOVABLE_API_KEY`
- `RESEND_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
- `WLM_API_KEY`, `WLM_EXTERNAL_API_KEY`
- `PRESTON_API_KEY`, `PRESTON_API_URL`, `PRESTON_OUTBOUND_API_KEY`
- `DUBAJREALITY_API_KEY`, `DUBAJREALITY_API_URL`

---

## 8. NÁSTROJE / ADMIN PANEL

Vstup: `/admin` (UnifiedDashboard, role admin/obchodnik/senior_obchodnik/tipar/influencer_coordinator).

| Nástroj | Komponenta | Role | Co umí |
|---|---|---|---|
| Statistiky | StatsDashboard | admin/senior | Přehled KPIs, charty |
| All Leads | AllLeadsSection | admin/senior | Tabulka všech leadů, filtrace |
| My Leads | MyLeadsSection | obchodnik | Pouze přiřazené leady |
| Lead Detail | LeadDetail (route `/lead/:id`) | admin/team | Edit, notes, audit log, consultation booking, questionnaire |
| Properties | PropertiesManager | admin | CRUD nemovitostí |
| Property Images | PropertyImagesManager + Sortable | admin | Upload, sort, delete fotek |
| Property Importer / XML | PropertyImporter, XMLPropertyImporter | admin | Import z externího zdroje |
| Areas | AreasManager | admin | CRUD oblastí |
| Developers | DevelopersManager | admin | CRUD developerů |
| Unit Types / Prices | UnitTypesManager, UnitPricesManager | admin | Cenotvorba |
| Brochure Requests | BrochureRequestsManager | admin | Správa žádostí o katalog |
| Events | EventsManager | admin | Eventy + sloty |
| Consultation Slots | ConsultationSlotsManager | admin/obchodnik | Časové sloty obchodníků |
| Email Templates | EmailTemplatesManager | admin | CRUD email šablon |
| Chatbot Settings / History / Conversations | 3 manažery | admin | Nastavení system promptu, historie, konverzace |
| Users / Registration / Roles | UsersManager, UserRegistrationManager, UserRolesManager | admin | Správa uživatelů a rolí |
| WLM Sync | WLMSyncManager | admin | Sync s externím CRM |
| Affiliate Analytics | AffiliateAnalytics | admin | Statistiky affiliate kliků |
| Contacts Assignment | ContactsAssignmentManager | admin/senior | Přiřazování leadů |
| Rental Properties / Reservations / Reviews / Payouts / Stats | 5 manažerů | admin | Správa villa rentals |
| Rental Amenities | RentalAmenitiesManager | admin | Číselník vybavení |
| Superhost | SuperhostManager | admin | Správa superhost statusu |
| Notifications | NotificationDropdown | všichni team | Realtime notifikace (chatbot leads pro admina) |

### 8.1 Manager Dashboard
Route `/manager`, role admin / moderator. Komponenta `ManagerDashboard`. **INFO CHYBÍ: konkrétní obsah** — třeba otevřít komponentu.

### 8.2 Host Dashboard
Route `/host`, **bez ProtectedRoute** v `App.tsx:159` (potenciální bug). Komponenty z `dashboard/`: HostAvailabilitySection, MyRentalsSection, MyRentalReservationsSection, MyPayoutsSection, SuperhostStatusSection, FinancesSection, OfflineReservationSection.

### 8.3 Guest Dashboard
Route `/guest`, vyžaduje auth. MyGuestStaysSection, MyWishlistSection, MyProfileSection.

---

## 9. FUNGOVÁNÍ SYSTÉMU — END-TO-END

### 9.1 Journey návštěvníka (investor)
1. Landing `/` → vidí hero, value prop, CTA.
2. Procházení `/villas`, `/oblasti`, `/map`.
3. Detail nemovitosti `/nemovitost/:slug`.
4. Otevře BrochureRequestDialog → vyplní jméno/email/telefon → POST přes edge funkci `submit-catalog-request` → uloží `brochure_requests` + odešle Resend email.
5. Volitelně: `InvestorChatbot` (FAB) → konverzace s AI (edge `investor-chatbot`, model Gemini 2.5 Flash) → po dokončení JSON `INVESTOR_DATA` → edge `finalize-chatbot-profile` → vytvoří `lead` + `investor_questionnaire`.
6. Edge `send-lead-to-wlm` synchronizuje lead do externího CRM.
7. Admin dostane realtime notifikaci (`useChatbotNotifications`).
8. Admin přiřadí leadu obchodníka (`AssignObchodnikDialog`).
9. Obchodník naplánuje konzultaci (`ScheduleConsultationDialog`) → `consultation_bookings` + `consultation_slots`.
10. Po dealu vznikne `deals` záznam, generují se `lead_commission_splits` a `commission_payouts`.

### 9.2 Journey hosta (rentals)
1. `/become-host` → BecomeHostDialog.
2. Po registraci `/host` → vytvoří rental property (RentalPropertyFormDialog).
3. Spravuje média (RentalMediaManager), pricing (RentalPricingManager + SmartPricingCalendar), dostupnost (RentalAvailabilityManager), pokoje (RentalRoomsManager), vybavení (RentalAmenitiesAndRulesManager), special offers.
4. Obdrží zprávy (RentalMessageThread).
5. Rezervace přes RentalBookingDialog → `rental_reservations`.
6. Po hostování: review (RentalReviewForm).

### 9.3 Core loop
Investor: opakovaná návštěva katalogu villa projektů, ukládání do `favorites`, kontakt přes consultation booking.  
Host: správa rezervací a cen.  
Obchodník: práce s leady, plánování konzultací, uzavírání dealů.

### 9.4 Sekundární flows
- Password reset přes `/auth` mode=reset → email s magic linkem.
- GDPR / delete account: **INFO CHYBÍ — explicitní flow neexistuje**. PrivacyPolicyDialog komponenta existuje, ale right-to-erasure není implementovaný.
- Export dat: **INFO CHYBÍ** — pravděpodobně přes admin panel, ale konkrétní endpoint neidentifikován.

### 9.5 Edge cases
- ErrorBoundary chytá React chyby.
- Sonner toast pro síťové chyby.
- ProtectedRoute redirektuje na `/auth?next=...`.
- AuthContext stav `adminLoading` brání předčasným rolím.
- **NEošetřeno:** offline mode (žádný service worker), SSR (čistě CSR).

### 9.6 SEO
- Komponenta `SEO.tsx` (manage meta tagů per stránka).
- `public/sitemap.xml`, `public/robots.txt` přítomné.
- OG image renderer jako separate edge function (`og-renderer`) na **jiném** Supabase projektu (`bulknhjwswhnxhnosbnv` v `vercel.json` rewrite). **POZN.: to je odkaz na cizí Supabase project**, není to tento `bbgmibcvlmrmblbmwrjv` — pravděpodobně sdílený OG renderer servis.
- Vercel security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy).

---

## 10. KOMPLETNÍ ANALÝZA

### 10.1 ✅ Co funguje solidně
- Auth flow (login/signup/reset/update-password) — kompletní 4 módy v `Auth.tsx`.
- RLS politiky na tabulkách — striktně blokují anonymní přístup, role-based čtení/zápis.
- AI Chatbot pro lead generation (`investor-chatbot` + `finalize-chatbot-profile` + `save-chatbot-conversation`).
- Multi-language (cs/en/es) i18n setup.
- Admin panel s 40 sekcemi pro správu.
- Komplexní lead lifecycle (lead → questionnaire → consultation → deal → commission).
- Villa rentals modul (booking, pricing, smart pricing kalendář, reviews, superhost).
- Affiliate / referral systém s multi-tier provizemi.

### 10.2 ⚠️ Rozpracované / hacked together
- **Rebrand Dubai → Philippines → Costa Rica je nedokončený:**
  - `src/pages/Auth.tsx` stále hardcoded "go2dubai.online" a "Your gateway to Dubai" (řádky ~280, 295).
  - Asset `src/assets/produbai-logo-white.svg` — staré logo.
  - Routes `/why-dubai`, `/why-philippines`, `/why-costa-rica` všechny mapují na **stejnou** komponentu `WhyDubai`.
  - System prompt chatbotu (`investor-chatbot/index.ts`) je celý v češtině o Dubaji ("Jsi asistent go2dubai.online. Pomáháš uživatelům … investiční profil a doporučit vhodné projekty v Dubaji").
- **Komponenta `WhyDubai`** se používá pro 3 různé destinace — není parametrizovaná.
- **Memory `mem://index.md`** říká "OsaBooking.com Costa Rica" ale UI ukazuje DreamRiviera Filipíny — interní rozpor.
- **HostDashboard route `/host` BEZ ProtectedRoute** (`src/App.tsx:159`).
- **Duplicita audit logů:** `audit_log` + `lead_audit_log` (dvě tabulky pro podobný účel).
- **Duplicitní RLS politika** na `audit_log`: "Senior obchodnici can view team audit logs" existuje 2× (jednou bez diakritiky, jednou s).
- **DubajReality edge function** (`pull-leads-from-dubajreality`) je pravděpodobně mrtvý kód po pivotu.

### 10.3 ❌ Known bugs
- `/host` bez auth ochrany — neautentizovaný uživatel může načíst stránku.
- Auth.tsx zobrazuje "go2dubai.online" branding — nekonzistence s rebrandem.
- Chatbot system prompt není přebrandován — investor uvidí "Dubaj" v AI odpovědích.
- Tři routes (`/why-dubai`, `/why-philippines`, `/why-costa-rica`) renderují identický obsah — SEO duplicate content.
- Žádné FK constraints v DB — možnost orphan records.
- Komentáře v `App.tsx` ukazují velké bloky zakomentovaných importů — dead code.

### 10.4 🔧 Technický dluh
- Migrace pojmenované UUIDy → bez human-readable popisu.
- `WhyDubai.tsx` 442 řádků, `Index.tsx` 586 řádků — kandidáti na refactor.
- Žádné foreign keys → integritu hlídá pouze RLS / aplikace.
- Smíšené brand assety (produbai-logo-white.svg vs DreamRiviera text).
- Dvě sady audit logů (`audit_log`, `lead_audit_log`).
- Dva mapping toolkity současně (Leaflet + Google Maps).
- 41 edge funkcí — kandidáti na konsolidaci (např. `track-*` mohly být jedna).
- Žádné automated testy v repu.

### 10.5 📉 Performance observace
- Bundle: `framer-motion`, `recharts`, `leaflet`, `@react-google-maps/api`, `embla-carousel`, `@dnd-kit` — všechny současně → velký initial bundle. Bez code splitting (žádný `lazy()` v `App.tsx`).
- `App.tsx` importuje **všechny** stránky synchronně.
- Limit 1000 řádků na Supabase query — admin tabulky nad 1000 záznamů potenciálně nezobrazí vše.
- N+1 riziko: RLS politiky používající `IN (SELECT … FROM leads WHERE …)` — Postgres planner obvykle zvládne, ale na velkých datech ověřit.
- ScrollArea + Sortable obrázky — při 100+ obrázcích lag.

---

## 11. PLÁN DALŠÍHO VÝVOJE

### 11.1 P1 — Dokončit rebrand (z chatu)
| # | Úkol | Odhad |
|---|---|---|
| 1 | Aktualizovat `src/pages/Auth.tsx` brand z "go2dubai.online" na "DreamRiviera" / "OsaBooking" (rozhodnutí majitele) | 1 h |
| 2 | Vyměnit `src/assets/produbai-logo-white.svg` za nové logo | 0.5 h |
| 3 | Přepsat system prompt v `supabase/functions/investor-chatbot/index.ts` (Dubaj → Filipíny / Costa Rica) | 1 h |
| 4 | Rozdělit komponentu `WhyDubai` na `WhyPhilippines` a `WhyCostaRica` (nebo parametrizovat) | 3 h |
| 5 | Odstranit `/why-dubai` route nebo přidat 301 redirect | 0.5 h |
| 6 | SEO review — meta tagy, OG images per destinace | 2 h |

### 11.2 P1 — Bezpečnost
| # | Úkol | Odhad |
|---|---|---|
| 7 | Přidat `ProtectedRoute` na `/host` | 0.25 h |
| 8 | Přidat foreign key constraints na všechny `*_id` sloupce | 4 h |
| 9 | Odstranit duplicitní RLS politiku na `audit_log` | 0.25 h |
| 10 | Implementovat GDPR delete-account flow | 6 h |

### 11.3 P2 — Performance
| # | Úkol | Odhad |
|---|---|---|
| 11 | Lazy loading routes v `App.tsx` (`React.lazy` + `Suspense`) | 2 h |
| 12 | Pagination v admin tabulkách s >1000 záznamů | 4 h |
| 13 | Code splitting podle role (admin bundle separátně) | 4 h |

### 11.4 P3 — Cleanup
| # | Úkol | Odhad |
|---|---|---|
| 14 | Smazat `pull-leads-from-dubajreality` (legacy) | 0.5 h |
| 15 | Konsolidovat `audit_log` + `lead_audit_log` | 4 h |
| 16 | Sjednotit mapy (Leaflet **nebo** Google Maps) | 6 h |
| 17 | Pojmenovat migrace popisně | 2 h |

### 11.5 P3 — Features (z chatu / memory backlog)
- **INFO CHYBÍ: explicitní feature backlog** — v dostupném chatu nebyly diskutovány budoucí features kromě dokončení rebrandu.
- Implicitně: Costa Rica branch (memory ji zmiňuje, kódově neexistuje samostatně).

---

## 12. OPEN QUESTIONS NA MAJITELE

1. **Brand identity:** Finální název projektu je **DreamRiviera.com**, **OsaBooking.com**, nebo oba paralelně? Chat říká DreamRiviera, memory říká OsaBooking.
2. **Cílové trhy:** Filipíny, Costa Rica, oba? Kód má aliasy pro Dubai/Philippines/Costa Rica, ale obsah je jen Filipíny.
3. **Pricing model:** Jaká je provize obchodníka, tipara, koordinátora? `commission_rate` default 0.01 (1 %) — je to správně?
4. **Free vs paid tier:** Existuje placený plán pro hosty (rentals)? Není v kódu vidět.
5. **WLM systém:** Co je WLM, kam se synchronizují leady? Ponechat sync zapnutý po rebrandu?
6. **Preston API:** K čemu slouží? Lze odstranit?
7. **DubajReality:** Lze smazat edge funkci a tabulkové vazby?
8. **Email provider domain:** Resend SPF/DKIM nakonfigurovaný pro `dreamriviera.com` doménu? **INFO CHYBÍ.**
9. **OAuth:** Má se přidat Google Sign-In (Lovable doporučuje)?
10. **GDPR:** Kdo je data controller? Kde je privacy policy hostovaná? Right-to-erasure flow.
11. **Backups / DR:** Frekvence backupů Supabase DB? Recovery point objective?
12. **Custom domain:** Kdy se nastavuje produkční doména `dreamriviera.com`?
13. **Legal:** Realitní legislativa na Filipínách / Costa Rica — má app nějaké compliance (license disclaimer, AML)?
14. **Currency:** Memory říká "USD default" — DB má `commission_payouts.currency` default `AED`. Sjednotit?
15. **Costa Rica obsah:** Existuje plán doplnit destinaci, nebo `/why-costa-rica` zrušit?

---

## 13. PŘÍLOHY

### 13.1 Seznam souborů v repu (jen src + klíčové)

#### Pages (33)
- `src/pages/AdminDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/AreaDetail.tsx` — viz routovací tabulka 3.1
- `src/pages/Areas.tsx` — viz routovací tabulka 3.1
- `src/pages/Auth.tsx` — viz routovací tabulka 3.1
- `src/pages/BecomeHost.tsx` — viz routovací tabulka 3.1
- `src/pages/Blog.tsx` — viz routovací tabulka 3.1
- `src/pages/DirectDownload.tsx` — viz routovací tabulka 3.1
- `src/pages/DownloadCatalog.tsx` — viz routovací tabulka 3.1
- `src/pages/DownloadFile.tsx` — viz routovací tabulka 3.1
- `src/pages/EmbedInvestorForm.tsx` — viz routovací tabulka 3.1
- `src/pages/GuestDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/HostDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/Index.tsx` — viz routovací tabulka 3.1
- `src/pages/Invest.tsx` — viz routovací tabulka 3.1
- `src/pages/InvestorProfile.tsx` — viz routovací tabulka 3.1
- `src/pages/IslandNest.tsx` — viz routovací tabulka 3.1
- `src/pages/LeadDetail.tsx` — viz routovací tabulka 3.1
- `src/pages/ManagerDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/MyDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/NotFound.tsx` — viz routovací tabulka 3.1
- `src/pages/ObchodnikProfile.tsx` — viz routovací tabulka 3.1
- `src/pages/Projects.tsx` — viz routovací tabulka 3.1
- `src/pages/PropertiesMap.tsx` — viz routovací tabulka 3.1
- `src/pages/PropertyDetail.tsx` — viz routovací tabulka 3.1
- `src/pages/RecommendedProjects.tsx` — viz routovací tabulka 3.1
- `src/pages/RentalDetail.tsx` — viz routovací tabulka 3.1
- `src/pages/RentalHostProfile.tsx` — viz routovací tabulka 3.1
- `src/pages/Rentals.tsx` — viz routovací tabulka 3.1
- `src/pages/TiparDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/TiparVerification.tsx` — viz routovací tabulka 3.1
- `src/pages/UnifiedDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/UserDashboard.tsx` — viz routovací tabulka 3.1
- `src/pages/WhyDubai.tsx` — viz routovací tabulka 3.1

#### Edge Functions (41)
- `supabase/functions/admin-bulk-import/index.ts`
- `supabase/functions/admin-insert-property/index.ts`
- `supabase/functions/admin-manage-user/index.ts`
- `supabase/functions/admin-register-user/index.ts`
- `supabase/functions/book-consultation/index.ts`
- `supabase/functions/bootstrap-admin/index.ts`
- `supabase/functions/bulk-sync-leads-to-wlm/index.ts`
- `supabase/functions/create-or-update-lead/index.ts`
- `supabase/functions/custom-email-hook/index.ts`
- `supabase/functions/embed-investor-form/index.ts`
- `supabase/functions/external-lead-sync/index.ts`
- `supabase/functions/extract-property-data/index.ts`
- `supabase/functions/finalize-chatbot-profile/index.ts`
- `supabase/functions/generate-og-image/index.ts`
- `supabase/functions/generate-property-description/index.ts`
- `supabase/functions/get-ai-recommendations/index.ts`
- `supabase/functions/get-brochure-request/index.ts`
- `supabase/functions/get-chatbot-conversation/index.ts`
- `supabase/functions/get-google-maps-key/index.ts`
- `supabase/functions/get-public-rental-reservations/index.ts`
- `supabase/functions/get-wlm-api-key/index.ts`
- `supabase/functions/investor-chatbot/index.ts`
- `supabase/functions/landing-pages-api/index.ts`
- `supabase/functions/moviari-lead-capture/index.ts`
- `supabase/functions/og-renderer/index.ts`
- `supabase/functions/pull-leads-from-dubajreality/index.ts`
- `supabase/functions/save-chatbot-conversation/index.ts`
- `supabase/functions/save-investor-profile/index.ts`
- `supabase/functions/save-property/index.ts`
- `supabase/functions/send-brochure-notification/index.ts`
- `supabase/functions/send-contact-message/index.ts`
- `supabase/functions/send-event-registration-emails/index.ts`
- `supabase/functions/send-lead-to-wlm/index.ts`
- `supabase/functions/send-milestone-notification/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/submit-catalog-request/index.ts`
- `supabase/functions/subscribe-newsletter/index.ts`
- `supabase/functions/sync-to-preston/index.ts`
- `supabase/functions/track-affiliate-click/index.ts`
- `supabase/functions/track-download/index.ts`
- `supabase/functions/track-influencer-lead/index.ts`

#### Top-level konfig
- `package.json` — npm dependencies & scripts
- `vite.config.ts` — Vite config s `@` alias na `./src`, port 8080
- `tailwind.config.ts` — Tailwind + design tokeny
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` — TypeScript config
- `eslint.config.js` — ESLint flat config
- `postcss.config.js` — PostCSS (Tailwind + autoprefixer)
- `components.json` — shadcn/ui config
- `vercel.json` — Vercel deployment (rewrites, headers)
- `middleware.ts` — Vercel edge middleware (obsah neověřen)
- `index.html` — HTML entry
- `design-system.md` — design system docs
- `README.md` — Lovable autogenerated readme
- `.env` — frontend env (VITE_*)
- `supabase/config.toml` — Supabase config (project_id)

### 13.2 NPM dependencies (65 runtime + 17 dev)

#### Runtime dependencies
- `@dnd-kit/core` `^6.3.1`
- `@dnd-kit/sortable` `^10.0.0`
- `@dnd-kit/utilities` `^3.2.2`
- `@googlemaps/markerclusterer` `^2.6.2`
- `@hookform/resolvers` `^3.10.0`
- `@radix-ui/react-accordion` `^1.2.11`
- `@radix-ui/react-alert-dialog` `^1.1.14`
- `@radix-ui/react-aspect-ratio` `^1.1.7`
- `@radix-ui/react-avatar` `^1.1.10`
- `@radix-ui/react-checkbox` `^1.3.2`
- `@radix-ui/react-collapsible` `^1.1.11`
- `@radix-ui/react-context-menu` `^2.2.15`
- `@radix-ui/react-dialog` `^1.1.14`
- `@radix-ui/react-dropdown-menu` `^2.1.15`
- `@radix-ui/react-hover-card` `^1.1.14`
- `@radix-ui/react-label` `^2.1.7`
- `@radix-ui/react-menubar` `^1.1.15`
- `@radix-ui/react-navigation-menu` `^1.2.13`
- `@radix-ui/react-popover` `^1.1.14`
- `@radix-ui/react-progress` `^1.1.7`
- `@radix-ui/react-radio-group` `^1.3.7`
- `@radix-ui/react-scroll-area` `^1.2.9`
- `@radix-ui/react-select` `^2.2.5`
- `@radix-ui/react-separator` `^1.1.7`
- `@radix-ui/react-slider` `^1.3.5`
- `@radix-ui/react-slot` `^1.2.3`
- `@radix-ui/react-switch` `^1.2.5`
- `@radix-ui/react-tabs` `^1.1.12`
- `@radix-ui/react-toast` `^1.2.14`
- `@radix-ui/react-toggle` `^1.1.9`
- `@radix-ui/react-toggle-group` `^1.1.10`
- `@radix-ui/react-tooltip` `^1.2.7`
- `@react-google-maps/api` `^2.20.8`
- `@supabase/supabase-js` `^2.86.0`
- `@tanstack/react-query` `^5.83.0`
- `@types/dompurify` `^3.0.5`
- `@types/leaflet` `^1.9.21`
- `canvas-confetti` `^1.9.4`
- `class-variance-authority` `^0.7.1`
- `clsx` `^2.1.1`
- `cmdk` `^1.1.1`
- `date-fns` `^4.1.0`
- `dompurify` `^3.3.1`
- `embla-carousel-react` `^8.6.0`
- `framer-motion` `^12.23.25`
- `i18next` `^26.0.6`
- `i18next-browser-languagedetector` `^8.2.1`
- `input-otp` `^1.4.2`
- `leaflet` `^1.9.4`
- `lucide-react` `^0.462.0`
- `next-themes` `^0.3.0`
- `react` `^18.3.1`
- `react-day-picker` `^8.10.1`
- `react-dom` `^18.3.1`
- `react-hook-form` `^7.61.1`
- `react-i18next` `^17.0.4`
- `react-leaflet` `^5.0.0`
- `react-resizable-panels` `^2.1.9`
- `react-router-dom` `^6.30.1`
- `recharts` `^2.15.4`
- `sonner` `^1.7.4`
- `tailwind-merge` `^2.6.0`
- `tailwindcss-animate` `^1.0.7`
- `vaul` `^0.9.9`
- `zod` `^3.25.76`

#### Dev dependencies
- `@eslint/js` `^9.32.0`
- `@tailwindcss/typography` `^0.5.16`
- `@types/node` `^22.16.5`
- `@types/react` `^18.3.23`
- `@types/react-dom` `^18.3.7`
- `@vitejs/plugin-react-swc` `^3.11.0`
- `autoprefixer` `^10.4.21`
- `eslint` `^9.32.0`
- `eslint-plugin-react-hooks` `^5.2.0`
- `eslint-plugin-react-refresh` `^0.4.20`
- `globals` `^15.15.0`
- `lovable-tagger` `^1.1.11`
- `postcss` `^8.5.6`
- `tailwindcss` `^3.4.17`
- `typescript` `^5.8.3`
- `typescript-eslint` `^8.38.0`
- `vite` `^5.4.19`

### 13.3 ENV proměnné (kompletní seznam)

#### Frontend (build-time, prefix VITE_)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

#### Backend edge functions (auto-injected)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Backend secrets (custom)
- `LOVABLE_API_KEY`
- `RESEND_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `WLM_API_KEY`
- `WLM_EXTERNAL_API_KEY`
- `PRESTON_API_KEY`
- `PRESTON_API_URL`
- `PRESTON_OUTBOUND_API_KEY`
- `DUBAJREALITY_API_KEY`
- `DUBAJREALITY_API_URL`

---

## ZÁVĚR

Tento dokument je generován automaticky AI agentem na základě dostupné chat historie (formou summary) a aktuálního stavu repozitáře. **Není substitutem ručního review** — některé informace jsou označené `INFO CHYBÍ` a vyžadují doplnění od majitele projektu.

**Hlavní zjištění:** Projekt prošel pivotem z Dubai → Philippines → (možná) Costa Rica. Kód obsahuje pozůstatky všech tří fází a vyžaduje cílený cleanup (viz sekce 11.1).

*Generated by Lovable AI at 2026-05-01T20:14:23Z.*
