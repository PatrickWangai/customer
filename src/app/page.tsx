import Image from "next/image";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicSupportForm } from "@/components/support/public-support-form";
import { TrackRequestForm } from "@/components/support/track-request-form";
import { FaqList } from "@/components/support/faq-list";
import { HelpChatbot } from "@/components/support/help-chatbot";
import { PresenceTracker } from "@/components/support/presence-tracker";
import { VisitorChatWidget } from "@/components/support/visitor-chat-widget";
import { fetchCrmBusinessUnits, fetchCrmKnowledgeArticles } from "@/lib/services/crm-bridge";

export default async function HelpAndSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@masterways.co.ke";
  const supportPhone = process.env.SUPPORT_PHONE;
  const supportWhatsApp = process.env.SUPPORT_WHATSAPP;
  const [sp, businessUnits, articles] = await Promise.all([searchParams, fetchCrmBusinessUnits(), fetchCrmKnowledgeArticles()]);

  // Lets a "Track your request live" link deep-link straight into "already
  // looked up" — mirrors the same param handling in the CRM repo's /help page.
  const initialTab = sp.tab === "track" ? "track" : "submit";
  const initialTicketNumber = typeof sp.ticketNumber === "string" ? sp.ticketNumber : undefined;
  const initialEmail = typeof sp.email === "string" ? sp.email : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-foreground bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md border-2 border-foreground bg-white p-1">
              <Image src="/logo.png" alt="Masterways" width={32} height={32} className="size-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-black uppercase tracking-tight">Masterways Group of Companies</p>
              <p className="font-mono text-[11px] text-muted-foreground">Help &amp; Support</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
            {supportPhone && (
              <a href={`tel:${supportPhone}`} className="flex items-center gap-1 hover:text-primary">
                <Phone className="size-3.5" /> Call us
              </a>
            )}
            {supportWhatsApp && (
              <a href={`https://wa.me/${supportWhatsApp}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            )}
            <a href={`mailto:${supportEmail}`} className="flex items-center gap-1 hover:text-primary">
              <Mail className="size-3.5" /> Email
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">How can we help?</h1>
          <p className="text-sm text-muted-foreground">
            Submit a complaint, service request or general inquiry and our team will follow up.
          </p>
        </div>

        <div className="rounded-lg border-2 border-foreground bg-card p-5 sm:p-6">
          <Tabs defaultValue={initialTab}>
            <TabsList>
              <TabsTrigger value="submit">Submit a request</TabsTrigger>
              <TabsTrigger value="track">Track a request</TabsTrigger>
              <TabsTrigger value="faqs">FAQs</TabsTrigger>
            </TabsList>
            <TabsContent value="submit" className="pt-4">
              <PublicSupportForm businessUnits={businessUnits} />
            </TabsContent>
            <TabsContent value="track" className="pt-4">
              <TrackRequestForm defaultTicketNumber={initialTicketNumber} defaultEmail={initialEmail} />
            </TabsContent>
            <TabsContent value="faqs" className="pt-4">
              <FaqList articles={articles} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <HelpChatbot supportEmail={supportEmail} />
      <PresenceTracker ticketNumber={initialTicketNumber} />
      <VisitorChatWidget apiBase={process.env.NEXT_PUBLIC_CRM_URL ?? ""} />
    </div>
  );
}
