# Findone Project Structure

This document defines the official folder structure for the Findone platform.

## Platform overview

Findone is a SaaS listings platform with 3 public listing sections:

- services
- requests
- marketplace

The platform uses one shared listing engine.

The architecture must be scalable, reusable, and avoid code duplication.

---

## Official route structure

### Services
- /services
- /services/new
- /services/[category]
- /services/[category]/[listingId]

### Requests
- /requests
- /requests/new
- /requests/[category]
- /requests/[category]/[listingId]

### Marketplace
- /marketplace
- /marketplace/new
- /marketplace/[category]
- /marketplace/[category]/[listingId]

### Rules
- Never use `[id]`
- Always use `[listingId]`
- `[category]` must always be before `[listingId]`
- services / requests / marketplace must stay structurally identical

---

## Official project structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    loading.tsx

    services/
      page.tsx
      loading.tsx
      new/
        page.tsx
      [category]/
        page.tsx
        [listingId]/
          page.tsx

    requests/
      page.tsx
      loading.tsx
      new/
        page.tsx
      [category]/
        page.tsx
        [listingId]/
          page.tsx

    marketplace/
      page.tsx
      loading.tsx
      new/
        page.tsx
      [category]/
        page.tsx
        [listingId]/
          page.tsx

    api/
      services/
        route.ts
      requests/
        route.ts
      marketplace/
        route.ts
      turnstile/
        verify/
          route.ts

  components/
    layout/
      Header.tsx
      Footer.tsx
      Container.tsx

    listings/
      ListingCard.tsx
      ListingDetailsPage.tsx
      ListingGallery.tsx
      ListingMeta.tsx
      ListingPrice.tsx
      ListingsGrid.tsx
      ListingsList.tsx
      ListingsPageShell.tsx
      ListingViewToggle.tsx
      ListingBadges.tsx
      ListingPromotedSlot.tsx
      ListingEmptyState.tsx
      ListingSkeletonGrid.tsx
      ListingSkeletonList.tsx

    forms/
      ListingForm.tsx
      ListingImageUploader.tsx
      ListingLocationFields.tsx
      ListingContactFields.tsx
      ListingPhoneVerification.tsx
      ServiceFields.tsx
      RequestFields.tsx
      MarketplaceFields.tsx

    filters/
      ListingFiltersSidebar.tsx
      ListingSortBar.tsx
      CategoryChips.tsx
      CountySelect.tsx
      AreaSelect.tsx

    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      Textarea.tsx
      Badge.tsx
      Modal.tsx
      Spinner.tsx

  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
      storage.ts

    auth/
      getCurrentUser.ts
      requireUser.ts
      getBearerToken.ts

    images/
      uploadDraftImages.ts
      imagePaths.ts
      imageValidation.ts

    listings/
      getListingHref.ts
      getListingTypeLabel.ts
      getListings.ts
      getListingById.ts
      createListing.ts
      updateListing.ts
      deleteListing.ts
      normalizeListing.ts
      listingConfig.ts
      listingSort.ts
      listingBadges.ts
      listingPlacement.ts

    categories/
      serviceCategories.ts
      requestCategories.ts
      marketplaceCategories.ts
      categorySlugMap.ts

    locations/
      counties.ts
      areas.ts
      normalizeLocation.ts

    seo/
      listingMeta.ts
      categoryMeta.ts

    utils/
      slugify.ts
      formatPrice.ts
      formatDate.ts

    types/
      listing.ts
      user.ts

  hooks/
    useListingForm.ts
    usePhoneVerification.ts
    useListingViewMode.ts
    useListingFilters.ts

  constants/
    listingTypes.ts
    sortOptions.ts
    contactPreferences.ts
    listingPromotions.ts