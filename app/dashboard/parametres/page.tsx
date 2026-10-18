import { protectedPage } from "@/lib/auth/guard"
import { SeasonSettingsClient } from "@/components/dashboard/season-settings-client"

export default function SettingsPage() {
  return protectedPage("/dashboard/parametres", () => <SeasonSettingsClient />)
}
