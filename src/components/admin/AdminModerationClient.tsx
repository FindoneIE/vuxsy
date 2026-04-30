"use client";

import * as React from "react";
import Link from "next/link";
import { getListingHref } from "@/lib/listings/getListingHref";
import type { ListingType } from "@/types/listing";
import AdminReportActionForm from "@/components/admin/AdminReportActionForm";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  ignored: "bg-slate-100 text-slate-600",
};

type ListingReport = {
  id: string;
  listing_id: string;
  user_id: string;
  reason: string;
  details?: string | null;
  created_at: string;
  status?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role?: string | null;
  created_at?: string | null;
  is_banned?: boolean | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  user_id: string | null;
  created_at: string | null;
  promotion_status: string | null;
  status: string | null;
};

type ReportListingMeta = {
  title: string | null;
  listing_type: ListingType | null;
  category_id: string | null;
};

type AdminAuditLog = {
  id: string;
  actor_id: string | null;
  actor_email?: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};
const actionCategories = ["delete", "ban", "warn", "ignore"] as const;

const getAuditCategory = (action: string) => {
  if (action.startsWith("delete")) return "delete";
  if (action.startsWith("ban")) return "ban";
  if (action.startsWith("warn")) return "warn";
  if (action.startsWith("ignore")) return "ignore";
  return "other";
};

const actionBadgeStyles: Record<string, string> = {
  delete: "bg-rose-100 text-rose-700",
  ban: "bg-rose-100 text-rose-700",
  warn: "bg-amber-100 text-amber-700",
  ignore: "bg-slate-200 text-slate-600",
  other: "bg-slate-100 text-slate-600",
};

const buttonBase =
  "inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold transition-all duration-150";
const buttonPrimary = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`;
const buttonDanger = `${buttonBase} bg-rose-500 text-white hover:bg-rose-600`;
const buttonWarning = `${buttonBase} bg-amber-500 text-white hover:bg-amber-600`;
const buttonSecondary = `${buttonBase} bg-slate-200 text-slate-700 hover:bg-slate-300`;



type AdminModerationData = {
  reports: ListingReport[];
  profiles: ProfileRow[];
  profilesCount: number;
  listings: ListingRow[];
  listingCounts: Record<string, number>;
  listingMetaById: Record<string, ReportListingMeta>;
  reporterEmailById: Record<string, string | null>;
  profileEmailById: Record<string, string | null>;
  auditLogs: AdminAuditLog[];
  currentRole: "admin" | "moderator";
};

type AdminModerationActions = {
  deleteListingAction: (formData: FormData) => Promise<void>;
  deleteReportAction: (formData: FormData) => Promise<void>;
  ignoreReportAction: (formData: FormData) => Promise<void>;
  warnUserAction: (formData: FormData) => Promise<void>;
  banUserAction: (formData: FormData) => Promise<void>;
  deleteUserAction: (formData: FormData) => Promise<void>;
  deactivateListingAction: (formData: FormData) => Promise<void>;
  removePromotionAction: (formData: FormData) => Promise<void>;
  bulkResolveReportsAction: (reportIds: string[]) => Promise<void>;
  bulkIgnoreReportsAction: (reportIds: string[]) => Promise<void>;
  bulkWarnUsersAction: (userIds: string[]) => Promise<void>;
  bulkBanUsersAction: (userIds: string[]) => Promise<void>;
  bulkDeactivateListingsAction: (listingIds: string[]) => Promise<void>;
  bulkRemovePromotionsAction: (listingIds: string[]) => Promise<void>;
};

type AdminModerationClientProps = {
  data: AdminModerationData;
  actions: AdminModerationActions;
};

const normalizeStatus = (status?: string | null) => {
  if (status === "reviewed" || status === "resolved") {
    return "resolved";
  }
  if (status === "ignored") {
    return "ignored";
  }
  return "pending";
};

const buildFormData = (entries: Array<[string, string]>) => {
  const formData = new FormData();
  entries.forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

export default function AdminModerationClient({ data, actions }: AdminModerationClientProps) {
  const { addToast } = useToast();
  const [reportSearch, setReportSearch] = React.useState("");
  const [reportStatus, setReportStatus] = React.useState("pending");
  const [reportEmailFilter, setReportEmailFilter] = React.useState("");
  const [reportListingFilter, setReportListingFilter] = React.useState("");
  const [hasReportFiltersChanged, setHasReportFiltersChanged] = React.useState(false);
  const [reportPage, setReportPage] = React.useState(1);
  const [selectedReportIds, setSelectedReportIds] = React.useState<Set<string>>(new Set());

  const [userSearch, setUserSearch] = React.useState("");
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string>>(new Set());
  const [userPage, setUserPage] = React.useState(1);

  const [listingSearch, setListingSearch] = React.useState("");
  const [selectedListingIds, setSelectedListingIds] = React.useState<Set<string>>(new Set());
  const [listingPage, setListingPage] = React.useState(1);

  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [auditActionFilter, setAuditActionFilter] = React.useState("all");
  const [auditDateFilter, setAuditDateFilter] = React.useState("");
  const [auditPage, setAuditPage] = React.useState(1);
  const [expandedAuditIds, setExpandedAuditIds] = React.useState<Set<string>>(new Set());
  const [isActionPending, setIsActionPending] = React.useState(false);


  const reportSearchValue = reportSearch.trim().toLowerCase();
  const reportEmailValue = reportEmailFilter.trim().toLowerCase();
  const reportListingValue = reportListingFilter.trim().toLowerCase();
  const userSearchValue = userSearch.trim().toLowerCase();
  const listingSearchValue = listingSearch.trim().toLowerCase();
  const pageSize = 20;

  const filteredReports = React.useMemo(() => {
    return data.reports.filter((report) => {
      const normalizedStatus = normalizeStatus(report.status);
      if (reportStatus !== "all" && normalizedStatus !== reportStatus) {
        return false;
      }

      const listingMeta = data.listingMetaById[report.listing_id];
      const listingTitle = listingMeta?.title ?? report.listing_id;
      const reporterEmail = data.reporterEmailById[report.user_id] ?? report.user_id;

      if (reportEmailValue && !reporterEmail.toLowerCase().includes(reportEmailValue)) {
        return false;
      }

      if (reportListingValue && !listingTitle.toLowerCase().includes(reportListingValue)) {
        return false;
      }

      if (reportSearchValue) {
        const haystack = [
          listingTitle,
          report.reason,
          report.details ?? "",
          reporterEmail,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(reportSearchValue)) {
          return false;
        }
      }

      return true;
    });
  }, [
    data.listingMetaById,
    data.reporterEmailById,
    data.reports,
    reportEmailValue,
    reportListingValue,
    reportSearchValue,
    reportStatus,
  ]);


  const filteredUsers = React.useMemo(() => {
    return data.profiles.filter((profile) => {
      const email = profile.email ?? "";
      if (!userSearchValue) return true;
      return email.toLowerCase().includes(userSearchValue);
    });
  }, [data.profiles, userSearchValue]);


  const filteredListings = React.useMemo(() => {
    return data.listings.filter((listing) => {
      const haystack = `${listing.title ?? ""} ${listing.user_id ?? ""}`.toLowerCase();
      if (!listingSearchValue) return true;
      return haystack.includes(listingSearchValue);
    });
  }, [data.listings, listingSearchValue]);


  const reportTotalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const listingTotalPages = Math.max(1, Math.ceil(filteredListings.length / pageSize));

  const paginatedReports = filteredReports.slice(
    (reportPage - 1) * pageSize,
    reportPage * pageSize
  );
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * pageSize,
    userPage * pageSize
  );
  const paginatedListings = filteredListings.slice(
    (listingPage - 1) * pageSize,
    listingPage * pageSize
  );

  const filteredAuditLogs = React.useMemo(() => {
    const normalizedDateFilter = auditDateFilter ? auditDateFilter.trim() : "";
    return [...data.auditLogs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((log) => {
        if (auditActionFilter !== "all") {
          const category = getAuditCategory(log.action);
          if (category !== auditActionFilter) {
            return false;
          }
        }
        if (normalizedDateFilter) {
          const logDate = new Date(log.created_at).toISOString().slice(0, 10);
          if (logDate !== normalizedDateFilter) {
            return false;
          }
        }
        return true;
      });
  }, [auditActionFilter, auditDateFilter, data.auditLogs]);

  const auditActions = React.useMemo(() => actionCategories, []);

  const auditTotalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));
  const paginatedAuditLogs = filteredAuditLogs.slice(
    (auditPage - 1) * pageSize,
    auditPage * pageSize
  );

  const handleExportAuditCsv = () => {
    if (filteredAuditLogs.length === 0) return;
    const header = ["action", "target_type", "actor_email", "created_at"].join(",");
    const rows = filteredAuditLogs.map((log) => {
      const actorEmail =
        log.actor_email ?? data.profileEmailById[log.actor_id ?? ""] ?? log.actor_id ?? "system";
      const values = [
        log.action,
        log.target_type ?? "",
        actorEmail,
        log.created_at,
      ].map((value) => {
        const safeValue = value.replace(/\"/g, '""');
        return `"${safeValue}"`;
      });
      return values.join(",");
    });
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const allReportsSelected =
    paginatedReports.length > 0 &&
    paginatedReports.every((report) => selectedReportIds.has(report.id));
  const allUsersSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((profile) => selectedUserIds.has(profile.id));
  const allListingsSelected =
    paginatedListings.length > 0 &&
    paginatedListings.every((listing) => selectedListingIds.has(listing.id));

  const toggleAuditDetails = (logId: string) => {
    setExpandedAuditIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const runFormAction = React.useCallback(
    async (
      action: (formData: FormData) => Promise<void>,
      entries: Array<[string, string]>,
      successMessage: string
    ) => {
      if (isActionPending) return;
      setIsActionPending(true);
      try {
        await action(buildFormData(entries));
        window.dispatchEvent(new CustomEvent("admin-reports-updated"));
        addToast({
          title: "Success",
          message: successMessage,
          type: "success",
        });
      } catch (error) {
        addToast({
          title: "Action failed",
          message: "Action failed",
          type: "error",
        });
        console.error("ADMIN ACTION ERROR", error);
      } finally {
        setIsActionPending(false);
      }
    },
    [addToast, isActionPending]
  );

  const toggleSelection = (setState: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const setAllSelected = (
    setState: React.Dispatch<React.SetStateAction<Set<string>>>,
    ids: string[],
    checked: boolean
  ) => {
    setState(checked ? new Set(ids) : new Set());
  };

  const activeUser = data.profiles.find((profile) => profile.id === activeUserId) ?? null;

  const handleBulkAction = (
    action: (ids: string[]) => Promise<void>,
    ids: string[],
    clear: () => void,
    successMessage: string
  ) => {
    if (isActionPending) return;
    setIsActionPending(true);
    startTransition(async () => {
      try {
        await action(ids);
        clear();
        addToast({
          title: "Success",
          message: successMessage,
          type: "success",
        });
      } catch (error) {
        addToast({
          title: "Action failed",
          message: "Action failed",
          type: "error",
        });
        console.error("ADMIN BULK ACTION ERROR", error);
      } finally {
        setIsActionPending(false);
      }
    });
  };

  const runBulkAction = async (
    action: (ids: string[]) => Promise<void>,
    ids: string[],
    clear: () => void,
    successMessage: string
  ) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      await action(ids);
      clear();
      addToast({
        title: "Success",
        message: successMessage,
        type: "success",
      });
    } catch (error) {
      addToast({
        title: "Action failed",
        message: "Action failed",
        type: "error",
      });
      console.error("ADMIN BULK ACTION ERROR", error);
    } finally {
      setIsActionPending(false);
    }
  };

  const isAdmin = data.currentRole === "admin";

  return (
    <div className="mt-4 space-y-6 sm:mt-6 sm:space-y-10">
      <section id="reports" className="w-full space-y-2 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reports</h2>
            <p className="text-sm text-slate-500">Pending moderation reports.</p>
          </div>
          <span className="text-xs text-slate-500">{filteredReports.length} results</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Page {reportPage} of {reportTotalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={buttonSecondary}
              onClick={() => setReportPage((prev) => Math.max(1, prev - 1))}
              disabled={reportPage === 1}
            >
              Prev
            </button>
            <button
              className={buttonSecondary}
              onClick={() => setReportPage((prev) => Math.min(reportTotalPages, prev + 1))}
              disabled={reportPage === reportTotalPages}
            >
              Next
            </button>
          </div>
        </div>

  <div className="grid gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-sm transition-all duration-200 sm:p-4 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Status</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 font-normal"
              value={reportStatus || "pending"}
              onChange={(event) => {
                setReportStatus(event.target.value || "pending");
                setHasReportFiltersChanged(true);
                setReportPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Reporter email</span>
            <input
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
              placeholder="Filter by email"
              value={reportEmailFilter}
              onChange={(event) => {
                setReportEmailFilter(event.target.value);
                setHasReportFiltersChanged(true);
                setReportPage(1);
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Listing</span>
            <input
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
              placeholder="Filter by listing"
              value={reportListingFilter}
              onChange={(event) => {
                setReportListingFilter(event.target.value);
                setHasReportFiltersChanged(true);
                setReportPage(1);
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Search reports</span>
            <input
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
              placeholder="Search reports"
              value={reportSearch}
              onChange={(event) => {
                setReportSearch(event.target.value);
                setHasReportFiltersChanged(true);
                setReportPage(1);
              }}
            />
          </label>
        </div>

        {selectedReportIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-sm transition-all duration-200">
            <span className="text-xs font-semibold uppercase text-slate-400">
              {selectedReportIds.size} selected
            </span>
            <button
              className={buttonPrimary}
              onClick={() =>
                handleBulkAction(
                  actions.bulkResolveReportsAction,
                  Array.from(selectedReportIds),
                  () => setSelectedReportIds(new Set()),
                  "Reports resolved"
                )
              }
              disabled={isPending || isActionPending}
            >
              Mark resolved
            </button>
            <button
              className={buttonSecondary}
              onClick={() =>
                handleBulkAction(
                  actions.bulkIgnoreReportsAction,
                  Array.from(selectedReportIds),
                  () => setSelectedReportIds(new Set()),
                  "Reports ignored"
                )
              }
              disabled={isPending || isActionPending}
            >
              Ignore
            </button>
          </div>
        ) : null}

        {filteredReports.length === 0 && hasReportFiltersChanged ? (
          <p className="text-sm text-slate-500">No reports found.</p>
        ) : (
          <div className="space-y-2">
            <div className="space-y-2 md:hidden">
              {paginatedReports.map((report) => {
                const listingMeta = data.listingMetaById[report.listing_id];
                const listingHref = listingMeta
                  ? getListingHref({
                      id: report.listing_id,
                      type: listingMeta.listing_type ?? undefined,
                      category: listingMeta.category_id ?? undefined,
                    })
                  : null;
                const listingTitle = listingMeta?.title ?? report.listing_id;
                const reporterEmail = data.reporterEmailById[report.user_id] ?? report.user_id;
                const normalizedStatus = normalizeStatus(report.status);

                return (
                  <div
                    key={report.id}
                    className="w-full rounded-2xl border border-slate-200/70 bg-white px-2 py-2 transition-all duration-200 hover:border-slate-200 sm:p-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-slate-600"
                            checked={selectedReportIds.has(report.id)}
                            onChange={() => toggleSelection(setSelectedReportIds, report.id)}
                          />
                          Select
                        </label>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            statusStyles[normalizedStatus]
                          }`}
                        >
                          {normalizedStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Listing</p>
                        {listingHref ? (
                          <Link
                            href={listingHref}
                            className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2"
                          >
                            {listingTitle}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-slate-900">{listingTitle}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Reason</p>
                        <p className="text-sm text-slate-700">{report.reason}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Message</p>
                        <p className="text-sm text-slate-700">{report.details ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Reporter</p>
                        <p className="text-sm text-slate-700">{reporterEmail}</p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-400">Created</p>
                          <p className="text-sm text-slate-600">
                            {report.created_at ? new Date(report.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-row flex-wrap items-center gap-2">
                      <ConfirmActionDialog
                        title="Delete listing"
                        description="This listing will be permanently removed."
                        confirmLabel="Delete listing"
                        confirmTone="danger"
                        onConfirm={() =>
                          runFormAction(actions.deleteListingAction, [
                            ["listingId", report.listing_id],
                          ], "Listing deleted successfully")
                        }
                        trigger={
                          <button className={buttonDanger}>
                            Delete
                          </button>
                        }
                        disabled={!isAdmin || isActionPending}
                      />
                      <ConfirmActionDialog
                        title="Delete report"
                        description="This report will be permanently removed."
                        confirmLabel="Delete report"
                        confirmTone="danger"
                        onConfirm={() =>
                          runFormAction(
                            actions.deleteReportAction,
                            [["reportId", report.id]],
                            "Report deleted"
                          )
                        }
                        trigger={
                          <button className={buttonDanger}>
                            Delete report
                          </button>
                        }
                        disabled={!isAdmin || isActionPending}
                      />
                        <AdminReportActionForm
                        action={actions.warnUserAction}
                        successToast={{ title: "Success", message: "User warned" }}
                        errorToast={{ title: "Action failed", message: "Action failed" }}
                      >
                        <input type="hidden" name="userId" value={report.user_id} />
                        <input type="hidden" name="reportId" value={report.id} />
                        <input
                          type="hidden"
                          name="reason"
                          value={`Report on listing ${report.listing_id}`}
                        />
                        <button className={buttonWarning}>
                          Warn
                        </button>
                      </AdminReportActionForm>
                      <AdminReportActionForm
                        action={actions.ignoreReportAction}
                        successToast={{ title: "Success", message: "Report ignored" }}
                        errorToast={{ title: "Action failed", message: "Action failed" }}
                      >
                        <input type="hidden" name="reportId" value={report.id} />
                        <button className={buttonSecondary}>
                          Ignore
                        </button>
                      </AdminReportActionForm>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white transition-all duration-200">
                <table className="min-w-225 w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr className="text-left">
                      <th className="px-4 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-slate-600"
                          checked={allReportsSelected}
                          onChange={(event) =>
                            setAllSelected(
                              setSelectedReportIds,
                              paginatedReports.map((report) => report.id),
                              event.target.checked
                            )
                          }
                        />
                      </th>
                      <th className="px-4 py-2">Listing</th>
                      <th className="px-4 py-2">Reason</th>
                      <th className="px-4 py-2">Message</th>
                      <th className="px-4 py-2">Reporter</th>
                      <th className="px-4 py-2">Created</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedReports.map((report) => {
                      const listingMeta = data.listingMetaById[report.listing_id];
                      const listingHref = listingMeta
                        ? getListingHref({
                            id: report.listing_id,
                            type: listingMeta.listing_type ?? undefined,
                            category: listingMeta.category_id ?? undefined,
                          })
                        : null;
                      const listingTitle = listingMeta?.title ?? report.listing_id;
                      const reporterEmail = data.reporterEmailById[report.user_id] ?? report.user_id;
                      const normalizedStatus = normalizeStatus(report.status);

                      return (
                        <tr key={report.id} className="text-slate-600 transition-colors duration-200 hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-600"
                              checked={selectedReportIds.has(report.id)}
                              onChange={() => toggleSelection(setSelectedReportIds, report.id)}
                            />
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-900">
                            {listingHref ? (
                              <Link
                                href={listingHref}
                                className="underline decoration-slate-300 underline-offset-2 hover:text-slate-950"
                              >
                                {listingTitle}
                              </Link>
                            ) : (
                              <span>{listingTitle}</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{report.reason}</td>
                          <td className="px-4 py-2 max-w-60 wrap-break-word">
                            {report.details ?? "—"}
                          </td>
                          <td className="px-4 py-2 max-w-55 wrap-break-word">{reporterEmail}</td>
                          <td className="px-4 py-2 text-slate-500">
                            {report.created_at ? new Date(report.created_at).toLocaleString() : ""}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                statusStyles[normalizedStatus]
                              }`}
                            >
                              {normalizedStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-row flex-wrap items-center gap-2 md:flex-nowrap">
                              <ConfirmActionDialog
                                title="Delete listing"
                                description="This listing will be permanently removed."
                                confirmLabel="Delete listing"
                                confirmTone="danger"
                                onConfirm={() =>
                                  runFormAction(actions.deleteListingAction, [
                                    ["listingId", report.listing_id],
                                  ], "Listing deleted successfully")
                                }
                                trigger={
                                  <button className={buttonDanger}>
                                    Delete
                                  </button>
                                }
                                disabled={!isAdmin}
                              />
                              <ConfirmActionDialog
                                title="Delete report"
                                description="This report will be permanently removed."
                                confirmLabel="Delete report"
                                confirmTone="danger"
                                onConfirm={() =>
                                  runFormAction(
                                    actions.deleteReportAction,
                                    [["reportId", report.id]],
                                    "Report deleted"
                                  )
                                }
                                trigger={
                                  <button className={buttonDanger}>
                                    Delete report
                                  </button>
                                }
                                disabled={!isAdmin}
                              />
                              <AdminReportActionForm
                                action={actions.warnUserAction}
                                successToast={{ title: "Success", message: "User warned" }}
                                errorToast={{ title: "Action failed", message: "Action failed" }}
                              >
                                <input type="hidden" name="userId" value={report.user_id} />
                                <input type="hidden" name="reportId" value={report.id} />
                                <input
                                  type="hidden"
                                  name="reason"
                                  value={`Report on listing ${report.listing_id}`}
                                />
                                <button className={buttonWarning}>
                                  Warn
                                </button>
                              </AdminReportActionForm>
                              <AdminReportActionForm
                                action={actions.ignoreReportAction}
                                successToast={{ title: "Success", message: "Report ignored" }}
                                errorToast={{ title: "Action failed", message: "Action failed" }}
                              >
                                <input type="hidden" name="reportId" value={report.id} />
                                <button className={buttonSecondary}>
                                  Ignore
                                </button>
                              </AdminReportActionForm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="users" className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            <p className="text-sm text-slate-500">Recent signups and flags.</p>
          </div>
          <span className="text-xs text-slate-500">{filteredUsers.length} results</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Page {userPage} of {userTotalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={buttonSecondary}
              onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
              disabled={userPage === 1}
            >
              Prev
            </button>
            <button
              className={buttonSecondary}
              onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
              disabled={userPage === userTotalPages}
            >
              Next
            </button>
          </div>
        </div>

  <div className="grid gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-sm transition-all duration-200 sm:p-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Search users</span>
            <input
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
              placeholder="Search by email"
              value={userSearch}
              onChange={(event) => {
                setUserSearch(event.target.value);
                setUserPage(1);
              }}
            />
          </label>
          <div className="flex items-end gap-2">
            {selectedUserIds.size > 0 ? (
              <span className="text-xs font-semibold uppercase text-slate-400">
                {selectedUserIds.size} selected
              </span>
            ) : null}
            {selectedUserIds.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonWarning}
                  onClick={() =>
                    handleBulkAction(
                      actions.bulkWarnUsersAction,
                      Array.from(selectedUserIds),
                      () => setSelectedUserIds(new Set()),
                      "Users warned"
                    )
                  }
                  disabled={isPending || isActionPending}
                >
                  Warn
                </button>
                <ConfirmActionDialog
                  title="Ban users"
                  description="Selected users will be banned."
                  confirmLabel="Ban users"
                  confirmTone="danger"
                  onConfirm={() =>
                    runBulkAction(
                      actions.bulkBanUsersAction,
                      Array.from(selectedUserIds),
                      () => setSelectedUserIds(new Set()),
                      "User banned successfully"
                    )
                  }
                  trigger={
                    <button className={buttonDanger}>
                      Ban
                    </button>
                  }
                  disabled={!isAdmin || isActionPending}
                />
              </div>
            ) : null}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 md:hidden">
              {paginatedUsers.map((profile) => (
                <div
                  key={profile.id}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white p-3 transition-all duration-200 hover:border-slate-200 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-slate-600"
                        checked={selectedUserIds.has(profile.id)}
                        onChange={() => toggleSelection(setSelectedUserIds, profile.id)}
                      />
                      Select
                    </label>
                    <button
                      className="text-xs font-semibold text-slate-600"
                      onClick={() => setActiveUserId(profile.id)}
                    >
                      View
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Email</p>
                      <p className="text-sm font-medium text-slate-900">{profile.email ?? "—"}</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Created</p>
                        <p className="text-sm text-slate-600">
                          {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Listings</p>
                        <p className="text-sm text-slate-600">
                          {data.listingCounts[profile.id] ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Role</p>
                        <p className="text-sm text-slate-600">{profile.role ?? "user"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-row flex-wrap items-center gap-2">
                    <ConfirmActionDialog
                      title="Ban user"
                      description="This user will be banned from the platform."
                      confirmLabel="Ban user"
                      confirmTone="danger"
                      onConfirm={() =>
                        runFormAction(actions.banUserAction, [["userId", profile.id]], "User banned successfully")
                      }
                      trigger={
                        <button
                          className={buttonDanger}
                          disabled={!isAdmin}
                        >
                          {profile.is_banned ? "Banned" : "Ban user"}
                        </button>
                      }
                      disabled={!isAdmin || isActionPending}
                    />
                    <AdminReportActionForm
                      action={actions.warnUserAction}
                      successToast={{ title: "Success", message: "User warned" }}
                      errorToast={{ title: "Action failed", message: "Action failed" }}
                    >
                      <input type="hidden" name="userId" value={profile.id} />
                      <input type="hidden" name="reason" value="Admin warning" />
                      <button className={buttonWarning}>
                        Warn
                      </button>
                    </AdminReportActionForm>
                    <ConfirmActionDialog
                      title="Delete user"
                      description="This will delete the user and their listings."
                      confirmLabel="Delete user"
                      confirmTone="danger"
                      onConfirm={() =>
                        runFormAction(actions.deleteUserAction, [["userId", profile.id]], "User deleted successfully")
                      }
                      trigger={
                        <button className={buttonDanger}>
                          Delete user
                        </button>
                      }
                      disabled={!isAdmin || isActionPending}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white transition-all duration-200">
                <table className="min-w-225 w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr className="text-left">
                      <th className="px-4 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-slate-600"
                          checked={allUsersSelected}
                          onChange={(event) =>
                            setAllSelected(
                              setSelectedUserIds,
                              paginatedUsers.map((profile) => profile.id),
                              event.target.checked
                            )
                          }
                        />
                      </th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Created</th>
                      <th className="px-4 py-2">Listings</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map((profile) => (
                      <tr key={profile.id} className="text-slate-600 transition-colors duration-200 hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-slate-600"
                            checked={selectedUserIds.has(profile.id)}
                            onChange={() => toggleSelection(setSelectedUserIds, profile.id)}
                          />
                        </td>
                        <td className="px-4 py-2 max-w-60 wrap-break-word font-medium text-slate-900">
                          {profile.email ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}
                        </td>
                        <td className="px-4 py-2">{data.listingCounts[profile.id] ?? 0}</td>
                        <td className="px-4 py-2">{profile.role ?? "user"}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-row flex-wrap items-center gap-2 md:flex-nowrap">
                            <button
                              className={buttonSecondary}
                              onClick={() => setActiveUserId(profile.id)}
                            >
                              View
                            </button>
                            <ConfirmActionDialog
                              title="Ban user"
                              description="This user will be banned from the platform."
                              confirmLabel="Ban user"
                              confirmTone="danger"
                              onConfirm={() =>
                                runFormAction(
                                  actions.banUserAction,
                                  [["userId", profile.id]],
                                  "User banned successfully"
                                )
                              }
                              trigger={
                                <button
                                  className={buttonDanger}
                                  disabled={!isAdmin}
                                >
                                  {profile.is_banned ? "Banned" : "Ban user"}
                                </button>
                              }
                              disabled={!isAdmin}
                            />
                            <AdminReportActionForm
                              action={actions.warnUserAction}
                              successToast={{ title: "Success", message: "User warned" }}
                              errorToast={{ title: "Action failed", message: "Action failed" }}
                            >
                              <input type="hidden" name="userId" value={profile.id} />
                              <input type="hidden" name="reason" value="Admin warning" />
                              <button className={buttonWarning}>
                                Warn
                              </button>
                            </AdminReportActionForm>
                            <ConfirmActionDialog
                              title="Delete user"
                              description="This will delete the user and their listings."
                              confirmLabel="Delete user"
                              confirmTone="danger"
                              onConfirm={() =>
                                runFormAction(
                                  actions.deleteUserAction,
                                  [["userId", profile.id]],
                                  "User deleted successfully"
                                )
                              }
                              trigger={
                                <button className={buttonDanger}>
                                  Delete user
                                </button>
                              }
                              disabled={!isAdmin}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="listings" className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Listings</h2>
            <p className="text-sm text-slate-500">Recent listings and promotion status.</p>
          </div>
          <span className="text-xs text-slate-500">{filteredListings.length} results</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Page {listingPage} of {listingTotalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={buttonSecondary}
              onClick={() => setListingPage((prev) => Math.max(1, prev - 1))}
              disabled={listingPage === 1}
            >
              Prev
            </button>
            <button
              className={buttonSecondary}
              onClick={() => setListingPage((prev) => Math.min(listingTotalPages, prev + 1))}
              disabled={listingPage === listingTotalPages}
            >
              Next
            </button>
          </div>
        </div>

  <div className="grid gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-sm transition-all duration-200 sm:p-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Search listings</span>
            <input
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
              placeholder="Search by title or user"
              value={listingSearch}
              onChange={(event) => {
                setListingSearch(event.target.value);
                setListingPage(1);
              }}
            />
          </label>
          <div className="flex items-end gap-2">
            {selectedListingIds.size > 0 ? (
              <span className="text-xs font-semibold uppercase text-slate-400">
                {selectedListingIds.size} selected
              </span>
            ) : null}
            {selectedListingIds.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() =>
                    handleBulkAction(
                      actions.bulkDeactivateListingsAction,
                      Array.from(selectedListingIds),
                      () => setSelectedListingIds(new Set()),
                      "Listings deactivated"
                    )
                  }
                  disabled={isPending || isActionPending}
                >
                  Deactivate
                </button>
                <button
                  className={buttonSecondary}
                  onClick={() =>
                    handleBulkAction(
                      actions.bulkRemovePromotionsAction,
                      Array.from(selectedListingIds),
                      () => setSelectedListingIds(new Set()),
                      "Promotions removed"
                    )
                  }
                  disabled={isPending || isActionPending}
                >
                  Remove promo
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {filteredListings.length === 0 ? (
          <p className="text-sm text-slate-500">No listings found.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 md:hidden">
              {paginatedListings.map((listing) => (
                <div
                  key={listing.id}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white p-3 transition-all duration-200 hover:border-slate-200 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-slate-600"
                        checked={selectedListingIds.has(listing.id)}
                        onChange={() => toggleSelection(setSelectedListingIds, listing.id)}
                      />
                      Select
                    </label>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Title</p>
                      <p className="text-sm font-medium text-slate-900">{listing.title ?? "Untitled"}</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">User</p>
                        <p className="text-sm text-slate-600">{listing.user_id ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Created</p>
                        <p className="text-sm text-slate-600">
                          {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Promotion</p>
                        <p className="text-sm text-slate-600">{listing.promotion_status ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-row flex-wrap items-center gap-2">
                    <ConfirmActionDialog
                      title="Delete listing"
                      description="This listing will be permanently removed."
                      confirmLabel="Delete"
                      confirmTone="danger"
                      onConfirm={() =>
                        runFormAction(actions.deleteListingAction, [["listingId", listing.id]], "Listing deleted successfully")
                      }
                      trigger={
                        <button className={buttonDanger}>
                          Delete
                        </button>
                      }
                      disabled={!isAdmin || isActionPending}
                    />
                    <AdminReportActionForm
                      action={actions.deactivateListingAction}
                      successToast={{ title: "Success", message: "Listing deactivated" }}
                      errorToast={{ title: "Action failed", message: "Action failed" }}
                    >
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button className={buttonSecondary}>
                        Deactivate
                      </button>
                    </AdminReportActionForm>
                    <AdminReportActionForm
                      action={actions.removePromotionAction}
                      successToast={{ title: "Success", message: "Promotion removed" }}
                      errorToast={{ title: "Action failed", message: "Action failed" }}
                    >
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button className={buttonSecondary}>
                        Remove promo
                      </button>
                    </AdminReportActionForm>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white transition-all duration-200">
                <table className="min-w-225 w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr className="text-left">
                      <th className="px-4 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-slate-600"
                          checked={allListingsSelected}
                          onChange={(event) =>
                            setAllSelected(
                              setSelectedListingIds,
                              paginatedListings.map((listing) => listing.id),
                              event.target.checked
                            )
                          }
                        />
                      </th>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">Created</th>
                      <th className="px-4 py-2">Promotion</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedListings.map((listing) => (
                      <tr key={listing.id} className="text-slate-600 transition-colors duration-200 hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-slate-600"
                            checked={selectedListingIds.has(listing.id)}
                            onChange={() => toggleSelection(setSelectedListingIds, listing.id)}
                          />
                        </td>
                        <td className="px-4 py-2 max-w-65 wrap-break-word font-medium text-slate-900">
                          {listing.title ?? "Untitled"}
                        </td>
                        <td className="px-4 py-2">{listing.user_id ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ""}
                        </td>
                        <td className="px-4 py-2">{listing.promotion_status ?? "—"}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-row flex-wrap items-center gap-2 md:flex-nowrap">
                            <ConfirmActionDialog
                              title="Delete listing"
                              description="This listing will be permanently removed."
                              confirmLabel="Delete"
                              confirmTone="danger"
                              onConfirm={() =>
                                runFormAction(
                                  actions.deleteListingAction,
                                  [["listingId", listing.id]],
                                  "Listing deleted successfully"
                                )
                              }
                              trigger={
                                <button className={buttonDanger}>
                                  Delete
                                </button>
                              }
                              disabled={!isAdmin || isActionPending}
                            />
                            <AdminReportActionForm
                              action={actions.deactivateListingAction}
                              successToast={{ title: "Success", message: "Listing deactivated" }}
                              errorToast={{ title: "Action failed", message: "Action failed" }}
                            >
                              <input type="hidden" name="listingId" value={listing.id} />
                              <button className={buttonSecondary}>
                                Deactivate
                              </button>
                            </AdminReportActionForm>
                            <AdminReportActionForm
                              action={actions.removePromotionAction}
                              successToast={{ title: "Success", message: "Promotion removed" }}
                              errorToast={{ title: "Action failed", message: "Action failed" }}
                            >
                              <input type="hidden" name="listingId" value={listing.id} />
                              <button className={buttonSecondary}>
                                Remove promo
                              </button>
                            </AdminReportActionForm>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="audit-logs" className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Audit Logs</h2>
            <p className="text-sm text-slate-500">Track admin activity and changes.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{filteredAuditLogs.length} entries</span>
            <button
              className={buttonSecondary}
              onClick={handleExportAuditCsv}
              disabled={filteredAuditLogs.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Page {auditPage} of {auditTotalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={buttonSecondary}
              onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
              disabled={auditPage === 1}
            >
              Prev
            </button>
            <button
              className={buttonSecondary}
              onClick={() => setAuditPage((prev) => Math.min(auditTotalPages, prev + 1))}
              disabled={auditPage === auditTotalPages}
            >
              Next
            </button>
          </div>
        </div>

  <div className="grid gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 text-sm transition-all duration-200 sm:p-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Action</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 font-normal"
              value={auditActionFilter}
              onChange={(event) => {
                setAuditActionFilter(event.target.value || "all");
                setAuditPage(1);
              }}
            >
              <option value="all">All actions</option>
              {auditActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-400">Date</span>
            <input
              type="date"
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
              value={auditDateFilter}
              onChange={(event) => {
                setAuditDateFilter(event.target.value);
                setAuditPage(1);
              }}
            />
          </label>
        </div>

        {filteredAuditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">No audit entries found.</p>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white transition-all duration-200">
            <table className="min-w-225 w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr className="text-left">
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Target type</th>
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Actor email</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAuditLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="text-slate-600 transition-colors duration-200 hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase ${
                            actionBadgeStyles[getAuditCategory(log.action)]
                          }`}
                        >
                          {getAuditCategory(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{log.target_type ?? "—"}</td>
                      <td className="px-4 py-2">
                        {log.target_type === "listing" && log.target_id ? (
                          <a
                            className="text-slate-700 underline decoration-slate-300 underline-offset-2"
                            href={`/marketplace/general/${log.target_id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {log.target_id}
                          </a>
                        ) : log.target_type === "user" && log.target_id ? (
                          <button
                            className="text-slate-700 underline decoration-slate-300 underline-offset-2"
                            onClick={() => setActiveUserId(log.target_id ?? null)}
                          >
                            {log.target_id}
                          </button>
                        ) : (
                          <span>{log.target_id ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {log.actor_email ??
                          data.profileEmailById[log.actor_id ?? ""] ??
                          log.actor_id ??
                          "system"}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {log.details ? (
                          <button
                            className="text-xs text-slate-500 hover:text-slate-700"
                            onClick={() => toggleAuditDetails(log.id)}
                          >
                            {expandedAuditIds.has(log.id) ? "Hide" : "Details"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {log.details && expandedAuditIds.has(log.id) ? (
                      <tr className="bg-slate-50 transition-colors duration-200">
                        <td className="px-4 py-3 text-xs text-slate-600" colSpan={6}>
                          <pre className="whitespace-pre-wrap wrap-break-word">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(activeUser)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveUserId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Snapshot of the selected user.</DialogDescription>
          </DialogHeader>
          {activeUser ? (
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-900">{activeUser.email ?? "—"}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Role</p>
                  <p className="text-sm text-slate-700">{activeUser.role ?? "user"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Listings</p>
                  <p className="text-sm text-slate-700">
                    {data.listingCounts[activeUser.id] ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Created</p>
                  <p className="text-sm text-slate-700">
                    {activeUser.created_at ? new Date(activeUser.created_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Status</p>
                  <p className="text-sm text-slate-700">
                    {activeUser.is_banned ? "Banned" : "Active"}
                  </p>
                </div>
              </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="mt-2">
            <button className={buttonSecondary} onClick={() => setActiveUserId(null)}>
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
