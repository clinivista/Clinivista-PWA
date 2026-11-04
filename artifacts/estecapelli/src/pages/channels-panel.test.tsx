import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider, LANGS } from "@/lib/language";
import { CHANNELS_TEXT } from "@/lib/channels-i18n";
import { ChannelsPanel } from "./channels-panel";

let state = { channels: ["email", "whatsapp"], available: ["email", "whatsapp"], coming: ["sms"], canEdit: true };
const fetchMock = vi.fn();

beforeEach(() => {
  state = { channels: ["email", "whatsapp"], available: ["email", "whatsapp"], coming: ["sms"], canEdit: true };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      state = { ...state, channels: JSON.parse(String(init.body)).channels };
    }
    return new Response(JSON.stringify(state), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderPanel = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LanguageProvider><ChannelsPanel /></LanguageProvider>
  </QueryClientProvider>,
);

describe("Canales de comunicación (panel de la clínica)", () => {
  it("shows email and WhatsApp as choices, and SMS as «Próximamente» without being selectable", async () => {
    renderPanel();
    expect(await screen.findByTestId("channel-email")).toBeChecked();
    expect(screen.getByTestId("channel-whatsapp")).toBeChecked();
    expect(screen.getByTestId("channel-sms")).toHaveTextContent("Próximamente");
    expect(screen.getByRole("checkbox", { name: /SMS/ })).toBeDisabled();
  });

  it("saves the chosen channels, and will not let the clinic save with none", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByTestId("channel-email"));
    await user.click(screen.getByTestId("channel-whatsapp"));
    expect(screen.getByTestId("channels-none")).toBeInTheDocument();
    expect(screen.getByTestId("channels-save")).toBeDisabled();
    await user.click(screen.getByTestId("channel-whatsapp"));
    await user.click(screen.getByTestId("channels-save"));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(JSON.parse(String(put[1].body))).toEqual({ channels: ["whatsapp"] });
  });

  it("is read-only for staff who cannot manage the clinic", async () => {
    state.canEdit = false;
    renderPanel();
    expect(await screen.findByTestId("channels-readonly")).toBeInTheDocument();
    expect(screen.getByTestId("channel-email")).toBeDisabled();
    expect(screen.queryByTestId("channels-save")).toBeNull();
  });

  it("has every text in every language", () => {
    for (const { code } of LANGS) {
      for (const [key, value] of Object.entries(CHANNELS_TEXT[code])) expect(value, `${code}.${key}`).toBeTruthy();
    }
  });
});
