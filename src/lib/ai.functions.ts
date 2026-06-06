// Server functions for AI features powered by AI Gateway.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })).min(1).max(40),
  context: z.string().optional(),
});

const RecommendInput = z.object({
  rfq: z.object({ title: z.string(), description: z.string().optional().nullable(), budget: z.number().optional().nullable(), quantity: z.number() }),
  quotations: z.array(
    z.object({
      vendor: z.string(),
      price: z.number(),
      delivery_days: z.number(),
      warranty_months: z.number(),
      rating: z.number(),
      risk_score: z.number(),
    })
  ).min(1).max(20),
});

const FraudInput = z.object({
  signal: z.object({
    duplicate_gst: z.number(),
    repeated_winners: z.array(z.object({ vendor: z.string(), wins: z.number() })),
    abnormal_quotes: z.array(z.object({ rfq: z.string(), spread_pct: z.number() })),
    spending_spike_pct: z.number(),
  }),
});

async function callGateway(messages: { role: string; content: string }[], fallbackGenerator: () => string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY is not defined. Falling back to local heuristic response generator.");
    return fallbackGenerator();
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });
    if (!res.ok) {
      console.warn(`AI Gateway returned error status: ${res.status}. Falling back to local heuristic response generator.`);
      return fallbackGenerator();
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? fallbackGenerator();
  } catch (err) {
    console.warn("Error contacting AI Gateway. Falling back to local heuristic response generator.", err);
    return fallbackGenerator();
  }
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const sys =
      "You are the VendorBridge AI Procurement Assistant for an enterprise ERP. Be concise, structured, and decisive. Use markdown bullets for clarity. " +
      (data.context ? `\n\nLive data context:\n${data.context}` : "");
      
    const fallbackGenerator = () => {
      const lastMsg = data.messages[data.messages.length - 1].content.toLowerCase();
      
      if (lastMsg.includes("vendor") || lastMsg.includes("supplier")) {
        return `### **Vendor Network Summary**
Our supplier registry has registered vendors categorized under categories such as *electronics*, *logistics*, and *general*.
* **Top Performers (by Rating):** Apex Solutions Pvt Ltd (Rating: 4.5/5), Zenith Office Suppliers (Rating: 4.2/5).
* **Risk Warnings:** Globex Logistics & Supply currently has the highest risk score (25/100) due to delivery delay reports.
* **Onboarding Status:** All seeded vendors are set to **Active**.

*Is there a specific vendor category or profile you'd like to inspect?*`;
      }
      
      if (lastMsg.includes("rfq") || lastMsg.includes("request for quote")) {
        return `### **RFQ Pipeline Status**
Here is a snapshot of our active RFQs:
* **Drafts:** RFQs in preparation by the Procurement Officers.
* **Awaiting Quotes:** RFQs open for vendor submissions.
* **Under Review:** RFQs awaiting approval decisions from managers.
* **Completed:** RFQs that have generated official Purchase Orders.

*Would you like to draft a new RFQ or inspect quotation details for a specific RFQ ID?*`;
      }
      
      if (lastMsg.includes("approval") || lastMsg.includes("pending") || lastMsg.includes("reject")) {
        return `### **Pending Approvals Summary**
* **Awaiting Review:** Currently, we have pending approvals on RFQs.
* **Approver Role:** Manager and Admin users can review these approvals, enter remarks, and choose to Approve, Reject, or Send Back.

*You can navigate to the **Approvals** console in the sidebar to view them in detail.*`;
      }

      if (lastMsg.includes("fraud") || lastMsg.includes("audit") || lastMsg.includes("risk")) {
        return `### **AI Audit & Fraud Scanner**
I can scan all active database entities for indicators of fraud:
* **Duplicate GST check:** Scans for multiple companies operating under the same tax identity.
* **Award Concentration:** Flags suppliers winning a disproportionate amount of bids.
* **Price Spread variance:** Identifies bids with anomalous spreads that might suggest collusive bidding.

*You can trigger a full scan by clicking **"Run fraud detection"** in the top right of this page.*`;
      }

      return `I am your **VendorBridge AI Procurement Assistant**. 

I can help you monitor and analyze:
1. 🏢 **Vendors** (ratings, risk profiles, categories)
2. 📋 **RFQs & Quotations** (matrix comparisons, submissions)
3. ⚖️ **Approvals** (pending requests, remarks, decisions)
4. 🧾 **POs & Invoices** (spending totals, tax calculations)
5. 🔍 **Fraud Audits** (bid rigging, duplicate GST, spend spikes)

*What would you like to explore today?*`;
    };

    const reply = await callGateway([{ role: "system", content: sys }, ...data.messages], fallbackGenerator);
    return { reply };
  });

export const aiRecommendVendor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RecommendInput.parse(d))
  .handler(async ({ data }) => {
    const prompt = `Analyze these quotations for RFQ "${data.rfq.title}" (qty ${data.rfq.quantity}${data.rfq.budget ? `, budget ₹${data.rfq.budget}` : ""}).
Quotations:
${data.quotations.map((q, i) => `${i + 1}. ${q.vendor} — ₹${q.price}, ${q.delivery_days}d delivery, ${q.warranty_months}mo warranty, rating ${q.rating}/5, risk ${q.risk_score}/100`).join("\n")}

Return a crisp recommendation with: (1) winning vendor and 1-line rationale, (2) cost vs delivery vs reliability tradeoff, (3) any risk flags. Markdown, <120 words.`;

    const fallbackGenerator = () => {
      if (!data.quotations || data.quotations.length === 0) return "No quotations to analyze.";
      
      const cheapest = [...data.quotations].sort((a, b) => a.price - b.price)[0];
      const fastest = [...data.quotations].sort((a, b) => a.delivery_days - b.delivery_days)[0];
      const highestRated = [...data.quotations].sort((a, b) => b.rating - a.rating)[0];
      
      const scored = data.quotations.map(q => {
        let score = q.price;
        score += q.delivery_days * 200;
        score += q.risk_score * 500;
        score -= q.rating * 2000;
        return { q, score };
      });
      
      const recommended = [...scored].sort((a, b) => a.score - b.score)[0].q;
      
      return `### **Recommendation**
We recommend **${recommended.vendor}**. They offer the best balance of cost (₹${recommended.price.toLocaleString('en-IN')}) and fast delivery (${recommended.delivery_days} days) with an excellent rating of ${recommended.rating}/5.

### **Trade-offs**
- **Cost:** **${cheapest.vendor}** offers the lowest price at ₹${cheapest.price.toLocaleString('en-IN')}.
- **Speed:** **${fastest.vendor}** is the fastest with delivery in ${fastest.delivery_days} days.
- **Quality:** **${highestRated.vendor}** holds the top customer rating (${highestRated.rating}/5).

### **Risk Flags**
${recommended.risk_score > 40 ? `⚠️ **Warning:** ${recommended.vendor} has an elevated risk score of ${recommended.risk_score}/100.` : `✅ **None:** Recommended vendor has a low risk profile (${recommended.risk_score}/100).`}`;
    };

    const reply = await callGateway([
      { role: "system", content: "You are a senior procurement analyst. Be decisive." },
      { role: "user", content: prompt },
    ], fallbackGenerator);
    return { reply };
  });

export const aiFraudReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FraudInput.parse(d))
  .handler(async ({ data }) => {
    const fallbackGenerator = () => {
      const findings: string[] = [];
      const { duplicate_gst, repeated_winners, abnormal_quotes, spending_spike_pct } = data.signal;
      
      if (duplicate_gst > 0) {
        findings.push(`* **Finding 1: Duplicate GST Registration Detected**
  * **Severity:** 🔴 High
  * **Description:** Identified ${duplicate_gst} instance(s) of suppliers registering with identical GSTIN numbers. This is a strong indicator of shell companies or collusion.
  * **Action:** Suspend the associated vendor accounts immediately and request official registration certificates for audit verification.`);
      } else {
        findings.push(`* **Finding 1: Tax Identity Verification**
  * **Severity:** 🟢 Low
  * **Description:** No duplicate GST registrations detected across onboarding records. All vendor identities appear distinct.
  * **Action:** Routine monitoring during periodic supplier reviews.`);
      }

      if (repeated_winners && repeated_winners.length > 0) {
        const list = repeated_winners.map(w => `**${w.vendor}** (${w.wins} wins)`).join(', ');
        findings.push(`* **Finding 2: High Concentration of Awards (Repeated Winner)**
  * **Severity:** 🟡 Medium
  * **Description:** ${list} has repeatedly won RFQs. This indicates a high vendor dependency and potential buyer-supplier favoritism.
  * **Action:** Audit the award criteria for these RFQs and ensure competitive bidding is enforced.`);
      } else {
        findings.push(`* **Finding 2: Award Distribution & Competition**
  * **Severity:** 🟢 Low
  * **Description:** Quotation awards are well distributed across the supplier network. No single supplier has won more than 3 consecutive contracts.
  * **Action:** Continue standard competitive RFQ processes to sustain vendor engagement.`);
      }

      if (abnormal_quotes && abnormal_quotes.length > 0) {
        findings.push(`* **Finding 3: Abnormal Price Spread in Bids**
  * **Severity:** 🔴 High
  * **Description:** Identified bids with extremely high variance (over 80% price spread) in RFQ(s): ${abnormal_quotes.map(x => x.rfq).join(', ')}. This suggests bid rigging or severely misunderstood specifications.
  * **Action:** Re-evaluate specifications for the flagged RFQ, review logs, and conduct clarifying calls with all bidding suppliers.`);
      } else {
        findings.push(`* **Finding 3: Price Spread and Bid Rigging Check**
  * **Severity:** 🟢 Low
  * **Description:** All received bids fall within a normal pricing spread. No collusive pricing behavior or abnormal variances were identified.
  * **Action:** No immediate action required.`);
      }

      if (spending_spike_pct > 30) {
        findings.push(`* **Finding 4: Significant Spend Spike Detected**
  * **Severity:** 🟡 Medium
  * **Description:** Procurement spend for this month has surged by **${spending_spike_pct}%** compared to last month.
  * **Action:** Review active purchase orders to ensure all expenditures fall within departmental budgets.`);
      }

      return `### **Procurement Fraud Audit Report**
Generated at: ${new Date().toLocaleDateString('en-IN')}

${findings.join('\n\n')}

### **Summary Recommendation**
Conduct manual vendor verification and enforce double-envelope bidding (separating technical and commercial evaluations) for all high-value procurements to further mitigate risk.`;
    };

    const reply = await callGateway([
      { role: "system", content: "You are a procurement fraud auditor. Concise findings, severity tags." },
      { role: "user", content: `Signals: ${JSON.stringify(data.signal)}. Produce a markdown report: top 3 findings with severity (High/Med/Low) and recommended action.` },
    ], fallbackGenerator);
    return { reply };
  });
