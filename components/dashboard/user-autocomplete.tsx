"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getAutocompleteEmptyStateMessage,
  getAutocompleteSelectionLabel,
  getNextAutocompleteIndex,
  shouldApplyAutocompleteResponse,
  shouldShowManualEntryWarning
} from "@/lib/users/autocomplete-state";
import type { UserSearchResponse, UserSuggestion } from "@/lib/users/types";

interface UserAutocompleteProps {
  name: string;
  label: string;
  defaultEmail?: string;
  defaultDisplayName?: string;
  displayNameName?: string;
  selectionIdName?: string;
  placeholder?: string;
  required?: boolean;
  allowManualEntry?: boolean;
  includeInactive?: boolean;
  excludeEmails?: string[];
  className?: string;
  description?: string;
}

export function UserAutocomplete({
  name,
  label,
  defaultEmail = "",
  defaultDisplayName = "",
  displayNameName,
  selectionIdName,
  placeholder = "user@company.com",
  required = false,
  allowManualEntry = true,
  includeInactive = false,
  excludeEmails = [],
  className = "field",
  description
}: UserAutocompleteProps) {
  const listboxId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);
  const lastRequestKeyRef = useRef("");
  const normalizedDefaultEmail = defaultEmail.trim().toLowerCase();
  const [inputValue, setInputValue] = useState(
    defaultDisplayName && defaultDisplayName.trim() !== normalizedDefaultEmail
      ? `${defaultDisplayName.trim()} (${normalizedDefaultEmail})`
      : normalizedDefaultEmail
  );
  const [emailValue, setEmailValue] = useState(normalizedDefaultEmail);
  const [displayNameValue, setDisplayNameValue] = useState(defaultDisplayName.trim());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [searchMeta, setSearchMeta] = useState<UserSearchResponse["meta"] | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const excludeEmailsParam = useMemo(() => excludeEmails.join(","), [excludeEmails]);

  const hasExactManagedMatch = useMemo(() => {
    const normalizedEmail = emailValue.trim().toLowerCase();
    return suggestions.some((suggestion) => suggestion.email === normalizedEmail);
  }, [emailValue, suggestions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [inputValue]);

  useEffect(() => {
    if (selectedUserId) {
      abortRef.current?.abort();
      setLoading(false);
      setError("");
      setActiveIndex(-1);
      return;
    }

    if (debouncedQuery.length === 0) {
      abortRef.current?.abort();
      lastRequestKeyRef.current = "";
      setSuggestions([]);
      setSearchMeta(null);
      setLoading(false);
      setError("");
      setActiveIndex(-1);
      setOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setOpen(true);

    const params = new URLSearchParams({
      q: debouncedQuery,
      limit: "10",
      includeInactive: includeInactive ? "true" : "false"
    });

    if (excludeEmailsParam.length > 0) {
      params.set("excludeEmails", excludeEmailsParam);
    }

    const requestKey = params.toString();
    if (requestKey === lastRequestKeyRef.current) {
      setLoading(false);
      return () => controller.abort();
    }
    lastRequestKeyRef.current = requestKey;

    fetch(`/api/users/search?${requestKey}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 401 || response.status === 403
              ? "You do not have permission to search users."
              : "Unable to search users because directory sync is not configured or failed."
          );
        }

        const payload = (await response.json()) as UserSearchResponse;
        if (!shouldApplyAutocompleteResponse(requestId, latestRequestIdRef.current)) {
          return;
        }

        setSuggestions(
          payload.results.map((suggestion) => ({
            ...suggestion,
            email: suggestion.email.trim().toLowerCase(),
            aliases: suggestion.aliases?.map((alias) => alias.trim().toLowerCase()) ?? []
          }))
        );
        setSearchMeta(payload.meta);
        setActiveIndex(payload.results.length > 0 ? 0 : -1);
        setOpen(true);
      })
      .catch((fetchError: unknown) => {
        if ((fetchError as { name?: string }).name === "AbortError") {
          return;
        }

        if (!shouldApplyAutocompleteResponse(requestId, latestRequestIdRef.current)) {
          return;
        }

        setSearchMeta((currentMeta) =>
          currentMeta
            ? {
                ...currentMeta,
                emptyState: "sync_error"
              }
            : currentMeta
        );
        setError(fetchError instanceof Error ? fetchError.message : "Unable to search users because directory sync failed.");
        setOpen(true);
      })
      .finally(() => {
        if (shouldApplyAutocompleteResponse(requestId, latestRequestIdRef.current)) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, excludeEmailsParam, includeInactive, selectedUserId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function applyManualValue(nextValue: string) {
    setInputValue(nextValue);
    setSelectedUserId("");
    setDisplayNameValue("");
    setEmailValue(nextValue.trim().toLowerCase());
  }

  function applySuggestion(suggestion: UserSuggestion) {
    const normalizedEmail = suggestion.email.trim().toLowerCase();
    setInputValue(getAutocompleteSelectionLabel(suggestion));
    setEmailValue(normalizedEmail);
    setDisplayNameValue(suggestion.displayName);
    setSelectedUserId(suggestion.id);
    lastRequestKeyRef.current = "";
    setSearchMeta(null);
    setOpen(false);
    setActiveIndex(-1);
    setError("");
  }

  const emptyStateMessage =
    error || suggestions.length > 0 ? "" : getAutocompleteEmptyStateMessage(searchMeta);

  const manualEntryWarning = shouldShowManualEntryWarning({
    allowManualEntry,
    hasExactManagedMatch,
    inputValue: emailValue || inputValue,
    isLoading: loading,
    suggestions
  });

  return (
    <div className={`${className} autocomplete-field`} ref={containerRef}>
      <label htmlFor={inputId} className="autocomplete-label">
        <span>{label}</span>
      </label>
      {description ? <span className="muted autocomplete-description">{description}</span> : null}
      <input type="hidden" name={name} value={emailValue} />
      {displayNameName ? <input type="hidden" name={displayNameName} value={displayNameValue} /> : null}
      {selectionIdName ? <input type="hidden" name={selectionIdName} value={selectedUserId} /> : null}
      <div className="autocomplete-shell">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          onChange={(event) => {
            applyManualValue(event.target.value);
            if (event.target.value.trim().length > 0) {
              setOpen(true);
            }
          }}
          onFocus={() => {
            if (inputValue.trim().length > 0 || suggestions.length > 0 || error || loading) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((currentIndex) => getNextAutocompleteIndex(currentIndex, "down", suggestions.length));
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((currentIndex) => getNextAutocompleteIndex(currentIndex, "up", suggestions.length));
              return;
            }

            if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
              return;
            }

            if (event.key === "Enter" && open && activeIndex >= 0 && suggestions[activeIndex]) {
              event.preventDefault();
              applySuggestion(suggestions[activeIndex]);
            }
          }}
        />
        {open && (loading || suggestions.length > 0 || Boolean(error) || debouncedQuery.length > 0) ? (
          <div className="autocomplete-popover" role="listbox" id={listboxId}>
            {loading ? <div className="autocomplete-state">Searching users...</div> : null}
            {error ? <div className="autocomplete-state error">{error}</div> : null}
            {!error && suggestions.length === 0 && !loading ? (
              <div className="autocomplete-state">{emptyStateMessage}</div>
            ) : null}
            {suggestions.length > 0 ? (
              <ul className="autocomplete-list">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.id || suggestion.email.toLowerCase()}>
                    <button
                      type="button"
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`autocomplete-option ${index === activeIndex ? "active" : ""}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySuggestion(suggestion);
                      }}
                      onClick={() => {
                        applySuggestion(suggestion);
                      }}
                      onMouseEnter={() => {
                        setActiveIndex(index);
                      }}
                    >
                      <span className="autocomplete-primary">{suggestion.displayName}</span>
                      <span className="autocomplete-secondary">{suggestion.email.toLowerCase()}</span>
                      <span className={`pill ${suggestion.status !== "active" ? "warn" : ""}`}>
                        {suggestion.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      {manualEntryWarning ? (
        <span className="field-warning">
          This email is not in the synced employee directory yet. Manual entry is still allowed for this workflow.
        </span>
      ) : null}
    </div>
  );
}
