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

const initialState: SiteChromeState = {
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

const siteChromeSlice = createSlice({
  name: "siteChrome",
  initialState,
  reducers: {
    hydrateSiteChrome(state, action: PayloadAction<SiteChromeHydratePayload>) {
      const p = action.payload;
      if (p.siteName) state.siteName = p.siteName;
      if (p.topbarEmail !== undefined) state.topbarEmail = p.topbarEmail;
      if (p.topbarPhone !== undefined) state.topbarPhone = p.topbarPhone;
      if (p.footerBlurb !== undefined) state.footerBlurb = p.footerBlurb;
      if (p.footerPhone !== undefined) state.footerPhone = p.footerPhone;
      if (p.footerCallout !== undefined) state.footerCallout = p.footerCallout;
      if (p.social) state.social = { ...state.social, ...p.social };
      if (p.nav) state.nav = p.nav;
      if (p.homeSections) state.homeSections = p.homeSections;
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
