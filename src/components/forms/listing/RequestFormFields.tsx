"use client";

import type { ListingFormChangeHandler, ListingFormErrors, ListingFormValues } from "@/components/forms/listing/listingFormConfig";

type Props = {
  values: ListingFormValues;
  onChange: ListingFormChangeHandler;
  errors: ListingFormErrors;
};

export default function RequestFormFields({ values, onChange, errors }: Props) {
  return (
    <>
      <section className="form-section form-card">
  <h3 className="form-card-title">Job details</h3>

      <div className="field-block">
        <label htmlFor="request-budget" className="field-label">
          Budget
        </label>
        <input
          id="request-budget"
          className="input field-input"
          value={values.requestBudget}
          onChange={(event) => onChange("requestBudget", event.target.value)}
          placeholder="e.g. 150€"
        />
        {errors.requestBudget && <p className="text-xs text-destructive">{errors.requestBudget}</p>}
      </div>

      <div className="field-block">
        <label htmlFor="request-needed-by" className="field-label">
          Needed by
        </label>
        <input
          id="request-needed-by"
          type="date"
          className="input field-input"
          value={values.requestNeededBy}
          onChange={(event) => onChange("requestNeededBy", event.target.value)}
        />
      </div>

        <div className="field-block">
          <label htmlFor="request-urgency" className="field-label">
            Urgency
          </label>
          <select
            id="request-urgency"
            className="select field-select"
            value={values.requestUrgency}
            onChange={(event) => onChange("requestUrgency", event.target.value)}
          >
            <option value="">Select urgency</option>
            <option value="flexible">Flexible</option>
            <option value="soon">Within a week</option>
            <option value="urgent">ASAP</option>
          </select>
        </div>

      </section>
    </>
  );
}
