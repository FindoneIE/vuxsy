"use client";

import * as React from "react";
import {
  Link,
  WhatsappLogo,
  FacebookLogo,
  XLogo,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share as ShareIcon } from "@/components/ui/Icon";

type ShareListingPopoverProps = {
  title: string;
  triggerClassName?: string;
};

type ShareItem = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
};

const getShareUrl = (url: string, title: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    messenger: (appId: string) =>
      `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=${appId}&redirect_uri=${encodedUrl}`,
  } as const;
};

export default function ShareListingPopover({ title, triggerClassName }: ShareListingPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const modalContainerClassName =
    "pointer-events-auto z-60 flex w-[calc(100vw-16px)] max-w-md flex-col rounded-lg border border-[#D8DEE8] bg-white overflow-hidden shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-0 max-h-[calc(100vh-24px)] sm:w-full sm:max-w-md sm:max-h-[calc(100vh-48px)] p-0";
  const iconClassName = "h-6 w-6 text-gray-500 transition group-hover:text-[#34579B]";

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const links = React.useMemo(() => getShareUrl(currentUrl, title), [currentUrl, title]);
  const facebookAppId = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID : undefined;

  const handleCopy = React.useCallback(async () => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [currentUrl]);

  const items: ShareItem[] = [
    {
      key: "copy",
      label: copied ? "Link copied" : "Copy link",
      onClick: handleCopy,
  icon: <Link size={24} weight="regular" className={iconClassName} />,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: links.whatsapp,
  icon: <WhatsappLogo size={24} weight="regular" className={iconClassName} />,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: links.facebook,
  icon: <FacebookLogo size={24} weight="regular" className={iconClassName} />,
    },
    ...(facebookAppId
      ? [
          {
            key: "messenger",
            label: "Messenger",
            href: links.messenger(facebookAppId),
            icon: <FacebookLogo size={24} weight="regular" className={iconClassName} />,
          },
        ]
      : []),
    {
      key: "twitter",
      label: "X",
      href: links.twitter,
  icon: <XLogo size={24} weight="regular" className={iconClassName} />,
    },
    {
      key: "email",
      label: "Email",
      href: links.email,
  icon: <EnvelopeSimple size={24} weight="regular" className={iconClassName} />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Share listing"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <ShareIcon className="h-5 w-5" weight="regular" />
      </button>
      <DialogContent
        className={modalContainerClassName}
        overlayClassName="bg-[rgba(15,23,42,0.35)] backdrop-blur-[4px]"
      >
        <DialogHeader className="shrink-0 border-b border-[#E1E6EF] bg-[#F4F6FA] px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Share this listing
          </DialogTitle>
          <p className="text-sm text-slate-500">Choose a method</p>
        </DialogHeader>

  <div className="flex min-h-0 flex-1 flex-col space-y-2 px-6 pb-6 pt-5">
          {items.map((item) => {
            const content = (
              <div className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#34579B] hover:bg-[#F4F6FA]">
                {item.icon}
                <span>{item.label}</span>
              </div>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className="text-left"
                >
                  <div
                    className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#34579B] hover:bg-[#F4F6FA]"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            }

            return (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="text-left"
              >
                {content}
              </a>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
