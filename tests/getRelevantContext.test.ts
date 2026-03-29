import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data import before loading the module
const mockEntries = [
  {
    topic: "Endometriosis Overview",
    keywords: ["endometriosis", "implants", "retrograde menstruation"],
    content: "Endometriosis is the presence of endometrial tissue outside the uterus. It causes chronic pelvic pain and infertility.",
    source: "EGONE Module 1",
    category: "endometriosis",
  },
  {
    topic: "Ovarian Cancer Staging",
    keywords: ["ovarian cancer", "FIGO", "staging"],
    content: "Ovarian cancer is staged using the FIGO system. Stage I is confined to ovaries, Stage IV is distant metastasis.",
    source: "EGONE Module 2",
    category: "ovarian_cancer",
  },
  {
    topic: "Cervical Cancer HPV",
    keywords: ["cervical cancer", "HPV", "colposcopy"],
    content: "Cervical cancer is caused by persistent HPV infection. HPV 16 and 18 account for 70% of cases.",
    source: "EGONE Module 3",
    category: "cervical_cancer",
  },
  {
    topic: "Breast Cancer Treatment",
    keywords: ["breast cancer", "mastectomy", "chemotherapy"],
    content: "Breast cancer treatment includes surgery (mastectomy or lumpectomy), radiation, chemotherapy, and hormone therapy.",
    source: "EGONE Module 4",
    category: "breast_cancer",
  },
  {
    topic: "Uterine Fibroids",
    keywords: ["fibroid", "leiomyoma", "myomectomy"],
    content: "Uterine fibroids (leiomyomas) are benign smooth muscle tumors. They can cause heavy menstrual bleeding and pelvic pressure.",
    source: "EGONE Module 5",
    category: "fibroids",
  },
];

vi.mock("@/data/fmh_info.json", () => ({ default: mockEntries }));

// Import after mock is set up
const { getRelevantContext } = await import("../lib/getRelevantContext");

describe("getRelevantContext", () => {
  it("returns entries matching a simple keyword query", () => {
    const results = getRelevantContext("endometriosis pain");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].topic).toBe("Endometriosis Overview");
  });

  it("returns entries matching keyword in content", () => {
    const results = getRelevantContext("HPV cervical");
    expect(results.some((r) => r.topic === "Cervical Cancer HPV")).toBe(true);
  });

  it("returns entries matching keyword synonyms (German → English)", () => {
    // "brustkrebs" should expand to ["breast", "cancer"] and find breast cancer entry
    const results = getRelevantContext("brustkrebs");
    expect(results.some((r) => r.topic === "Breast Cancer Treatment")).toBe(true);
  });

  it("returns entries matching synonym for myom (fibroid)", () => {
    const results = getRelevantContext("myom behandlung");
    expect(results.some((r) => r.topic === "Uterine Fibroids")).toBe(true);
  });

  it("returns empty array for completely unrelated query", () => {
    const results = getRelevantContext("quantum physics nuclear reactor");
    expect(results).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    const results = getRelevantContext("");
    expect(results).toEqual([]);
  });

  it("respects MAX_RESULTS limit (max 8)", () => {
    // Even with a broad query matching everything, should not exceed 8
    const results = getRelevantContext("cancer tumor carcinoma treatment staging");
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it("respects MAX_CONTEXT_CHARS limit", () => {
    const results = getRelevantContext("cancer tumor carcinoma treatment staging");
    const totalChars = results.reduce((sum, r) => sum + r.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(12_000);
  });

  it("ranks more relevant results higher", () => {
    const results = getRelevantContext("ovarian FIGO staging");
    expect(results.length).toBeGreaterThan(0);
    // The ovarian cancer entry should rank first (has both "ovarian" and "FIGO" in keywords)
    expect(results[0].topic).toBe("Ovarian Cancer Staging");
  });

  it("handles query with stop words gracefully", () => {
    // Pure stop words should return no results (they are filtered out)
    const results = getRelevantContext("der die das und oder");
    expect(results).toEqual([]);
  });

  it("returns results with all required fields", () => {
    const results = getRelevantContext("endometriosis");
    for (const entry of results) {
      expect(entry).toHaveProperty("topic");
      expect(entry).toHaveProperty("content");
      expect(entry).toHaveProperty("source");
      expect(entry).toHaveProperty("category");
      expect(entry).toHaveProperty("keywords");
    }
  });
});
