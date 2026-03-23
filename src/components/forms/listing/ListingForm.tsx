"use client";

import * as React from "react";
import type { ListingType } from "@/types/listing";
import LocationFields from "@/components/location/LocationFields";
import PhotoUploadField from "@/components/forms/listing/PhotoUploadField";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import ServiceFormFields from "@/components/forms/listing/ServiceFormFields";
import RequestFormFields from "@/components/forms/listing/RequestFormFields";
import MarketplaceFormFields from "@/components/forms/listing/MarketplaceFormFields";
import { CATEGORIES_MARKETPLACE, CATEGORIES_REQUESTS, CATEGORIES_SERVICES } from "@/components/filters/categories";
import { useListingForm } from "@/hooks/useListingForm";

type Props = {
  type: ListingType;
  title?: string;
};

export default function ListingForm({ type, title }: Props) {
  const {
    formValues,
    errors,
    isPreview,
    isSubmitting,
    statusMessage,
    handleChange,
    handleBusinessToggle,
    handlePreview,
    handleSubmit,
    closePreview,
  } = useListingForm(type);

  const renderTypeFields = () => {
    switch (type) {
      case "service":
        return (
          <ServiceFormFields values={formValues} onChange={handleChange} errors={errors} />
        );
      case "request":
        return (
          <RequestFormFields values={formValues} onChange={handleChange} errors={errors} />
        );
      case "marketplace":
        return (
          <MarketplaceFormFields values={formValues} onChange={handleChange} errors={errors} />
        );
      default:
        return null;
    }
  };

  const previewDetails = [
    { label: "Title", value: formValues.title },
    { label: "Description", value: formValues.description },
    { label: "County", value: formValues.county },
    { label: "Area", value: formValues.area },
    { label: "Contact", value: [formValues.contactName, formValues.contactEmail, formValues.contactPhone].filter(Boolean).join(" · ") },
  ];

  if (formValues.listAsBusiness) {
    previewDetails.push(
      { label: "Company", value: formValues.companyName },
      { label: "Business address", value: formValues.businessAddress },
      { label: "VAT number", value: formValues.vatNumber },
      { label: "Website", value: formValues.website },
      { label: "Registration number", value: formValues.registrationNumber }
    );
  }

  if (type === "service") {
    previewDetails.push(
      { label: "Service category", value: formValues.serviceCategory },
      { label: "Pricing", value: formValues.servicePricing },
      { label: "Rate", value: formValues.serviceRate },
      { label: "Availability", value: formValues.serviceAvailability }
    );
  }

  if (type === "request") {
    previewDetails.push(
      { label: "Request category", value: formValues.requestCategory },
      { label: "Budget", value: formValues.requestBudget },
      { label: "Needed by", value: formValues.requestNeededBy },
      { label: "Urgency", value: formValues.requestUrgency }
    );
  }

  if (type === "marketplace") {
    previewDetails.push(
      { label: "Marketplace category", value: formValues.marketplaceCategory },
      { label: "Condition", value: formValues.marketplaceCondition },
      { label: "Quantity", value: formValues.marketplaceQuantity },
      { label: "Price", value: formValues.marketplacePrice },
      { label: "Delivery", value: formValues.marketplaceDelivery }
    );
  }

  return (
    <div
      className="w-full"
      style={{
        width: "100%",
        maxWidth: "640px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {title && (
        <div className="mb-3">
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        </div>
      )}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-section form-card">
          <div className="field-block">
            <label htmlFor="listing-title" className="field-label">
              Listing title
            </label>
            <input
              id="listing-title"
              className="input field-input"
              value={formValues.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="e.g. Weekend garden maintenance"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="field-block">
            <label htmlFor="listing-description" className="field-label">
              Description
            </label>
            <textarea
              id="listing-description"
              className="textarea field-textarea"
              value={formValues.description}
              onChange={(event) => handleChange("description", event.target.value)}
              placeholder="Tell clients what they should know before contacting you."
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>
        </div>

        {type === "service" && (
          <section className="form-section form-card">
            <h3 className="form-card-title">Category</h3>
            <div className="field-block">
              <label htmlFor="service-category" className="sr-only">
                Category
              </label>
              <div className="relative">
                <select
                  id="service-category"
                  className="select field-select pr-10"
                  value={formValues.serviceCategory}
                  onChange={(event) => handleChange("serviceCategory", event.target.value)}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES_SERVICES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {errors.serviceCategory && (
                <p className="text-xs text-destructive">{errors.serviceCategory}</p>
              )}
            </div>
          </section>
        )}

        {type === "request" && (
          <section className="form-section form-card">
            <h3 className="form-card-title">Category</h3>
            <div className="field-block">
              <label htmlFor="request-category" className="sr-only">
                Category
              </label>
              <select
                id="request-category"
                className="select field-select"
                value={formValues.requestCategory}
                onChange={(event) => handleChange("requestCategory", event.target.value)}
              >
                <option value="">Select a category</option>
                {CATEGORIES_REQUESTS.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.requestCategory && (
                <p className="text-xs text-destructive">{errors.requestCategory}</p>
              )}
            </div>
          </section>
        )}

        {type === "marketplace" && (
          <section className="form-section form-card">
            <h3 className="form-card-title">Category</h3>
            <div className="field-block">
              <label htmlFor="marketplace-category" className="sr-only">
                Category
              </label>
              <select
                id="marketplace-category"
                className="select field-select"
                value={formValues.marketplaceCategory}
                onChange={(event) => handleChange("marketplaceCategory", event.target.value)}
              >
                <option value="">Select a category</option>
                {CATEGORIES_MARKETPLACE.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.marketplaceCategory && (
                <p className="text-xs text-destructive">{errors.marketplaceCategory}</p>
              )}
            </div>
          </section>
        )}

        <section className="form-section form-card">
          <h3 className="form-card-title">Location</h3>
          <div className="field-block">
            <label className="field-label">County and area</label>
            <LocationFields
              county={formValues.county}
              area={formValues.area}
              onCountyChange={(value) => handleChange("county", value)}
              onAreaChange={(value) => handleChange("area", value)}
            />
            {errors.county && <p className="text-xs text-destructive">{errors.county}</p>}
          </div>
        </section>

        {type === "service" && (
          <PhotoUploadField
            photos={formValues.servicePhotos ?? []}
            onChange={(photos) => handleChange("servicePhotos", photos)}
            youtubeValue={formValues.serviceYoutubeUrl}
            onYoutubeChange={(value) => handleChange("serviceYoutubeUrl", value)}
          />
        )}

        {type === "request" && (
          <PhotoUploadField
            photos={formValues.requestPhotos}
            onChange={(photos) => handleChange("requestPhotos", photos)}
            youtubeValue={formValues.requestYoutubeUrl}
            onYoutubeChange={(value) => handleChange("requestYoutubeUrl", value)}
          />
        )}

        {type === "marketplace" && (
          <PhotoUploadField
            photos={formValues.marketplacePhotos}
            onChange={(photos) => handleChange("marketplacePhotos", photos)}
            youtubeValue={formValues.marketplaceYoutubeUrl}
            onYoutubeChange={(value) => handleChange("marketplaceYoutubeUrl", value)}
          />
        )}

        {renderTypeFields()}

        <section className="form-section form-card">
          <h3 className="form-card-title">Contact details</h3>

          <label className="business-toggle-row" htmlFor="list-as-business">
            <input
              id="list-as-business"
              type="checkbox"
              checked={formValues.listAsBusiness}
              onChange={handleBusinessToggle}
            />
            <span>List as a business</span>
          </label>

          {formValues.listAsBusiness && (
            <div className="form-card form-card--nested">
              <h4 className="text-sm font-semibold text-slate-700">
                Business details <span className="font-medium text-slate-400">(optional)</span>
              </h4>
              <div className="field-block">
                <label htmlFor="company-name" className="field-label">
                  Company name
                </label>
                <input
                  id="company-name"
                  className="input field-input"
                  value={formValues.companyName}
                  onChange={(event) => handleChange("companyName", event.target.value)}
                  placeholder="e.g. Dublin Home Services"
                  required
                />
                {errors.companyName && (
                  <p className="text-xs text-destructive">{errors.companyName}</p>
                )}
              </div>

              <div className="field-block">
                <label htmlFor="business-address" className="field-label">
                  Business address
                </label>
                <input
                  id="business-address"
                  className="input field-input"
                  value={formValues.businessAddress}
                  onChange={(event) => handleChange("businessAddress", event.target.value)}
                  placeholder="Street, city, country"
                  required
                />
                {errors.businessAddress && (
                  <p className="text-xs text-destructive">{errors.businessAddress}</p>
                )}
              </div>

              <div className="field-block">
                <label htmlFor="vat-number" className="field-label">
                  VAT number
                </label>
                <input
                  id="vat-number"
                  className="input field-input"
                  value={formValues.vatNumber}
                  onChange={(event) => handleChange("vatNumber", event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="field-block">
                <label htmlFor="company-website" className="field-label">
                  Website
                </label>
                <input
                  id="company-website"
                  className="input field-input"
                  value={formValues.website}
                  onChange={(event) => handleChange("website", event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="field-block">
                <label htmlFor="registration-number" className="field-label">
                  Company registration number
                </label>
                <input
                  id="registration-number"
                  className="input field-input"
                  value={formValues.registrationNumber}
                  onChange={(event) => handleChange("registrationNumber", event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          <div className="field-block">
            <label htmlFor="contact-name" className="field-label">
              Contact name
            </label>
            <input
              id="contact-name"
              className="input field-input"
              value={formValues.contactName}
              onChange={(event) => handleChange("contactName", event.target.value)}
              placeholder="Who should we display on the listing"
            />
          </div>

          <div className="field-block">
            <label htmlFor="contact-email" className="field-label">
              Contact email
            </label>
            <input
              id="contact-email"
              type="email"
              className="input field-input"
              value={formValues.contactEmail}
              onChange={(event) => handleChange("contactEmail", event.target.value)}
              placeholder="name@email.com"
            />
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail}</p>
            )}
          </div>

          <div className="field-block">
            <label htmlFor="contact-phone" className="field-label">
              Contact phone
            </label>
            <input
              id="contact-phone"
              className="input field-input"
              value={formValues.contactPhone}
              onChange={(event) => handleChange("contactPhone", event.target.value)}
              placeholder="+353 000000000"
            />
          </div>
        </section>

        {statusMessage && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {statusMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-900"
              onClick={handlePreview}
            >
              Preview
            </Button>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit listing"}
          </Button>
        </div>
      </form>

      {isPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Here is how your listing will appear to buyers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {previewDetails
                .filter((item) => item.value)
                .map((item) => (
                  <div key={item.label} className="grid gap-1">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" variant="outline" onClick={closePreview}>
              Close preview
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
