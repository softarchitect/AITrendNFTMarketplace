import { PageTransition } from "@/components/page-transition"

export default function TermsPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 1, 2026</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using the Affordable NFT platform, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>Affordable NFT provides an AI-powered NFT marketplace that automatically generates digital artwork from trending topics and mints them as ERC-721 tokens on the Ethereum blockchain.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account and wallet credentials. KYC verification may be required for certain transactions.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. NFT Purchases</h2>
            <p>All sales are final once confirmed on-chain. Prices are displayed in ETH and approximate fiat equivalents. Payment must clear through our gateway before on-chain transfer occurs.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property</h2>
            <p>AI-generated artwork is owned by the purchaser of the NFT. Affordable NFT retains the right to display artwork for promotional purposes. The underlying AI models and platform technology remain the property of Affordable NFT.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
            <p>Affordable NFT is provided &ldquo;as is&rdquo; without warranties. We are not liable for losses arising from blockchain transactions, wallet compromise, or market value fluctuations.</p>
          </section>
        </div>
      </div>
    </PageTransition>
  )
}
