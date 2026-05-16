"use client";

import * as React from "react";
import Image from "next/image";
import type { ListingType } from "@/types/listing";
import LocationFields from "@/components/location/LocationFields";
import PhotoUploadField from "@/components/forms/listing/PhotoUploadField";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaretDown } from "@phosphor-icons/react";
import ServiceFormFields from "@/components/forms/listing/ServiceFormFields";
import RequestFormFields from "@/components/forms/listing/RequestFormFields";
import MarketplaceFormFields from "@/components/forms/listing/MarketplaceFormFields";
import { CATEGORIES_MARKETPLACE, CATEGORIES_REQUESTS, CATEGORIES_SERVICES } from "@/components/filters/categories";
import { useListingForm } from "@/hooks/useListingForm";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from "@/lib/listings/titleDescriptionValidation";

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
    submitMode,
    handleChange,
    handleBusinessToggle,
    handlePreview,
    handleSaveDraft,
    handleSubmit,
    handleCancel,
    closePreview,
    isProfileHydrating,
  } = useListingForm(type);

  const previewPhotos =
    type === "service"
      ? formValues.servicePhotos
      : type === "request"
        ? formValues.requestPhotos
        : formValues.marketplacePhotos;
  const previewImage = previewPhotos?.[0]?.previewUrl ?? null;
  const previewTitle = formValues.title?.trim() || "Untitled listing";
  const previewLocation = [formValues.county, formValues.area].filter(Boolean).join(" • ");
  const previewPrice = formValues.price;
  const titleLength = formValues.title.trim().length;
  const descriptionLength = formValues.description.trim().length;
  const previewDetailsRows = [
    {
      label:
        type === "service"
          ? "Service category"
          : type === "request"
            ? "Request category"
            : "Marketplace category",
      value:
        type === "service"
          ? formValues.serviceCategory
          : type === "request"
            ? formValues.requestCategory
            : formValues.marketplaceCategory,
    },
    {
      label: "Price",
      value:
        formValues.price,
    },
  ];

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
      {isProfileHydrating && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Loading your profile defaults…
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
            <p className="text-xs text-slate-500">
              {titleLength}/{TITLE_MAX_LENGTH} characters (min {TITLE_MIN_LENGTH})
            </p>
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
            <p className="text-xs text-slate-500">
              {descriptionLength}/{DESCRIPTION_MAX_LENGTH} characters (min {DESCRIPTION_MIN_LENGTH})
            </p>
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
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" weight="bold" />
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
              <div className="relative">
                <select
                  id="request-category"
                  className="select field-select pr-10"
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
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" weight="bold" />
              </div>
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
              <div className="relative">
                <select
                  id="marketplace-category"
                  className="select field-select pr-10"
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
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" weight="bold" />
              </div>
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
            <p className="text-xs text-slate-500">
              Pre-filled from your profile. Change it if this listing is located elsewhere.
            </p>
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
            <label htmlFor="contact-display-name" className="field-label">
              Your name *
            </label>
            <input
              id="contact-display-name"
              className="input field-input"
              value={formValues.displayName}
              onChange={(event) => handleChange("displayName", event.target.value)}
              placeholder="Your public name"
              required
            />
            <p className="text-xs text-slate-500">
              Shown publicly on this listing and saved to your profile.
            </p>
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName}</p>
            )}
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
            <p className="text-xs text-slate-500">
              Pre-filled from your account. You can edit this for this listing.
            </p>
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail}</p>
            )}
          </div>

          <div className="field-block">
            <label htmlFor="contact-phone" className="field-label">
              Contact phone
            </label>
            <div className="flex gap-2">
              <select
                className="select field-select w-28"
                value={formValues.contactPhoneCountry}
                onChange={(event) =>
                  handleChange("contactPhoneCountry", event.target.value)
                }
              >
                <option value="+353">Ireland (+353)</option>
                <option value="+44">United Kingdom (+44)</option>
              </select>
              <input
                id="contact-phone"
                className="input field-input"
                value={formValues.contactPhone}
                onChange={(event) => handleChange("contactPhone", event.target.value)}
                placeholder="e.g. 0868672333"
              />
            </div>
            <p className="text-xs text-slate-500">
              Pre-filled from your account. You can edit this for this listing.
            </p>
            {errors.contactPhone && (
              <p className="text-xs text-destructive">{errors.contactPhone}</p>
            )}
          </div>

          <div className="field-block">
            <label className="field-label">Contact preferences</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="business-toggle-row">
                <input
                  type="checkbox"
                  checked={formValues.allowMessages}
                  onChange={(event) => handleChange("allowMessages", event.target.checked)}
                />
                <span>Allow messages</span>
              </label>
              <label className="business-toggle-row">
                <input
                  type="checkbox"
                  checked={formValues.allowEmail}
                  onChange={(event) => handleChange("allowEmail", event.target.checked)}
                />
                <span>Allow email</span>
              </label>
              <label className="business-toggle-row">
                <input
                  type="checkbox"
                  checked={formValues.allowPhone}
                  onChange={(event) => handleChange("allowPhone", event.target.checked)}
                />
                <span>Allow phone</span>
              </label>
            </div>
          </div>
        </section>

        <div className="mt-3 space-y-3">
          {statusMessage && (
            <div className="text-sm text-red-600">
              {statusMessage}
            </div>
          )}
        </div>

        <div className={statusMessage ? "mt-3" : "mt-4"}>
          <div className="grid grid-cols-4 gap-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:text-black"
              onClick={handleCancel}
              disabled={isSubmitting || isProfileHydrating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              onClick={handlePreview}
              disabled={isSubmitting || isProfileHydrating}
            >
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isProfileHydrating}
            >
              {isSubmitting && submitMode === "draft" ? "Saving draft..." : "Save as draft"}
            </Button>
            <Button
              type="submit"
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
              disabled={isSubmitting || isProfileHydrating}
            >
              {isSubmitting && submitMode === "publish" ? "Publishing..." : "Submit listing"}
            </Button>
          </div>
        </div>
      </form>

      {isPreview && (
        <div className="listing-preview-overlay" onClick={closePreview}>
          <Card
            className="listing-preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <CardContent className="listing-preview-body">
              <div className="preview-image-frame">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt={previewTitle}
                    width={760}
                    height={360}
                    sizes="(max-width: 768px) 90vw, 720px"
                    unoptimized
                    className="preview-modal-image"
                  />
                ) : (
                  <div className="preview-image-frame__empty">No image yet</div>
                )}
              </div>
              <div className="listing-preview-meta">
                <div className="listing-preview-meta__main">
                  <CardTitle className="listing-preview-title">{previewTitle}</CardTitle>
                  {previewLocation && (
                    <p className="listing-preview-location">{previewLocation}</p>
                  )}
                </div>
                <div className="listing-preview-meta__price">
                  <span className="listing-preview-price-label">Price</span>
                  <span className="listing-preview-price">{previewPrice || "—"}</span>
                </div>
              </div>
              {formValues.description && (
                <p className="listing-preview-description">{formValues.description}</p>
              )}
              <div className="listing-preview-details">
                {previewDetailsRows
                  .filter((item) => item.value)
                  .map((item) => (
                    <div key={item.label} className="listing-preview-details__row">
                      <span className="listing-preview-details__label">{item.label}</span>
                      <span className="listing-preview-details__value">{item.value}</span>
                    </div>
                  ))}
              </div>
              <div className="listing-preview-contact">
                <span className="listing-preview-contact__label">Contact options</span>
                <div className="listing-preview-contact__badges">
                  {formValues.allowMessages && (
                    <span className="listing-preview-contact__badge">Messages</span>
                  )}
                  {formValues.allowPhone && (
                    <span className="listing-preview-contact__badge">Phone</span>
                  )}
                  {formValues.allowEmail && (
                    <span className="listing-preview-contact__badge">Email</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="listing-preview-footer">
              <Button
                type="button"
                variant="outline"
                className="btn btn-outline"
                onClick={closePreview}
              >
                Close preview
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
