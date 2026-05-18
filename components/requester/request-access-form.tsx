"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { submitAccessRequest } from "@/app/request-access/actions";
import type { AccessRequestType } from "@/types/domain";

interface RequestAccessFormProps {
  accessRoles: Array<{
    id: string;
    code: string;
    displayName: string;
    description: string;
  }>;
  sharedDrives: Array<{
    id: string;
    name: string;
  }>;
  restrictedFolders: Array<{
    id: string;
    path: string;
  }>;
}

const requestTypeOptions: Array<{ value: AccessRequestType; label: string }> = [
  { value: "BUSINESS_ROLE", label: "Business Role Access" },
  { value: "SHARED_DRIVE", label: "Shared Drive Access" },
  { value: "RESTRICTED_FOLDER", label: "Restricted Folder Access" },
  { value: "OTHER", label: "Other / Not sure" }
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Submitting..." : "Submit request"}
    </button>
  );
}

export function RequestAccessForm({ accessRoles, sharedDrives, restrictedFolders }: RequestAccessFormProps) {
  const [requestType, setRequestType] = useState<AccessRequestType>("BUSINESS_ROLE");
  const [durationMode, setDurationMode] = useState<"ONGOING" | "TEMPORARY">("ONGOING");

  return (
    <form action={submitAccessRequest} className="form-grid requester-form">
      <label className="field">
        <span>Request type</span>
        <select name="requestType" value={requestType} onChange={(event) => setRequestType(event.target.value as AccessRequestType)}>
          {requestTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {requestType === "BUSINESS_ROLE" ? (
        <label className="field">
          <span>Requested access</span>
          <select name="accessRoleId" required defaultValue="">
            <option value="" disabled>
              Select business role
            </option>
            {accessRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {requestType === "SHARED_DRIVE" ? (
        <label className="field">
          <span>Requested access</span>
          <select name="sharedDriveId" required defaultValue="">
            <option value="" disabled>
              Select Shared Drive
            </option>
            {sharedDrives.map((drive) => (
              <option key={drive.id} value={drive.id}>
                {drive.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {requestType === "RESTRICTED_FOLDER" ? (
        <label className="field">
          <span>Requested access</span>
          <select name="restrictedFolderId" required defaultValue="">
            <option value="" disabled>
              Select restricted folder
            </option>
            {restrictedFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {requestType === "OTHER" ? (
        <label className="field">
          <span>Requested access</span>
          <input type="text" name="otherTargetText" placeholder="Describe the drive, role, folder, or business need" required />
        </label>
      ) : null}

      {(requestType === "SHARED_DRIVE" || requestType === "RESTRICTED_FOLDER") ? (
        <label className="field">
          <span>Access level</span>
          <select name="requestedAccessLevel" defaultValue="VIEWER">
            <option value="VIEWER">Viewer</option>
            <option value="CONTRIBUTOR">Contributor</option>
          </select>
        </label>
      ) : null}

      <label className="field">
        <span>Needed by date</span>
        <input type="date" name="neededByDate" />
      </label>

      <label className="field">
        <span>Access duration</span>
        <select
          name="durationMode"
          value={durationMode}
          onChange={(event) => setDurationMode(event.target.value as "ONGOING" | "TEMPORARY")}
        >
          <option value="ONGOING">Permanent / ongoing</option>
          <option value="TEMPORARY">Temporary</option>
        </select>
      </label>

      {durationMode === "TEMPORARY" ? (
        <label className="field">
          <span>Requested expiration date</span>
          <input type="date" name="requestedExpirationDate" required />
        </label>
      ) : null}

      <label className="field field-full">
        <span>Business justification</span>
        <textarea
          name="justification"
          rows={5}
          minLength={20}
          required
          placeholder="Explain why you need this access, what work it supports, and how long you expect to need it."
        />
        <small className="muted">
          Explain why you need this access, what work it supports, and how long you expect to need it.
        </small>
      </label>

      <div className="form-actions">
        <SubmitButton />
      </div>
    </form>
  );
}
