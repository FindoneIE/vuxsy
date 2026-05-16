"use client";

import type { ListingFormChangeHandler, ListingFormErrors, ListingFormValues } from "@/components/forms/listing/listingFormConfig";

type Props = {
  values: ListingFormValues;
  onChange: ListingFormChangeHandler;
  errors: ListingFormErrors;
};

export default function RequestFormFields({ values, onChange, errors }: Props) {
  return (
    <section className="form-section form-card">
        <h3 className="form-card-title">Job details</h3>

      <div className="field-block">
        <label htmlFor="listing-price" className="field-label">
          Price
        </label>
        <input
          id="listing-price"
          className="input field-input"
          value={values.price}
          onChange={(event) => onChange("price", event.target.value)}
          placeholder="e.g. 300€"
        />
        {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
      </div>
    </section>
  );
}
