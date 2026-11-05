import { describe, expect, test } from "vitest";
import { jobSaveState } from "./jobSaveState";
describe("job form save state", () => {
  test("Add Saved Job creates a saved role without an application date", () => {
    expect(jobSaveState(true)).toMatchObject({status:"saved",current_stage:"saved",is_saved:true,is_active:false,applied_at:null});
  });
  test("editing a saved role keeps it saved", () => {
    expect(jobSaveState(true,{status:"saved",current_stage:"saved",is_saved:true})).toMatchObject({status:"saved",is_saved:true,applied_at:null});
  });
  test("bookmarking an applied role preserves its stage and applied date", () => {
    expect(jobSaveState(true,{status:"shortlisted",current_stage:"phone_interview"},"2026-09-12")).toMatchObject({status:"shortlisted",current_stage:"phone_interview",is_saved:true,applied_at:"2026-09-12"});
  });
  test("ordinary candidate opportunity retains its applied behavior", () => {
    expect(jobSaveState(false,undefined,"2026-09-12")).toMatchObject({status:"applied",is_saved:false,is_active:true,applied_at:"2026-09-12"});
  });
});
