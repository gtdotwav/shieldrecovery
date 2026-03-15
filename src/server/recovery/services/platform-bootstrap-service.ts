import fs from "node:fs";
import path from "node:path";

import { appEnv } from "@/server/recovery/config";

export type PlatformBootstrapSettings = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

const EMPTY_SETTINGS: PlatformBootstrapSettings = {
  supabaseUrl: "",
  supabaseServiceRoleKey: "",
};

function readBootstrapFile(): PlatformBootstrapSettings {
  try {
    if (!fs.existsSync(appEnv.bootstrapStorePath)) {
      return EMPTY_SETTINGS;
    }

    const raw = fs.readFileSync(appEnv.bootstrapStorePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PlatformBootstrapSettings>;

    return {
      supabaseUrl: parsed.supabaseUrl?.trim() ?? "",
      supabaseServiceRoleKey: parsed.supabaseServiceRoleKey?.trim() ?? "",
    };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export class PlatformBootstrapService {
  getSettings(): PlatformBootstrapSettings {
    const fileSettings = readBootstrapFile();

    return {
      supabaseUrl: fileSettings.supabaseUrl || appEnv.supabaseUrl,
      supabaseServiceRoleKey:
        fileSettings.supabaseServiceRoleKey || appEnv.supabaseServiceRoleKey,
    };
  }

  getResolvedDatabaseSettings() {
    const settings = this.getSettings();

    return {
      ...settings,
      databaseConfigured: Boolean(
        settings.supabaseUrl && settings.supabaseServiceRoleKey,
      ),
    };
  }

  saveSettings(input: Partial<PlatformBootstrapSettings>) {
    const current = this.getSettings();
    const nextSettings: PlatformBootstrapSettings = {
      supabaseUrl: input.supabaseUrl?.trim() ?? current.supabaseUrl,
      supabaseServiceRoleKey:
        input.supabaseServiceRoleKey?.trim() ?? current.supabaseServiceRoleKey,
    };

    fs.mkdirSync(path.dirname(appEnv.bootstrapStorePath), { recursive: true });
    fs.writeFileSync(
      appEnv.bootstrapStorePath,
      JSON.stringify(nextSettings, null, 2),
      "utf8",
    );

    return nextSettings;
  }
}

export function getPlatformBootstrapService() {
  return new PlatformBootstrapService();
}
