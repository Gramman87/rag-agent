export type EvalCase = {
  question: string;
  // Text that only the correct chunk contains.
  expect: string;
  kind: "direct" | "paraphrase";
};

// "direct" questions reuse the documents' words. "paraphrase" questions deliberately avoid them,
// which is where keyword search should struggle and semantic search should help.
export const CASES: EvalCase[] = [
  { kind: "direct", question: "What is the default API rate limit?", expect: "1,000 requests per minute" },
  { kind: "direct", question: "How do I generate an API token?", expect: "Settings > API > Generate Key" },
  { kind: "direct", question: "Is the platform HIPAA compliant?", expect: "HIPAA eligible" },
  { kind: "direct", question: "How much does the Growth plan cost?", expect: "$199/month" },
  { kind: "direct", question: "Why is my webhook failing?", expect: "fail 5 consecutive times" },
  { kind: "direct", question: "Where is customer data stored?", expect: "US-East by default" },
  { kind: "direct", question: "How often are penetration tests done?", expect: "annual third-party" },
  { kind: "direct", question: "When are live training sessions?", expect: "Tuesdays and Thursdays" },
  { kind: "paraphrase", question: "How do I keep my information inside Europe?", expect: "eu-west-1" },
  { kind: "paraphrase", question: "How soon will you tell me if you get hacked?", expect: "within 72 hours" },
  { kind: "paraphrase", question: "Do charities get a price break?", expect: "Nonprofit" },
  { kind: "paraphrase", question: "Someone on my team is locked out of their account", expect: "cannot log in" },
  { kind: "paraphrase", question: "The app feels really sluggish today", expect: "Performance issues" },
  { kind: "paraphrase", question: "Can I bring my records over from another CRM?", expect: "Salesforce, HubSpot" },
  { kind: "paraphrase", question: "How is my information protected on disk?", expect: "AES-256" },
  { kind: "paraphrase", question: "What should my code do when I'm being throttled?", expect: "exponential backoff" },
];
