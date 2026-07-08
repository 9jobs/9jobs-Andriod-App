import { filterJobs } from "@/features/jobs/filterJobs";
import { demoJobs } from "@/lib/data/demo-jobs";

describe("filterJobs", () => {
  test("finds jobs by keyword and category", () => {
    const results = filterJobs(demoJobs, {
      query: "resume",
      category: "Career Growth",
      location: "Remote",
      onlySaved: false,
    });

    expect(results.map((job) => job.id)).toEqual(["job_resume_lead"]);
  });

  test("returns saved jobs only when onlySaved is true", () => {
    const results = filterJobs(demoJobs, {
      query: "",
      category: "All",
      location: "All locations",
      onlySaved: true,
    });

    expect(results.every((job) => job.isSaved)).toBe(true);
  });
});
