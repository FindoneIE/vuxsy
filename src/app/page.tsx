import Link from "next/link";
import HeroSearch from "@/components/hero/HeroSearch";

export default function HomePage() {
  return (
    <main>
  <section className="pt-4">
        <div className="hero">
          <div className="hero-card">
            <h1 className="hero-title">Find services, requests and products in one place</h1>

            <p className="hero-text">
              Discover local professionals, post requests, or shop for products — all in one
              easy-to-use marketplace built for your community.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/services" className="btn btn--primary">
                Browse Services
              </Link>

              <Link href="/requests" className="btn btn--ghost">
                Browse Requests
              </Link>

              <Link href="/marketplace" className="btn btn--ghost">
                Browse Marketplace
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <div style={{ marginTop: 18 }}>
              <HeroSearch />
            </div>
          </div>
        </div>

        

        {/* Quick category/action cards */}
        <section className="page-section">
          <h2 className="section-title">Explore</h2>
          <p className="section-subtitle">Jump quickly to the part of the marketplace you need.</p>

          <div style={{ marginTop: 12 }} className="quick-grid">
            <Link href="/services" className="quick-card">
              <h3 className="quick-card__title">Services</h3>
              <p className="quick-card__text">Find local professionals and freelancers for any job.</p>
              <div style={{ marginTop: 12 }}>
                <span className="btn btn--ghost">Browse Services</span>
              </div>
            </Link>

            <Link href="/requests" className="quick-card">
              <h3 className="quick-card__title">Requests</h3>
              <p className="quick-card__text">Post a request and get offers from local providers.</p>
              <div style={{ marginTop: 12 }}>
                <span className="btn btn--ghost">Browse Requests</span>
              </div>
            </Link>

            <Link href="/marketplace" className="quick-card">
              <h3 className="quick-card__title">Marketplace</h3>
              <p className="quick-card__text">Shop local products and support small businesses nearby.</p>
              <div style={{ marginTop: 12 }}>
                <span className="btn btn--ghost">Browse Marketplace</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Latest listings preview */}
        <section className="page-section">
          <h2 className="section-title">Latest listings</h2>
          <p className="section-subtitle">A quick preview of recently posted listings.</p>

          <div style={{ marginTop: 12 }} className="listings-grid">
            {/* Using simple placeholders so we don't introduce new data dependencies */}
            <a className="listing-card">
              <h3 className="listing-card__title">Plumber - fast repairs</h3>
              <p className="listing-card__desc">Experienced plumber available for same-day repairs.</p>
              <p className="listing-card__price">EUR 50</p>
              <p className="listing-card__meta">County A • Area 1</p>
            </a>

            <a className="listing-card">
              <h3 className="listing-card__title">Garden maintenance</h3>
              <p className="listing-card__desc">Weekly lawn care and pruning services.</p>
              <p className="listing-card__price">EUR 30</p>
              <p className="listing-card__meta">County B • Area 2</p>
            </a>

            <a className="listing-card">
              <h3 className="listing-card__title">Handyman</h3>
              <p className="listing-card__desc">Small home improvements and furniture assembly.</p>
              <p className="listing-card__price">EUR 25</p>
              <p className="listing-card__meta">County A • Area 3</p>
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
