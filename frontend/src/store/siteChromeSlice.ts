import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ChromeNavItem = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  position: number;
  children?: Array<{
    id: string;
    label: string;
    href: string;
    external: boolean;
    position: number;
  }>;
};

export type HomeSectionState = {
  id: string;
  key: string;
  label: string;
  position: number;
  is_enabled: boolean;
};

export type SiteChromeState = {
  hydrated: boolean;
  siteName: string;
  topbarEmail: string | null;
  topbarPhone: string | null;
  footerBlurb: string | null;
  footerPhone: string | null;
  footerCallout: string | null;
  social: {
    facebook: string | null;
    twitter: string | null;
    youtube: string | null;
    linkedin: string | null;
    instagram: string | null;
  };
  nav: {
    header: ChromeNavItem[];
    footer_find: ChromeNavItem[];
    footer_care: ChromeNavItem[];
    footer_sell: ChromeNavItem[];
  };
  homeSections: HomeSectionState[];
};

export const initialSiteChromeState: SiteChromeState = {
  hydrated: false,
  siteName: "Niyenin",
  topbarEmail: "retailmarket@gmail.com",
  topbarPhone: "+1(213)628-3034",
  footerBlurb:
    "Phasellus justo ligula, dictum sit amet tortor eu, iaculis tristique turpis.",
  footerPhone: "+1(000)000-000",
  footerCallout: "Got Question? Call Us 24/7!",
  social: {
    facebook: "https://facebook.com",
    twitter: "https://x.com",
    youtube: "https://youtube.com",
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
  },
  nav: {
    header: [],
    footer_find: [],
    footer_care: [],
    footer_sell: [],
  },
  homeSections: [],
};

export type SiteChromeHydratePayload = {
  siteName?: string;
  topbarEmail?: string | null;
  topbarPhone?: string | null;
  footerBlurb?: string | null;
  footerPhone?: string | null;
  footerCallout?: string | null;
  social?: SiteChromeState["social"];
  nav?: SiteChromeState["nav"];
  homeSections?: HomeSectionState[];
};

/** Merge a server / cache payload into chrome state (used for sync store seed). */
export function applySiteChromePayload(
  base: SiteChromeState,
  p: SiteChromeHydratePayload,
): SiteChromeState {
  return {
    ...base,
    siteName: p.siteName || base.siteName,
    topbarEmail: p.topbarEmail !== undefined ? p.topbarEmail : base.topbarEmail,
    topbarPhone: p.topbarPhone !== undefined ? p.topbarPhone : base.topbarPhone,
    footerBlurb: p.footerBlurb !== undefined ? p.footerBlurb : base.footerBlurb,
    footerPhone: p.footerPhone !== undefined ? p.footerPhone : base.footerPhone,
    footerCallout:
      p.footerCallout !== undefined ? p.footerCallout : base.footerCallout,
    social: p.social ? { ...base.social, ...p.social } : base.social,
    nav: p.nav ?? base.nav,
    homeSections: p.homeSections ?? base.homeSections,
    hydrated: true,
  };
}

const siteChromeSlice = createSlice({
  name: "siteChrome",
  initialState: initialSiteChromeState,
  reducers: {
    hydrateSiteChrome(state, action: PayloadAction<SiteChromeHydratePayload>) {
      const next = applySiteChromePayload(state, action.payload);
      state.siteName = next.siteName;
      state.topbarEmail = next.topbarEmail;
      state.topbarPhone = next.topbarPhone;
      state.footerBlurb = next.footerBlurb;
      state.footerPhone = next.footerPhone;
      state.footerCallout = next.footerCallout;
      state.social = next.social;
      state.nav = next.nav;
      state.homeSections = next.homeSections;
      state.hydrated = true;
    },
  },
});

export const { hydrateSiteChrome } = siteChromeSlice.actions;
export default siteChromeSlice.reducer;

export const selectSiteChrome = (state: { siteChrome: SiteChromeState }) =>
  state.siteChrome;
export const selectHeaderNav = (state: { siteChrome: SiteChromeState }) =>
  state.siteChrome.nav.header;
export const selectHomeSections = (state: { siteChrome: SiteChromeState }) =>
  state.siteChrome.homeSections;
