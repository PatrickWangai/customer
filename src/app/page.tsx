import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicSupportForm } from "@/components/support/public-support-form";
import { TrackRequestForm } from "@/components/support/track-request-form";
import { HelpChatbot } from "@/components/support/help-chatbot";

export default async function HelpAndSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@masterways.co.ke";
  const sp = await searchParams;

  // Lets a "Track your request live" link deep-link straight into "already
  // looked up" — mirrors the same param handling in the CRM repo's /help page.
  const initialTab = sp.tab === "track" ? "track" : "submit";
  const initialTicketNumber = typeof sp.ticketNumber === "string" ? sp.ticketNumber : undefined;
  const initialEmail = typeof sp.email === "string" ? sp.email : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md border border-border bg-white p-1">
            <Image src="/logo.jpeg" alt="Masterways" width={32} height={32} className="size-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Masterways Group of Companies</p>
            <p className="text-[11px] text-muted-foreground">Help &amp; Support</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">How can we help?</h1>
          <p className="text-sm text-muted-foreground">
            Submit a complaint, service request or general inquiry and our team will follow up.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <Tabs defaultValue={initialTab}>
            <TabsList>
              <TabsTrigger value="submit">Submit a request</TabsTrigger>
              <TabsTrigger value="track">Track a request</TabsTrigger>
            </TabsList>
            <TabsContent value="submit" className="pt-4">
              <PublicSupportForm />
            </TabsContent>
            <TabsContent value="track" className="pt-4">
              <TrackRequestForm defaultTicketNumber={initialTicketNumber} defaultEmail={initialEmail} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <HelpChatbot supportEmail={supportEmail} />
    </div>
  );
}
