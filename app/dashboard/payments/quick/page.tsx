import { redirect } from "next/navigation"

// Quick payment redirects to the main payments page
// This route exists for the quick action button
export default function QuickPaymentPage() {
  redirect("/dashboard/payments")
}
