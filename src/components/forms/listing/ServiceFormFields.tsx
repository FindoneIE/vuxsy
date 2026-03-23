"use client";

import type { ListingFormChangeHandler, ListingFormErrors, ListingFormValues } from "@/components/forms/listing/listingFormConfig";

type Props = {
  values: ListingFormValues;
  onChange: ListingFormChangeHandler;
  errors: ListingFormErrors;
};

export default function ServiceFormFields({ values, onChange, errors }: Props) {
  return (
    <>
      <section className="form-section form-card">
        <h3 className="form-card-title">Service details</h3>

      <div className="field-block">
        <label htmlFor="service-pricing" className="field-label">
          Pricing model
        </label>
        <select
          id="service-pricing"
          className="select field-select"
          value={values.servicePricing}
          onChange={(event) => onChange("servicePricing", event.target.value)}
        >
          <option value="">Select pricing model</option>
          <option value="hourly">Hourly</option>
          <option value="fixed">Fixed price</option>
          <option value="estimate">Estimate after inspection</option>
        </select>
        {errors.servicePricing && <p className="text-xs text-destructive">{errors.servicePricing}</p>}
      </div>

      <div className="field-block">
        <label htmlFor="service-rate" className="field-label">
          Rate
        </label>
        <input
          id="service-rate"
          className="input field-input"
          value={values.serviceRate}
          onChange={(event) => onChange("serviceRate", event.target.value)}
          placeholder="e.g. 35 €/hour"
        />
        {errors.serviceRate && <p className="text-xs text-destructive">{errors.serviceRate}</p>}
      </div>

        <div className="field-block">
          <label htmlFor="service-availability" className="field-label">
            Availability
          </label>
          <textarea
            id="service-availability"
            className="textarea field-textarea"
            value={values.serviceAvailability}
            onChange={(event) => onChange("serviceAvailability", event.target.value)}
            placeholder="e.g. Available weekdays after 5pm"
          />
        </div>

      </section>
    </>
  );
}
