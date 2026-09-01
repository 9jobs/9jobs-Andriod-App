import {
  latestApplicationsByJob,
  mergeApplicationScreenshotsFromActivity,
} from "@/lib/data/tracker-screenshot-sync";

describe("tracker screenshot sync", () => {
  test("keeps the newest admin tracker row for each opportunity", () => {
    const applications = latestApplicationsByJob([
      {
        id: 1,
        job_id: "job-1",
        status: "hired",
        application_date: "2026-07-22T09:00:00.000Z",
      },
      {
        id: 2,
        job_id: "job-1",
        status: "applied",
        application_date: "2026-07-30T03:54:55.897Z",
      },
    ]);

    expect(applications).toEqual([
      expect.objectContaining({ id: 2, status: "applied" }),
    ]);
  });

  test("keeps screenshots from an older duplicate on the newest application", () => {
    const applications = latestApplicationsByJob([
      {
        id: 1,
        job_id: "job-1",
        application_date: "2026-07-29T10:00:00.000Z",
        before_screenshot_url: "data:image/jpeg;base64,before",
        after_screenshot_url: "data:image/jpeg;base64,after",
      },
      {
        id: 2,
        job_id: "job-1",
        application_date: "2026-07-30T10:00:00.000Z",
        before_screenshot_url: "",
        after_screenshot_url: "",
      },
    ]);

    expect(applications).toEqual([
      expect.objectContaining({
        id: 2,
        before_screenshot_url: "data:image/jpeg;base64,before",
        after_screenshot_url: "data:image/jpeg;base64,after",
      }),
    ]);
  });

  test("prefers the most recently updated row when the same job has duplicate applications", () => {
    const applications = latestApplicationsByJob([
      {
        id: 1,
        job_id: "job-1",
        status: "applied",
        created_at: "2026-07-29T10:00:00.000Z",
        updated_at: "2026-07-29T10:00:00.000Z",
      },
      {
        id: 2,
        job_id: "job-1",
        status: "shortlisted",
        created_at: "2026-07-28T10:00:00.000Z",
        updated_at: "2026-07-31T10:00:00.000Z",
      },
    ]);

    expect(applications).toEqual([
      expect.objectContaining({ id: 2, status: "shortlisted" }),
    ]);
  });

  test("restores admin-uploaded screenshots from the latest activity payload", () => {
    const applications = [
      {
        id: 42,
        user_id: "user-1",
        job_id: "job-1",
        status: "applied",
        created_at: "2026-07-30T08:00:00.000Z",
      },
    ];
    const activityLogs = [
      {
        application_id: 42,
        new_value: {
          before_screenshot_url: "data:image/jpeg;base64,before",
          after_screenshot_url: "data:image/jpeg;base64,after",
        },
      },
    ];

    expect(mergeApplicationScreenshotsFromActivity(applications, activityLogs)).toEqual([
      expect.objectContaining({
        before_screenshot_url: "data:image/jpeg;base64,before",
        after_screenshot_url: "data:image/jpeg;base64,after",
      }),
    ]);
  });

  test("keeps screenshot URLs stored directly on the application", () => {
    const applications = [
      {
        id: 42,
        user_id: "user-1",
        job_id: "job-1",
        status: "applied",
        before_screenshot_url: "https://cdn.example/direct-before.jpg",
        created_at: "2026-07-30T08:00:00.000Z",
      },
    ];

    const [merged] = mergeApplicationScreenshotsFromActivity(applications, [
      {
        application_id: 42,
        new_value: { before_screenshot_url: "data:image/jpeg;base64,fallback" },
      },
    ]);

    expect(merged.before_screenshot_url).toBe("https://cdn.example/direct-before.jpg");
  });
});
