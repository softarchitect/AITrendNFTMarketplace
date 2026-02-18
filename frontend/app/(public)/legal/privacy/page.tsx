import { PageTransition } from "@/components/page-transition"

export default function PrivacyPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 1, 2026</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly (email, wallet addresses, KYC documents) and automatically (usage data, device information, IP addresses).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Information</h2>
            <p>Your information is used to provide our services, process transactions, verify identity for KYC compliance, improve our platform, and communicate with you about your account.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Data Sharing</h2>
            <p>We share data with KYC verification providers, payment gateways, and blockchain networks as necessary to provide our services. We do not sell personal data to third parties.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Security</h2>
            <p>We implement industry-standard security measures including encryption, secure authentication, and regular security audits to protect your data.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Note that blockchain transactions are immutable and cannot be deleted.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
            <p>For privacy inquiries, contact us at privacy@trendmint.io.</p>
          </section>
        </div>
      </div>
    </PageTransition>
  )
}
