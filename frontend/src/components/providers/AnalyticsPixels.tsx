"use client";

import Script from "next/script";
import type { PublicSiteSettings } from "@/lib/siteSettings";

type Props = {
  settings: PublicSiteSettings;
};

/**
 * Injects analytics + advertising pixels configured in dashboard Site settings.
 * Only loads when enabled and an ID is present.
 */
export function AnalyticsPixels({ settings }: Props) {
  const { analytics, pixels } = settings;
  const ga = analytics.google_analytics;
  const gtm = analytics.google_tag_manager;
  const hotjar = analytics.hotjar;
  const plerdy = analytics.plerdy;
  const ads = pixels.google_ads;
  const tiktok = pixels.tiktok;
  const linkedin = pixels.linkedin;
  const twitter = pixels.twitter;
  const meta = pixels.meta;

  return (
    <>
      {gtm.enabled && gtm.id ? (
        <>
          <Script id="gtm-loader" strategy="afterInteractive">{`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtm.id}');
          `}</Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm.id}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}

      {ga.enabled && ga.id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga.id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-config" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga.id}');
            ${ads.enabled && ads.id ? `gtag('config', '${ads.id}');` : ""}
          `}</Script>
        </>
      ) : ads.enabled && ads.id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ads.id}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-config" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ads.id}');
          `}</Script>
        </>
      ) : null}

      {hotjar.enabled && hotjar.id ? (
        <Script id="hotjar" strategy="afterInteractive">{`
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${hotjar.id},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `}</Script>
      ) : null}

      {plerdy.enabled && plerdy.id ? (
        <Script id="plerdy" strategy="afterInteractive">{`
          var _protocol="https:"==document.location.protocol?"https://":"http://";
          window.plerdy_code=window.plerdy_code||[];
          var _s=document.createElement("script");_s.defer=true;_s.type="text/javascript";
          _s.src=_protocol+"d.plerdy.com/public/js/s/"+encodeURIComponent("${plerdy.id}")+"/plerdy.js";
          document.head.appendChild(_s);
        `}</Script>
      ) : null}

      {meta.enabled && meta.id ? (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${meta.id}');
          fbq('track', 'PageView');
        `}</Script>
      ) : null}

      {tiktok.enabled && tiktok.id ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
            ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
            ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
            for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
            ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
            ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
            ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
            var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
            var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${tiktok.id}');
            ttq.page();
          }(window, document, 'ttq');
        `}</Script>
      ) : null}

      {linkedin.enabled && linkedin.id ? (
        <Script id="linkedin-insight" strategy="afterInteractive">{`
          _linkedin_partner_id = "${linkedin.id}";
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          (function(l) {
            if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
            window.lintrk.q=[]}
            var s = document.getElementsByTagName("script")[0];
            var b = document.createElement("script");
            b.type = "text/javascript";b.async = true;
            b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
            s.parentNode.insertBefore(b, s);})(window.lintrk);
        `}</Script>
      ) : null}

      {twitter.enabled && twitter.id ? (
        <Script id="twitter-pixel" strategy="afterInteractive">{`
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','${twitter.id}');
        `}</Script>
      ) : null}
    </>
  );
}
