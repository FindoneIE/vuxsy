"use client";

import type { ListingFormChangeHandler, ListingFormErrors, ListingFormValues } from "@/components/forms/listing/listingFormConfig";

type Props = {
  values: ListingFormValues;
  onChange: ListingFormChangeHandler;
  errors: ListingFormErrors;
};

export default function MarketplaceFormFields({ values, onChange, errors }: Props) {
  return (
    <>
      <section className="form-section form-card">
        <h3 className="form-card-title">Marketplace details</h3>

        <div className="field-block">
          <label htmlFor="marketplace-quantity" className="field-label">
            Quantity
          </label>
          <input
            id="marketplace-quantity"
            className="input field-input"
            value={values.marketplaceQuantity}
            onChange={(event) => onChange("marketplaceQuantity", event.target.value)}
            placeholder="e.g. 2"
          />
          {errors.marketplaceQuantity && (
            <p className="text-xs text-destructive">{errors.marketplaceQuantity}</p>
          )}
        </div>

        <div className="field-block">
          <label htmlFor="marketplace-price" className="field-label">
            Price
          </label>
          <input
            id="marketplace-price"
            className="input field-input"
            value={values.marketplacePrice}
            onChange={(event) => onChange("marketplacePrice", event.target.value)}
            placeholder="e.g. 300€"
          />
          {errors.marketplacePrice && (
            <p className="text-xs text-destructive">{errors.marketplacePrice}</p>
          )}
        </div>

        <div className="field-block">
          <label htmlFor="marketplace-condition" className="field-label">
            Condition
          </label>
          <select
            id="marketplace-condition"
            className="input field-input"
            value={values.marketplaceCondition}
            onChange={(event) => onChange("marketplaceCondition", event.target.value)}
            required
          >
            <option value="" disabled>
              Select condition
            </option>
            <option value="New">New</option>
            <option value="Like new">Like new</option>
            <option value="Used">Used</option>
            <option value="Good condition">Good condition</option>
            <option value="Fair condition">Fair condition</option>
            <option value="For parts / repair">For parts / repair</option>
          </select>
          {errors.marketplaceCondition && (
            <p className="text-xs text-destructive">{errors.marketplaceCondition}</p>
          )}
        </div>

      </section>
    </>
  );
}
