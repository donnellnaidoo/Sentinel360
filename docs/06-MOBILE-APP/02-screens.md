# Screens Reference

This document describes every screen in the mobile app: its purpose, key components, data flow, and state handling.

---

## 1. Onboarding Screen

**File**: `app/onboarding.tsx` → `components/OnBoarding.tsx`

### Purpose
Introduces first-time users to the app's value proposition through a 3-slide carousel. On completion, directs users to sign-up or sign-in.

### Route
`/onboarding` — displayed when `authClient.useSession().user` is `null` (unauthenticated).

### Components

| Component                     | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `FlatList` (horizontal)       | Paginated carousel with `pagingEnabled` for swipe gestures |
| Hero header area              | Dark teal background (`#0b1f22`), app title, icon, alert card preview |
| Bottom sheet                  | White panel with rounded top corners containing slide content |
| Pagination dots               | Animated indicators — active dot is wider (22px vs 6px)    |
| Skip button                   | Top-right, navigates to `/sign-in`                         |
| Next / Create Account button  | Contextual: "Next" for slides 0–1, "Create Account" on slide 2 |
| Tag badge                     | Yellow pill (`#f6c343`) with the slide's tagline           |

### Data Flow

```
FlatList scroll → onMomentumScrollEnd → setCurrentIndex(index)
  → Pagination re-renders → Button text changes at last slide
```

No external API calls. All content is static `onboardingData` array.

### Slide Content

| Slide | Tag                  | Title                             | Description                                                    |
| ----- | -------------------- | --------------------------------- | -------------------------------------------------------------- |
| 1     | COMMUNITY FIRST      | Stay informed about your community | Real-time alerts and verified reports from neighbours          |
| 2     | SEE IT. SHARE IT.    | Submit sightings in seconds       | Send verified sightings to law enforcement for review          |
| 3     | SAFER TOGETHER       | Verified updates, trusted outcomes | Community reports reviewed before influencing operational decisions |

### States

| State      | Handling                                                      |
| ---------- | ------------------------------------------------------------- |
| **Loading** | Not applicable — static content renders immediately           |
| **Empty**   | Not applicable — carousel always has 3 items                  |
| **Error**   | Not applicable                                                |
| **Success** | All slides render. "Get Started" navigates to `/sign-up`      |

### Edge Cases
- User dismisses mid-carousel: Skip button navigates to sign-in immediately.
- Hardware back press: Behaviour depends on stack setup (no explicit back handler configured).
- Orientation change: Uses `Dimensions.get("window")` for responsive width/height.

---

## 2. Sign-in Screen

**File**: `app/sign-in.tsx` → `components/AuthScreen` (mode: `"sign-in"`)

### Purpose
Authenticates returning users via email/password with optional biometric (Touch ID / Face ID) through better-auth.

### Route
`/sign-in`

### Components

| Component               | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| SegmentedTab            | Toggle between Login / Register mode (shared with sign-up)   |
| Brand icon + heading    | App icon with "Login" title and "Welcome back" subtitle      |
| Email FieldRow          | Text input with `mail-outline` icon, email keyboard type     |
| Password FieldRow       | Secure text input with `lock-closed-outline` icon            |
| Remember me checkbox    | Toggle state managed locally (default: `true`)                |
| Forgot password link    | Currently shows "Coming soon" toast placeholder              |
| Submit button           | Triggers form validation → `authClient.signIn.email()`       |
| Social login buttons    | Facebook / Google buttons (both show "Coming soon" toasts)   |
| Toggle auth mode link   | "Don't have an account? Register" → navigates to `/sign-up`  |

### Data Flow

```
User submits form → Zod validation (signInSchema)
  → on valid: authClient.signIn.email({ email, password })
    → onSuccess: formApi.reset(), queryClient.refetchQueries()
    → onError: toast.show({ variant: "danger", label: error.message })
```

### Schema Validation

```typescript
const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});
```

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Submit button shows `Spinner` component, `isDisabled: true`  |
| **Empty**    | Form fields are blank on initial render                      |
| **Error**    | Field-level errors shown via `FieldError` component; API errors shown in a toast with `variant: "danger"` |
| **Success**  | `toast.show({ variant: "success" })`, form reset, query cache refetch, redirect to `/(drawer)/(tabs)` |

### Field Navigation
`Email (returnKeyType="next")` → auto-focuses password field → `Password (returnKeyType="go")` → submits form.

### Edge Cases
- Email already registered: better-auth returns an error shown via toast.
- Network failure: better-auth error callback fires with connection error message.
- Biometric prompt: Available via Expo SecureStore; triggered when session token is available for auto-fill.
- Rapid double-submit: Avoided via `isSubmitting` disabled state on button.

---

## 3. Sign-up Screen

**File**: `app/sign-up.tsx` → `components/AuthScreen` (mode: `"sign-up"`)

### Purpose
Registers new community member accounts via email/password with better-auth.

### Route
`/sign-up`

### Components

Same layout as Sign-in, with differences:

| Component          | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| Name FieldRow      | Additional text input with `person-outline` icon             |
| SegmentedTab       | Pre-selected to Register                                     |
| Heading            | "Register" title with "Create your account to continue"      |
| Submit button      | Triggers `authClient.signUp.email()`                         |
| Toggle auth link   | "Already have an account? Login" → `/sign-in`                |

### Schema Validation

```typescript
const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});
```

### Data Flow

```
User submits form → Zod validation
  → on valid: authClient.signUp.email({ name, email, password })
    → onSuccess: toast({ variant: "success" }), redirect to tabs
    → onError: toast({ variant: "danger", label: error })
```

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Button shows Spinner, fields disabled during submission       |
| **Empty**    | All three fields blank                                        |
| **Error**    | Zod field errors → FieldError; API errors → danger toast     |
| **Success**  | Toast confirmation, form reset, immediate sign-in / redirect |

### Field Navigation
`Name (returnKeyType="next")` → auto-focuses email → `Email (returnKeyType="next")` → auto-focuses password → `Password (returnKeyType="go")` → submits.

### Edge Cases
- Duplicate email: better-auth returns `User already exists` error.
- Weak password: Zod's `.min(8)` provides client-side validation; server enforces additional rules.
- Email verification: better-auth sends verification email on registration (configurable on server).

---

## 4. Home Screen

**File**: `app/(drawer)/(tabs)/index.tsx` → `components/homeScreen.tsx`

### Purpose
The primary dashboard after authentication. Displays a region overview, nearby activity map, community updates feed, recent alerts, and an SOS/quick-action floating button.

### Route
`/(drawer)/(tabs)` (index)

### Components

| Component              | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| Header bar             | Menu hamburger icon, "Community Safety" title, user avatar   |
| Region Card            | Dark card (`CTA_BG`) showing current region name and safety status pill |
| MapView                | `react-native-maps` with 2 markers, scroll/zoom disabled (preview mode) |
| Nearby Activity link   | "Nearby Activity" row → navigates to full map view           |
| Community Updates      | Section title + 2 `CommunityItem` cards (CIVIC / EVENT tags) |
| Recent Alerts          | Section title + 2 `AlertItem` cards (Vehicle Theft / Power Outage) |
| SOS FAB                | Floating action button (bottom-right) for reporting incidents |
| Pill component         | Reusable badge e.g. "Status: Safe"                           |

### Data Flow

```
Screen renders → Hardcoded demo data (no API calls yet)
  → Region: Oakwood District
  → Map: San Francisco coordinates (37.78825, -122.4324)
  → Community updates: static list
  → Alerts: static list
```

**Future state**: The region card, map markers, community updates, and alerts will be populated from tRPC queries with real-time subscriptions.

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Skeleton loaders for region card, map placeholder, feed cards |
| **Empty**    | "No recent activity in your area" message with illustration   |
| **Error**    | Inline banner: "Could not load community data. Pull to retry." |
| **Success**  | Full dashboard with region, map, feed items, and alerts       |

### Current Demo Data
- **Region**: Oakwood District, Status: Safe
- **Map Markers**: 2 markers at hardcoded coordinates
- **Community Items**: "New Street Lighting Phase 1" (CIVIC tag, 2h ago), "Neighborhood Watch Meet" (EVENT tag, 5h ago)
- **Alerts**: "Vehicle Theft Reported" (Urgent, red accent), "Power Outage Scheduled" (Maintenance, yellow accent)

### Edge Cases
- User has no location permissions: Map shows default region, location prompt on FAB press.
- No community updates: Section is hidden or shows "Be the first to share an update".
- Push notification deep-link: App opens to the relevant alert detail or home screen.

---

## 5. Alerts Screen

**File**: `app/(drawer)/(tabs)/alerts.tsx` → `components/alertsScreen.tsx`

### Purpose
Displays a filterable, searchable, severity-coded feed of real-time safety alerts. Supports pull-to-refresh, tap-to-expand, and navigation to detail views.

### Route
`/(drawer)/(tabs)/alerts`

### Components

| Component            | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| Header bar           | Menu icon, "COMMUNITY SAFETY" title, user avatar             |
| Active Alerts header | Title + "LIVE: 12 NEARBY" pill (hardcoded count)            |
| Search bar           | Text input with `search-outline` icon, placeholder: "Filter by area or type..." |
| AlertCard            | Severity-coded card with thin accent bar, icon, badge tag, title, body, location, action CTA |
| MonitoringMapCard    | Dark overlay card with background image, "MONITORING ACTIVE PERIMETER" status, settings button |

### Severity System

| Level     | Accent Color | Badge Background | Badge Text Color | Icon           |
| --------- | ------------ | ---------------- | ---------------- | -------------- |
| CRITICAL  | `#991b1b`    | `#fee2e2`        | `#991b1b`        | `snow`         |
| SEVERE    | `#eab308`    | `#fef3c7`        | `#92400e`        | `warning`      |
| ADVISORY  | `#cbd5e1`    | `#e2e8f0`        | `#475569`        | `info-circle`  |

### Data Flow

```
Screen renders → Static demo data (no API calls in current implementation)
  → Alerts sorted by recency (2m ago, 15m ago, 42m ago)
  → Each AlertCard renders severity-accented UI

Future: tRPC query → useSuspenseQuery("alerts.getActive")
  → Pull-to-refresh triggers queryClient.invalidateQueries(["alerts"])
  → Search filters alerts client-side by area/type
```

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Skeleton cards (3 placeholder cards with shimmer)            |
| **Empty**    | Illustration + "No active alerts in your area. You're all clear!" |
| **Error**    | Error banner with retry button; previous cache preserved     |
| **Success**  | Cards listed chronologically with severity accents            |

### Current Demo Data
1. "Flash Flood Warning" — CRITICAL, West Valley District, 2m ago
2. "Power Grid Instability" — SEVERE, Downtown Core, 15m ago
3. "Traffic Congestion" — ADVISORY, East Intersection, 42m ago

### Detail View (Navigation)
`AlertCard action CTA` → Routes to an alert detail screen (to be implemented) `/alerts/[id]` showing:
- Full description
- Location on a larger map
- Timeline of updates
- Share / save actions

### Edge Cases
- No network: Alerts screen should show cached data from last successful fetch.
- All-alerts-dismissed: Show empty state with "View dismissed" action.
- Push notification tap: Deep-link to specific alert `/(drawer)/(tabs)/alerts/[id]`.

---

## 6. Wanted Feed Screen

**File**: `app/(drawer)/(tabs)/wanted.tsx` → `components/wantedScreen.tsx`

### Purpose
Public repository of wanted persons with outstanding warrants or active investigations. Community members can browse, search, filter, and submit tips. **No login required** for public access.

### Route
`/(drawer)/(tabs)/wanted`

### Components

| Component      | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Header bar     | Menu icon, "Community Safety" title, user avatar             |
| Tag badge      | "ACTIVE ALERTS" red badge                                    |
| Title + blurb  | "Wanted Persons" heading, informational description paragraph |
| Filters button | `options-outline` icon + "Filters" label                     |
| WantedCard     | Photo (260px height), status tag overlay, name, subtitle, meta rows (location, date), CTA buttons |
| SafetyTipCard  | Dark CTA card: "Stay Safe. Stay Vigilant." + "Submit Secure Tip" button |

### Status Tags

| Tag                  | Background | Foreground |
| -------------------- | ---------- | ---------- |
| WANTED               | `#fee2e2`  | `#991b1b`  |
| UNDER INVESTIGATION  | `#fef3c7`  | `#92400e`  |

### Data Flow

```
Screen renders → Static demo data
  → 3 WantedCards rendered with hardcoded image URIs
  → "Filters" button (no action yet — placeholder)

Future: tRPC query → useQuery("wanted.getFeed", { page, region, status })
  → Cards paginated, infinite scroll via FlatList
  → Filters modal → region picker, status checkboxes
  → Search by name via search bar
```

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Card skeleton placeholders (3–4 cards) with shimmer animation |
| **Empty**    | "No wanted persons in this area" with illustration           |
| **Error**    | Inline error banner with retry button                        |
| **Success**  | Card grid/list sorted by most recent first                    |

### Current Demo Data

| Name              | Tag                  | Description              | CTAs                              |
| ----------------- | -------------------- | ------------------------ | --------------------------------- |
| Marcus Hale       | WANTED               | Armed robbery suspect    | View Case File                    |
| Elena Rodriguez   | UNDER INVESTIGATION  | Cyber fraud syndicate    | Provide Anonymous Tip             |
| Daniel Cross      | UNDER INVESTIGATION  | Organized crime suspect  | Provide Anonymous Tip             |

### Edge Cases
- No image available: Fallback grey placeholder (`#cbd5e1`).
- Card status change: WANTED vs UNDER INVESTIGATION alters visual priority.
- Tapping "View Case File": Navigates to detail screen (see next section).

---

## 7. Wanted Person Detail Screen (Planned)

> This screen is identified in the navigation design but not yet implemented. The following describes the planned implementation.

### Purpose
Displays full profile of a wanted person: photo, identifying information, last seen location, case status, and clear CTA to submit a sighting.

### Route
`/wanted/[id]`

### Planned Components

| Component                 | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| Photo hero                | Full-width image with parallax scroll                        |
| Status badge              | Large status indicator (WANTED / ARRESTED / CLEARED)         |
| Identity section          | Name, alias, date of birth, height, distinguishing marks     |
| Last seen section         | Map pin with date/time, area description                     |
| Case details section      | Crime type, warrant number, investigating agency             |
| Submit Sighting CTA       | Floating button → navigates to report screen with person pre-filled |
| Share button              | Native share sheet with case summary                         |

### Data Flow (Planned)

```
tRPC query → "wanted.getById": { id }
  → Returns full person profile with all fields
  → "Submit Sighting" CTA knows person ID
  → Report screen receives person ID as param
```

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Hero skeleton + content placeholder cards                    |
| **Error**    | "Person not found" or "Could not load details"               |
| **Success**  | Full profile rendered with all sections                      |

---

## 8. Report Sighting Screen

**File**: `app/(drawer)/(tabs)/report.tsx` → `components/reportScreen.tsx`

### Purpose
Allows authenticated community members to submit a sighting of a wanted person. Captures photo/video evidence, auto-detects GPS location, and collects a written description with anonymity option.

### Route
`/(drawer)/(tabs)/report`

### Components

| Component                    | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| Header bar                   | Menu icon, "Community Safety" title, user avatar             |
| Title + blurb                | "Report Sighting" heading + confidentiality reassurance text |
| Upload evidence area         | Dashed-border pressable area with `camera-outline` icon, "Upload Evidence" label, "Tap to capture or select from gallery" |
| Detected Location card       | Auto-detected GPS location with address, accuracy indicator, map thumbnail |
| Sighting Description field   | Multi-line `TextInput` for detailed description              |
| Anonymity toggle             | (Planned) Switch to submit report anonymously                |
| Submit button                | (Planned) Triggers upload + tRPC mutation                    |

### Data Flow

```
User taps upload → Expo ImagePicker (camera or gallery)
  → Image selected → local preview shown
  → GPS location auto-detected via expo-location
  → User fills description
  → [Planned] Anonymity toggle → boolean
  → Submit → tRPC mutation → presigned URL flow:

  1. tRPC mutation: "sighting.createPresignedUrl" → returns { uploadUrl, fileKey }
  2. PUT image to S3 presigned URL
  3. tRPC mutation: "sighting.submit" → { fileKey, description, location, anonymous }
  4. Server returns reference number
  5. Toast: "Sighting submitted — Reference #S360-XXXXX"
```

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Upload area shows progress spinner; submit button spinning    |
| **Empty**    | No photo selected, description blank, location detected       |
| **Error**    | Upload failed → inline error: "Upload failed. Tap to retry."; submission failed → toast |
| **Success**  | Toast with reference number; reset form after 3-second delay  |

### Current Implementation

The screen renders the full UI shell with:
- Upload evidence area (pressable, no action yet)
- Detected Location card with hardcoded address "Oakwood Heights, Block C-12" and GPS accuracy "HIGH"
- Sighting Description multi-line TextInput (no character count limit yet)

### Edge Cases
- No camera permission: Show permission request rationale before opening picker.
- No location permission: Show manual address entry fallback.
- Large file upload: Compress image before upload (Expo `manipulateAsync`).
- Offline submission: Queue in AsyncStorage for later sync.
- Duplicate submission: Server-side deduplication by hash + GPS + timestamp.

---

## 9. Profile Screen

**File**: `app/(drawer)/(tabs)/profile.tsx`

### Purpose
Displays user information, provides access to settings, notification preferences, and sighting history. Currently a placeholder screen ready for full implementation.

### Route
`/(drawer)/(tabs)/profile`

### Current Implementation

```typescript
// Placeholder screen with basic layout:
<SafeAreaView>
  <View style={{ padding: 18 }}>
    <Text>Profile</Text>
    <Text>Placeholder screen.</Text>
  </View>
</SafeAreaView>
```

### Planned Components

| Component                 | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| User avatar + name        | Large avatar circle, display name, email, member since date   |
| Account section           | Email, phone, role badge (Community / Security Operator)      |
| My Sightings              | List of past submissions with status (Pending / Verified / Dismissed) |
| Notification Preferences  | Alert radius slider, notification type toggles (alerts, wanted updates, community) |
| Settings link             → Navigates to dedicated Settings screen |
| Theme toggle              | Light/dark mode switch (available in drawer header already)   |
| Sign out button           | Calls `authClient.signOut()` → redirect to onboarding         |

### States

| State        | Handling                                                     |
| ------------ | ------------------------------------------------------------ |
| **Loading**  | Skeleton avatar + info cards                                 |
| **Error**    | "Could not load profile" with retry                          |
| **Success**  | Full profile with all sections                               |

### Sighting History States

| Sighting Status    | Visual              | Action                |
| ------------------ | ------------------- | --------------------- |
| Pending Review     | Yellow badge        | "Under review"        |
| Verified           | Green badge + check | "Acknowledged by LE"  |
| Dismissed          | Grey badge          | Reason displayed      |

---

## 10. Settings Screen (Planned)

### Purpose
Central configuration hub for the app. Currently accessed from the Profile screen.

### Route
`/settings`

### Planned Components

| Component              | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| Alert Radius           | Slider (1 km – 50 km) with visual map radius indicator       |
| Notification Types     | Toggle list: Safety alerts, Wanted updates, Community posts, System announcements |
| Quiet Hours            | Time range picker for do-not-disturb period                  |
| Privacy                | Anonymity default toggle, data sharing preferences           |
| Biometric Auth         | Toggle to enable Face ID / Touch ID for app unlock           |
| Account                | Email display, password change, account deletion             |
| About                  | App version, licenses, terms of service, privacy policy links|

### Data Flow

```
Settings load → tRPC query "user.getPreferences"
  → User edits → tRPC mutation "user.updatePreferences" → optimistic update
  → Changes reflected immediately via TanStack Query cache
```
