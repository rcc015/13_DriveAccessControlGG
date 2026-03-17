import { env } from "@/lib/config/env";
import { GoogleDirectoryProvider } from "@/lib/google/directory";
import { GoogleDriveProvider } from "@/lib/google/drive";
import { MockDirectoryProvider } from "@/lib/google/mock-directory";
import { MockDriveProvider } from "@/lib/google/mock-drive";
import type { DirectoryProvider, DriveProvider } from "@/lib/google/types";

export function getDirectoryProvider(): DirectoryProvider {
  return env.GOOGLE_INTEGRATION_MODE === "google"
    ? new GoogleDirectoryProvider()
    : new MockDirectoryProvider();
}

export function getDriveProvider(): DriveProvider {
  return env.GOOGLE_INTEGRATION_MODE === "google"
    ? new GoogleDriveProvider()
    : new MockDriveProvider();
}
