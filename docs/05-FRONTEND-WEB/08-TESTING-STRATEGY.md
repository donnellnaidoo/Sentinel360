# Sentinel360 — Frontend Testing Strategy

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Testing Pyramid](#2-testing-pyramid)
3. [Component Testing (Vitest + React Testing Library)](#3-component-testing)
4. [Integration Testing](#4-integration-testing)
5. [E2E Testing (Playwright)](#5-e2e-testing)
6. [Visual Regression Testing (Storybook + Chromatic)](#6-visual-regression-testing)
7. [Accessibility Testing](#7-accessibility-testing)
8. [Test Configuration Files](#8-test-configuration-files)

---

## 1. Testing Philosophy

Sentinel360 follows a **quality-first** approach to testing:

| Principle | Implementation |
|---|---|
| **Test behavior, not implementation** | Test what the user sees and does, not internal state |
| **Accessibility-first queries** | Use `getByRole`, `getByLabelText`, `getByPlaceholderText` — never `testId` unless required |
| **Component isolation** | Each component tested in isolation with mocked dependencies |
| **Realistic mocks** | MSW (Mock Service Worker) for API mocking at the network level |
| **Visual regression** | Storybook + Chromatic for every component |
| **Accessibility regression** | axe-core scans in every component test |
| **E2E for critical flows** | Full user journeys (login → view docket → update status) |

### Test Coverage Targets

| Level | Target | Measured By |
|---|---|---|
| Unit (components/hooks/utils) | ≥90% line coverage | Vitest + c8 |
| Integration (pages) | ≥80% line coverage | Vitest + MSW |
| E2E (critical paths) | 100% of critical flows | Playwright |
| Visual regression | 100% of components | Chromatic |
| Accessibility | 0 violations | axe-core (CI-enforced) |

---

## 2. Testing Pyramid

```
         ╱╲
        ╱  ╲              E2E (Playwright)
       ╱    ╲             5–10 critical user journeys
      ╱──────╲
     ╱        ╲
    ╱          ╲          Integration (Vitest + MSW)
   ╱            ╲         Page-level tests, data flow tests
  ╱──────────────╲
 ╱                  ╲
╱                    ╲    Unit & Component (Vitest + RTL)
╱──────────────────────╲  Individual components, hooks, utils
                          Storybook + Chromatic (all components)
                          axe-core a11y (every component)
```

---

## 3. Component Testing

### Setup

```tsx
// tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### Component Test Patterns

```tsx
// tests/unit/components/StatusBadge.test.tsx
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/cards/StatusBadge";

describe("StatusBadge", () => {
  it("renders with wanted status", () => {
    render(<StatusBadge status="wanted" />);
    expect(screen.getByText("WANTED")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-red-500/15");
  });

  it("renders with arrested status", () => {
    render(<StatusBadge status="arrested" />);
    expect(screen.getByText("ARRESTED")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-green-500/15");
  });

  it("applies pulse animation only for wanted", () => {
    const { rerender } = render(<StatusBadge status="wanted" pulse />);
    expect(screen.getByRole("status")).toHaveClass("animate-pulse");

    rerender(<StatusBadge status="arrested" pulse />);
    expect(screen.getByRole("status")).not.toHaveClass("animate-pulse");
  });

  it("renders with accessible role and label", () => {
    render(<StatusBadge status="wanted" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Status: wanted");
  });
});
```

```tsx
// tests/unit/components/GlassCard.test.tsx
import { render, screen } from "@testing-library/react";
import { GlassCard } from "@/components/ui/GlassCard";

describe("GlassCard", () => {
  it("renders children", () => {
    render(<GlassCard>Card Content</GlassCard>);
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<GlassCard variant="elevated">Content</GlassCard>);
    expect(screen.getByRole("article")).toHaveClass("backdrop-blur-2xl");

    rerender(<GlassCard variant="subtle">Content</GlassCard>);
    expect(screen.getByRole("article")).toHaveClass("backdrop-blur-md");
  });

  it("applies custom className", () => {
    render(<GlassCard className="custom-class">Content</GlassCard>);
    expect(screen.getByRole("article")).toHaveClass("custom-class");
  });

  it("has accessible role", () => {
    render(<GlassCard>Content</GlassCard>);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
});
```

```tsx
// tests/unit/components/SearchBar.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/cards/SearchBar";

describe("SearchBar", () => {
  it("renders with placeholder", () => {
    render(
      <SearchBar
        value=""
        onChange={() => {}}
        placeholder="Search cases..."
      />,
    );
    expect(screen.getByPlaceholderText("Search cases...")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);

    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test");

    // Should debounce — called after 300ms
    await waitFor(
      () => expect(handleChange).toHaveBeenCalledWith("test"),
      { timeout: 500 },
    );
  });

  it("shows clear button when value exists", () => {
    render(<SearchBar value="test" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("hides clear button when value is empty", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });

  it("calls onClear when clear button clicked", () => {
    const handleClear = vi.fn();
    render(<SearchBar value="test" onChange={() => {}} onClear={handleClear} />);
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(handleClear).toHaveBeenCalled();
  });
});
```

### Hook Testing

```tsx
// tests/unit/hooks/useDebounce.test.ts
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("debounces value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "first" } },
    );

    rerender({ value: "second" });
    // Should still be "first"
    expect(result.current).toBe("first");

    // Advance time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("second");
  });
});
```

---

## 4. Integration Testing

### Page-Level Tests with MSW

```tsx
// tests/integration/pages/docket-page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import DocketPage from "@/app/(dashboard)/docket/[docketId]/page";

// Mock docket data
const mockDocket = {
  id: "DKT-001",
  suspect: {
    fullName: "John Doe",
    status: "wanted",
    photoUrl: "/test-photo.jpg",
  },
  // ... full docket data
};

// Setup MSW server
const server = setupServer(
  http.get("*/api/v1/dockets/DKT-001", () => {
    return HttpResponse.json({ success: true, data: mockDocket });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock the params
vi.mock("next/navigation", () => ({
  useParams: () => ({ docketId: "DKT-001" }),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("DocketPage Integration", () => {
  it("loads and displays suspect name", async () => {
    render(<DocketPage params={{ docketId: "DKT-001" }} />);

    // Should show loading state first
    expect(screen.getByTestId("docket-skeleton")).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("displays status badge", async () => {
    render(<DocketPage params={{ docketId: "DKT-001" }} />);

    await waitFor(() => {
      expect(screen.getByText("WANTED")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    server.use(
      http.get("*/api/v1/dockets/DKT-001", () => {
        return HttpResponse.json(
          { success: false, message: "Failed to load docket" },
          { status: 500 },
        );
      }),
    );

    render(<DocketPage params={{ docketId: "DKT-001" }} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it("has accessible structure with proper regions", async () => {
    render(<DocketPage params={{ docketId: "DKT-001" }} />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /case information/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: /suspect details/i }),
      ).toBeInTheDocument();
    });
  });
});
```

```tsx
// tests/integration/pages/login-page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import LoginPage from "@/app/(auth)/login/page";

const server = setupServer(
  http.post("*/api/v1/auth/login", ({ request }) => {
    const body = await request.json();
    if (body.email === "test@sentinel360.com" && body.password === "correct") {
      return HttpResponse.json({
        success: true,
        data: {
          user: { id: "1", name: "Test User", role: "leo" },
          tokens: { accessToken: "mock-token", refreshToken: "mock-refresh" },
        },
      });
    }
    return HttpResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 },
    );
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("LoginPage Integration", () => {
  it("logs in with valid credentials", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@sentinel360.com");
    await user.type(screen.getByLabelText(/password/i), "correct");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      // Should redirect to dashboard
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error with invalid credentials", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "wrong@email.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
});
```

---

## 5. E2E Testing

### Playwright Configuration

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "pnpm build && pnpm start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

```ts
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("user can log in successfully", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "officer@sentinel360.com");
    await page.fill('input[name="password"]', "validPassword123");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "wrong@email.com");
    await page.fill('input[name="password"]', "wrong");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Invalid credentials")).toBeVisible();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

```ts
// tests/e2e/docket.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Docket Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[name="email"]', "officer@sentinel360.com");
    await page.fill('input[name="password"]', "validPassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test("docket page displays three-column layout", async ({ page }) => {
    await page.goto("/docket/DKT-001");
    await page.waitForLoadState("networkidle");

    // Verify all three columns are visible
    await expect(page.locator('[data-testid="left-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="center-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="right-sidebar"]')).toBeVisible();
  });

  test("suspect portrait with facial overlay is visible", async ({ page }) => {
    await page.goto("/docket/DKT-001");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="suspect-portrait"]')).toBeVisible();
    await expect(page.locator('[data-testid="facial-overlay"]')).toBeVisible();
  });

  test("can update suspect status to arrested", async ({ page }) => {
    await page.goto("/docket/DKT-001");
    await page.waitForLoadState("networkidle");

    await page.click('button:has-text("Mark as Arrested")');
    await page.click('dialog button:has-text("Confirm")');

    // Status should update
    await expect(page.locator("text=ARRESTED")).toBeVisible();
  });

  test("bottom panel tabs work correctly", async ({ page }) => {
    await page.goto("/docket/DKT-001");
    await page.waitForLoadState("networkidle");

    // Click different tabs
    await page.click('button:has-text("Evidence Upload")');
    await expect(page.locator('[data-testid="file-upload"]')).toBeVisible();

    await page.click('button:has-text("Witness Statements")');
    await expect(page.locator('[data-testid="witness-statements"]')).toBeVisible();
  });

  test("responsive layout on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/docket/DKT-001");
    await page.waitForLoadState("networkidle");

    // Should show single column
    const layout = page.locator('[data-testid="docket-layout"]');
    await expect(layout).toHaveCSS("grid-template-columns", "1fr");
  });
});
```

```ts
// tests/e2e/wanted-feed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Wanted Feed", () => {
  test("public feed loads without authentication", async ({ page }) => {
    await page.goto("/wanted");
    await expect(page.locator("text=WANTED PERSONS FEED")).toBeVisible();
    await expect(page.locator('[data-testid="suspect-card"]')).toHaveCount(8);
  });

  test("pagination works correctly", async ({ page }) => {
    await page.goto("/wanted");
    await page.click('button:has-text("Next")');
    await expect(page).toHaveURL(/page=2/);
  });

  test("search filters results", async ({ page }) => {
    await page.goto("/wanted");
    await page.fill('input[type="search"]', "John");
    await page.waitForTimeout(500);
    // Should show filtered results
    const cards = page.locator('[data-testid="suspect-card"]');
    await expect(cards).toHaveCount(await cards.count());
  });
});
```

---

## 6. Visual Regression Testing

### Storybook Setup

```tsx
// components/cards/StatusBadge.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "Cards/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["wanted", "investigating", "arrested", "cleared", "deceased", "under_review"],
    },
    pulse: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Wanted: Story = {
  args: { status: "wanted", pulse: true },
};

export const Investigating: Story = {
  args: { status: "investigating" },
};

export const Arrested: Story = {
  args: { status: "arrested" },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusBadge status="wanted" />
      <StatusBadge status="investigating" />
      <StatusBadge status="arrested" />
      <StatusBadge status="cleared" />
      <StatusBadge status="deceased" />
      <StatusBadge status="under_review" />
    </div>
  ),
};
```

### Chromatic Integration

```yml
# .github/workflows/chromatic.yml
name: Chromatic Visual Regression

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Build Storybook
        run: pnpm build-storybook

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          storybookBuildDir: storybook-static
          exitOnceUploaded: true
          onlyChanged: true
```

### Chromatic Workflow

```
Developer commits changes → CI runs Storybook build
  → Chromatic compares new snapshots to baseline
  → If changes detected: flags for review
  → Reviewer approves or rejects changes
  → If approved: new baseline established
  → If rejected: developer fixes and re-pushes
```

---

## 7. Accessibility Testing

### Automated a11y Tests (axe-core)

```tsx
// tests/unit/a11y/status-badge.a11y.test.tsx
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { StatusBadge } from "@/components/cards/StatusBadge";

expect.extend(toHaveNoViolations);

describe("StatusBadge Accessibility", () => {
  it("should have no accessibility violations", async () => {
    const { container } = render(<StatusBadge status="wanted" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no violations for all statuses", async () => {
    const statuses = ["wanted", "investigating", "arrested", "cleared", "deceased", "under_review"] as const;

    for (const status of statuses) {
      const { container } = render(<StatusBadge status={status} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });
});
```

### Storybook a11y Addon

```tsx
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    "@storybook/addon-a11y",  // Accessibility panel in Storybook
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
};
```

### Manual Accessibility Checklist

| Check | Tool | Frequency |
|---|---|---|
| **Keyboard navigation** | Manual Tab key testing | Every PR |
| **Screen reader** | VoiceOver (macOS), NVDA (Windows) | Per feature |
| **Color contrast** | axe DevTools, Wave | CI-enforced |
| **Focus indicators** | Visual inspection | Every PR |
| **Reduced motion** | `prefers-reduced-motion: reduce` | Per component |
| **ARIA labels** | axe-core, manual inspection | CI-enforced |
| **Semantic HTML** | axe-core, manual review | CI-enforced |
| **Zoom to 200%** | Manual browser zoom | Per feature |
| **Text spacing** | Bookmarklet for WCAG 1.4.12 | Per feature |

### CI Enforcement

```yml
# In CI pipeline — fail build if a11y violations found
- name: Run a11y tests
  run: pnpm test:a11y  # Runs all *.a11y.test.tsx files
```

---

## 8. Test Configuration Files

### `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "./tests/unit/**/*.test.{ts,tsx}",
      "./tests/integration/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "./tests/e2e/**",
      "./node_modules/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.test.{ts,tsx}",
        "src/types/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    globals: true,
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ["json", { outputFile: "playwright-report/test-results.json" }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### `package.json` Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:a11y": "vitest run --reporter=verbose tests/unit/a11y",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:visual": "pnpm build-storybook && chromatic",
    "test:all": "pnpm test:run && pnpm test:e2e"
  }
}
```

---

> **Next Document:** [09-FILE-STRUCTURE.md](./09-FILE-STRUCTURE.md)
