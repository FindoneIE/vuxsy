import Link from 'next/link'
import { Wrench, MessageCircleQuestion, Store } from '@/components/ui/Icon'
import ListingForm from '@/components/forms/listing/ListingForm'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import type { ListingType } from '@/types/listing'

type PublishPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const params = searchParams ? await searchParams : undefined
  const type = typeof params?.type === 'string' ? params.type : undefined
  const listingType: ListingType | undefined =
    type === 'service' || type === 'request' || type === 'marketplace' ? type : undefined

  return (
    <ProtectedRoute>
      <main>
        <section>
        {/* show the main header only when no type is selected */}
        {!listingType && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900">Create a listing</h1>
              <p className="text-sm text-slate-500">Choose what you want to publish on Findone.</p>
            </div>
          </div>
        )}

        {!listingType ? (
          <div style={{ marginTop: 28 }}>
            <div className="publish-grid">
              <Link href={{ pathname: '/publish', query: { type: 'service' } }} className="publish-card" aria-label="Offer a Service">
                <div className="card-icon w-10 h-10 rounded-lg flex items-center justify-center" aria-hidden>
                  <Wrench size={24} weight="regular" className="h-6 w-6 shrink-0" />
                </div>

                <div className="card-body">
                  <h3>Offer a Service</h3>
                  <p className="card-desc">List a service you provide and get clients from your local area.</p>
                </div>

                <div className="card-cta">Create service →</div>
              </Link>

              <Link href={{ pathname: '/publish', query: { type: 'request' } }} className="publish-card" aria-label="Post your job">
                <div className="card-icon w-10 h-10 rounded-lg flex items-center justify-center" aria-hidden>
                  <MessageCircleQuestion size={24} weight="regular" className="h-6 w-6 shrink-0" />
                </div>

                <div className="card-body">
                  <h3>Post your job</h3>
                  <p className="card-desc">Describe what you need and let providers send you offers.</p>
                </div>

                <div className="card-cta">Create job →</div>
              </Link>

              <Link href={{ pathname: '/publish', query: { type: 'marketplace' } }} className="publish-card" aria-label="Sell on Marketplace">
                <div className="card-icon w-10 h-10 rounded-lg flex items-center justify-center" aria-hidden>
                  <Store size={24} weight="regular" className="h-6 w-6 shrink-0" />
                </div>

                <div className="card-body">
                  <h3>Sell on Marketplace</h3>
                  <p className="card-desc">List items for sale and reach buyers in your community.</p>
                </div>

                <div className="card-cta">Create listing →</div>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {listingType && (
              <ListingForm
                type={listingType}
                title={
                  listingType === 'service'
                    ? 'Offer a Service'
                    : listingType === 'request'
                    ? 'Post your job'
                    : 'Sell on Marketplace'
                }
              />
            )}
          </div>
        )}

        <style>{`
          .publish-grid{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
          }

          .publish-card{
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 22px;
            border-radius: 12px;
             border: 1px solid #e2e8f0;
            box-shadow: 0 6px 18px rgba(16,24,40,0.04);
             background: #fff;
             text-decoration: none;
             color: #334155;
             transition: all 200ms ease;
            cursor: pointer;
          }

          .publish-card:hover{
            transform: translateY(-4px);
             box-shadow: 0 8px 22px rgba(15,23,42,0.08);
             border-color: #cbd5e1;
             background: #f8fafc;
          }

           .publish-card:active{
             background: #eff6ff;
           }

          .publish-card .card-icon{
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }

          .publish-card .card-icon svg{
            color: #64748b;
          }

          .publish-card h3{
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          .card-desc{
            margin: 6px 0 0 0;
            color: #6b7280;
          }

          .card-cta{
            margin-top: auto;
            font-weight: 500;
            color: var(--brand);
          }

          .form-shell{
            margin-top: 12px;
            padding: 18px;
            border: 1px solid rgba(16,24,40,0.04);
            border-radius: 10px;
            background: #fff;
            min-height: 140px; /* keep white card visible even when empty */
          }

          @media (max-width: 900px){
            .publish-grid{ grid-template-columns: 1fr; }
          }
        `}</style>
        </section>
      </main>
    </ProtectedRoute>
  )
}